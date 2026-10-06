import { MaterialSourceType, FileType, SourceMaterial } from '../types';
import * as pdfjs from 'pdfjs-dist';
import { saveLocalExtraction } from './localDb';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

export interface ExtractedDocument {
  fullText: string;
  pages: Array<{
    pageNumber: number;
    text: string;
  }>;
  characterCount: number;
}

export async function extractPdfLocally(blob: Blob): Promise<ExtractedDocument> {
  const arrayBuffer = await blob.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const pages = [];
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item: any) => item.str).join(' ');
    pages.push({ pageNumber: i, text });
    fullText += `\n\n--- Page ${i} ---\n\n${text}`;
  }

  if (fullText.trim().length < 10) {
    throw new Error('This PDF does not contain readable embedded text. It may require OCR.');
  }

  return {
    fullText: fullText.trim(),
    pages,
    characterCount: fullText.length
  };
}

/**
 * Extracts raw or decoded text from uploaded files (PDF, DOCX, TXT, MD, Images, etc.)
 * Uses Gemini server API to read actual contents of PDFs and documents.
 * Never generates generic template text.
 */
const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('The selected file could not be read.'));
        return;
      }

      // Remove: data:application/pdf;base64,
      const base64 = reader.result.split(',')[1];

      if (!base64) {
        reject(new Error('The selected file produced no readable data.'));
        return;
      }

      resolve(base64);
    };

    reader.onerror = () => {
      reject(reader.error || new Error('Failed to read the file.'));
    };

    reader.readAsDataURL(file);
  });

export const extractTextFromFile = async (
  file: File,
  options: {
    courseName?: string;
    unit?: string;
    topic?: string;
    sourceType?: MaterialSourceType;
    sourceId?: string;
  }
): Promise<ExtractedFileResult> => {
  const fileBase64 = await fileToBase64(file);

  if (!fileBase64) {
    throw new Error(
      'The selected file could not be converted into uploadable content.'
    );
  }

  const response = await fetch('/api/gemini/parse-file', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fileBase64,
      mimeType: file.type || 'application/pdf',
      fileName: file.name,
      courseName: options.courseName,
      unit: options.unit,
      topic: options.topic,
      sourceType: options.sourceType,
      sourceId: options.sourceId
    })
  });

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      json?.error ||
      `File extraction failed with status ${response.status}.`
    );
  }

  const data = json?.data;

  if (!data?.extractedContent?.trim()) {
    throw new Error(
      'The server processed the file but returned no extracted text.'
    );
  }

  if (!data?.storageKey) {
    throw new Error(
      'The server extracted the file but did not return its storage location.'
    );
  }

  const fileSize = file.size > 1024 * 1024 
    ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
    : `${Math.round(file.size / 1024)} KB`;

  return {
    content: data.extractedContent,
    storageKey: data.storageKey,
    extractionStatus: data.extractionStatus,
    extractionAttempts: data.extractionAttempts,
    extractedAt: data.extractedAt,

    fileSize: fileSize,
    fileType: file.type.includes('pdf') ? 'pdf' : 'txt',
    detectedTitle: data.detectedTitle || file.name.replace(/\.[^/.]+$/, ''),
    sampleTopics: data.topics ?? [],
    aiNotes: data.notes ?? null,
    aiFlashcards: data.flashcards ?? null
  };
};

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) || '');
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
