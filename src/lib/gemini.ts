import { Note, Flashcard, Quiz } from '../types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: string;
  sources?: { title: string; uri: string }[];
}

export type StudyBotRole = 'socratic_tutor' | 'concept_explainer' | 'rapid_drill';

export interface AIParsedDocumentResult {
  extractedContent: string;
  detectedTitle: string;
  summary: string;
  topics: string[];
  notes?: Note;
  flashcards?: Flashcard[];
  quizzes?: Quiz[];
  coverageVerification?: {
    totalTopicsDetected: number;
    coveredTopicsCount: number;
    missingTopicsCount: number;
    verificationStatus: 'Source-supported' | 'Needs review';
  };
  storageKey?: string;
  extractionStatus?: 'uploaded' | 'extracting' | 'ready' | 'failed' | 'partially_readable';
  extractionAttempts?: number;
  extractedAt?: string | null;
}

async function safeFetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const contentType = res.headers.get('content-type') || '';
  
  if (!contentType.includes('application/json')) {
    const text = await res.text().catch(() => '');
    console.error(`Non-JSON response from ${url} (${res.status} ${res.statusText}):`, text.slice(0, 300));
    throw new Error(`Server returned non-JSON response (${res.status} ${res.statusText}). Please check your file size or connection.`);
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Server responded with status ${res.status}`);
  }
  return data as T;
}

/**
 * Multi-Turn Chatbot using Server-Side Gemini API Proxy
 */
export async function sendChatMessage(
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  newMessage: string,
  role: StudyBotRole = 'concept_explainer',
  courseContext?: string
): Promise<{ text: string; sources?: { title: string; uri: string }[] }> {
  try {
    const data = await safeFetchJson<{ text: string }>('/api/gemini/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        history,
        message: newMessage,
        role,
        courseContext
      })
    });

    return {
      text: data.text || 'I could not generate a response.'
    };
  } catch (err: any) {
    console.error('Chat API Error:', err);
    throw err;
  }
}

/**
 * Search Grounding with gemini-3.5-flash and googleSearch tool via Server-Side Proxy
 */
export async function searchGroundedStudyResearch(
  query: string,
  courseContext?: string
): Promise<{ text: string; searchSources: { title: string; uri: string }[] }> {
  try {
    const data = await safeFetchJson<{ text: string; searchSources?: { title: string; uri: string }[] }>('/api/gemini/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        courseContext
      })
    });

    return {
      text: data.text || 'No search results found.',
      searchSources: data.searchSources || []
    };
  } catch (err: any) {
    console.error('Search Grounding API Error:', err);
    throw err;
  }
}

/**
 * Audio Transcription using model gemini-3.5-transcribe via Server-Side Proxy
 */
export async function transcribeAudioBlob(
  audioBlob: Blob,
  promptHint: string = 'Transcribe this academic recording, lecture, or study question accurately.'
): Promise<string> {
  const base64Audio = await blobToBase64(audioBlob);

  try {
    const data = await safeFetchJson<{ text: string }>('/api/gemini/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioBase64: base64Audio,
        mimeType: audioBlob.type || 'audio/webm',
        promptHint
      })
    });

    return data.text || 'No transcription detected.';
  } catch (err: any) {
    console.error('Audio Transcription Error:', err);
    throw err;
  }
}

/**
 * Read and extract actual text & curriculum structure from uploaded PDF / Documents
 */
export async function parseDocumentWithAI(
  file: File | Blob,
  meta: {
    courseName?: string;
    unit?: string;
    topic?: string;
    fileName?: string;
    rawText?: string;
    sourceId?: string;
  }
): Promise<AIParsedDocumentResult> {
  let base64 = '';
  // Avoid converting huge files to base64 if rawText is already provided
  if (!meta.rawText || meta.rawText.trim().length === 0) {
    base64 = await blobToBase64(file);
  }

  const mimeType = file.type || 'application/pdf';

  try {
    const json = await safeFetchJson<{ data?: AIParsedDocumentResult }>('/api/gemini/parse-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileBase64: base64,
        mimeType,
        fileName: meta.fileName || ('name' in file ? (file as File).name : 'document.pdf'),
        courseName: meta.courseName,
        unit: meta.unit,
        topic: meta.topic,
        rawText: meta.rawText,
        sourceId: meta.sourceId
      })
    });

    if (json.data && json.data.extractedContent) {
      return json.data;
    }
    throw new Error('AI returned empty document extraction');
  } catch (err: any) {
    console.error('AI Document Parsing Error:', err?.message || err);
    throw err;
  }
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result ? result.split(',')[1] : '';
      resolve(base64 || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
