import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';
import { initializeApp as initializeClientApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { GoogleGenAI } from '@google/genai';
import { extractRawTextFromPdfBuffer, generateNotesFromRawText, parseSyllabusIntoCourseMap, classifyMaterialToSyllabus, SYSTEM_INSTRUCTION } from './src/lib/ai';

dotenv.config();

// Load Firebase Config & Initialize Client DB on Server-side
const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const clientApp = initializeClientApp(firebaseConfig);
const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(clientApp, firebaseConfig.firestoreDatabaseId)
  : getFirestore(clientApp);


function decodeFirebaseIdToken(token: string): { uid: string; email?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payloadJson = Buffer.from(parts[1], 'base64').toString('utf8');
    const payload = JSON.parse(payloadJson);
    return {
      uid: payload.sub,
      email: payload.email
    };
  } catch (err) {
    console.error('Error decoding JWT token:', err);
    return null;
  }
}

async function parseFileContent(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  courseName: string,
  unit?: string,
  topic?: string
): Promise<{ extractedText: string; result: any }> {
  let extractedRawText = '';
  const isPdf = (mimeType && mimeType.includes('pdf')) || (fileName && fileName.toLowerCase().endsWith('.pdf'));

  if (isPdf) {
    try {
      const pdfText = extractRawTextFromPdfBuffer(fileBuffer);
      if (pdfText && pdfText.trim().length > 0) {
        extractedRawText = pdfText;
      }
    } catch (err) {
      console.warn('PDF Buffer extraction failed, falling back to OCR/Gemini:', err);
    }
  } else if (fileName.toLowerCase().endsWith('.txt') || fileName.toLowerCase().endsWith('.md') || mimeType.includes('text')) {
    extractedRawText = fileBuffer.toString('utf8');
  }

  // If we don't have text yet or if it's an image/scanned PDF, use Gemini Vision/OCR
  if (!extractedRawText || extractedRawText.trim().length < 10) {
    const fileBase64 = fileBuffer.toString('base64');
    const parts: any[] = [
      {
        inlineData: {
          mimeType: mimeType || 'application/pdf',
          data: fileBase64
        }
      },
      {
        text: `Extract all raw text verbatim from this document (${fileName}) for ${courseName}. Do not generate summaries or notes yet, only extract the text.`
      }
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [{ role: 'user', parts }]
    });

    extractedRawText = response.text || '';
  }

  if (!extractedRawText || extractedRawText.trim().length < 10) {
    throw new Error("No readable text found in this file.");
  }

  const result = await generateNotesFromRawText({
    rawText: extractedRawText,
    courseName,
    unit,
    topic,
    fileName
  });

  return {
    extractedText: extractedRawText,
    result
  };
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// Initialize GoogleGenAI SDK on server side with environment API key
const ai = new GoogleGenAI();

// 1. Multi-turn Chat API
app.post('/api/gemini/chat', async (req, res, next) => {
  try {
    const { history, message, role, courseContext, generationMode } = req.body;

    let modelName = 'gemini-3.5-flash';
    let systemInstruction = '';

    const modeInstruction = generationMode === 'verified_supplementary'
      ? 'Mode: Verified Supplementary Information. Prioritize uploaded course materials, but you may supplement with approved authoritative academic sources, clearly labeling external info as "Supplementary information" with source titles and links.'
      : 'Mode: Course Materials Only (Default). Use ONLY materials uploaded to the selected course. Do not use general knowledge or introduce unrelated topics. If the uploaded material does not contain enough information, respond exactly with: "I could not find enough information in your uploaded course materials to answer this accurately."';

    if (role === 'socratic_tutor') {
      modelName = 'gemini-3.1-pro-preview';
      systemInstruction = `You are a world-class academic professor and Socratic STEM tutor. 
Guide the student through rigorous principles, verify derivations step-by-step, ask clarifying questions to test their understanding, and never give empty answers.
${modeInstruction}
${courseContext ? `Course Context: ${courseContext}` : ''}`;
    } else if (role === 'rapid_drill') {
      modelName = 'gemini-3.1-flash-lite';
      systemInstruction = `You are an agile speed-drill study coach. 
Give punchy, highly direct, lightning-fast feedback on answers, point out errors immediately, and present the next concise challenge.
${modeInstruction}
${courseContext ? `Course Context: ${courseContext}` : ''}`;
    } else {
      modelName = 'gemini-3.5-flash';
      systemInstruction = `You are an encouraging and articulate study companion. 
Explain complex concepts using clear analogies, procedural walkthroughs, and crystal-clear definitions.
${modeInstruction}
${courseContext ? `Course Context: ${courseContext}` : ''}`;
    }

    const formattedHistory = Array.isArray(history) ? history : [];

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        ...formattedHistory,
        { role: 'user', parts: [{ text: message || '' }] }
      ],
      config: {
        systemInstruction
      }
    });

    res.json({
      text: response.text || 'I could not generate a response.',
      model: modelName
    });
  } catch (error: any) {
    next(error);
  }
});

// 2. Search Grounding API
app.post('/api/gemini/search', async (req, res, next) => {
  try {
    const { query, courseContext } = req.body;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Please research and synthesize academic information for this study query: "${query}". Provide up-to-date facts, accurate explanations, and standard curriculum definitions.${courseContext ? ` Related course: ${courseContext}` : ''}`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const searchSources: { title: string; uri: string }[] = [];
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks) {
      for (const chunk of groundingChunks) {
        if (chunk.web?.uri) {
          searchSources.push({
            title: chunk.web.title || chunk.web.uri,
            uri: chunk.web.uri
          });
        }
      }
    }

    res.json({
      text: response.text || 'No search results found.',
      searchSources
    });
  } catch (error: any) {
    next(error);
  }
});

// 3. Audio Transcription API
app.post('/api/gemini/transcribe', async (req, res, next) => {
  try {
    const { audioBase64, mimeType, promptHint } = req.body;

    if (!audioBase64) {
      return res.status(400).json({ error: 'Audio data is required' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: mimeType || 'audio/webm',
                data: audioBase64
              }
            },
            {
              text: promptHint || 'Transcribe this academic recording accurately.'
            }
          ]
        }
      ]
    });

    res.json({
      text: response.text || 'No transcription detected.'
    });
  } catch (error: any) {
    next(error);
  }
});

// 4. Server-Side PDF/Document Text Extraction & Note Generation Engine
app.post('/api/gemini/parse-file', async (req, res, next) => {
  try {
    const { fileBase64, mimeType, fileName, courseName, unit, topic, rawText: clientRawText, sourceId } = req.body;
    const finalSourceId = sourceId || `src-${Date.now()}`;
    const nameOfFile = fileName || 'pasted-content.txt';
    const sanitizedFileName = nameOfFile.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const storagePath = `users/default/sources/${finalSourceId}/${sanitizedFileName}`; // Simplified path for demo
    
    console.log({
      fileName: nameOfFile,
      mimeType: mimeType,
      hasFileBase64: Boolean(fileBase64),
      fileBase64Length: fileBase64?.length ?? 0,
      hasClientRawText: Boolean(clientRawText)
    });

    const MAX_BASE64_LENGTH = 25 * 1024 * 1024;
    if (fileBase64 && fileBase64.length > MAX_BASE64_LENGTH) {
      return res.status(413).json({
        error: 'This file is too large. Please upload a smaller file.'
      });
    }

    console.log(`[Parse File Engine]: Processing extraction job for sourceId: ${finalSourceId}, fileName: ${nameOfFile}`);

    let fileBuffer: Buffer;
    if (fileBase64) {
      fileBuffer = Buffer.from(fileBase64, 'base64');
    } else if (clientRawText) {
      fileBuffer = Buffer.from(clientRawText, 'utf8');
    } else {
      return res.status(400).json({ error: "Generation could not begin because no usable source content was supplied." });
    }

    // Upload to Firebase Storage
    await uploadToFirebaseStorage(fileBuffer, storagePath, mimeType || 'application/pdf');

    // Call parser helper
    const { extractedText, result } = await parseFileContent(
      fileBuffer,
      nameOfFile,
      mimeType || 'application/pdf',
      courseName || 'Course',
      unit,
      topic
    );

    res.json({
      success: true,
      data: {
        extractedContent: extractedText,
        detectedTitle: result.detectedTitle,
        summary: result.summary,
        topics: result.topics,
        notes: result.notes,
        flashcards: result.flashcards,
        quizzes: result.quizzes,
        coverageVerification: result.coverageVerification,
        storageKey: storagePath,
        extractionStatus: 'ready',
        extractionAttempts: 1,
        extractedAt: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('[Parse File Engine] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to parse file' });
  }
});

// 5. Generate Study Notes & Flashcards with Grounding & Verification Pipeline
app.post('/api/gemini/generate-study-notes', async (req, res, next) => {
  try {
    const { courseName, sourcesText, selectedOptions, generationMode } = req.body;

    const mode = generationMode || 'course_materials_only';

    if (mode === 'course_materials_only' && (!sourcesText || sourcesText.trim().length < 40)) {
      return res.json({
        success: false,
        insufficientEvidence: true,
        message: 'I could not find enough information in your uploaded course materials to answer this accurately.',
        fallbackActions: [
          'Upload another source',
          'Select additional course materials',
          'Enable verified supplementary information',
          'Ask a different question'
        ]
      });
    }

    const result = await generateNotesFromRawText({
      rawText: sourcesText || `Course overview for ${courseName || 'Course'}`,
      courseName,
      fileName: 'Course PDF Sources'
    });

    const verificationStatus = mode === 'verified_supplementary'
      ? 'supplemented_with_external'
      : 'supported_by_course_materials';

    res.json({
      success: true,
      data: {
        ...result,
        verificationStatus,
        generationMode: mode
      }
    });
  } catch (error: any) {
    next(error);
  }
});

// 8. Protected Retry Extraction Endpoint
app.post('/api/sources/:sourceId/retry-extraction', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[Retry Endpoint] Missing token error');
      return res.status(401).json({ error: 'Unauthorized: Missing token' });
    }
    const idToken = authHeader.split('Bearer ')[1];
    const decoded = decodeFirebaseIdToken(idToken);
    if (!decoded) {
      console.error('[Retry Endpoint] Invalid token decoding error');
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
    const userId = decoded.uid;

    const { courseId } = req.body;
    const { sourceId } = req.params;

    if (!courseId) {
      console.error('[Retry Endpoint] Missing courseId parameter');
      return res.status(400).json({ error: 'Missing courseId parameter' });
    }

    console.log(`[Retry Endpoint]: Executing real extraction retry for userId: ${userId}, courseId: ${courseId}, sourceId: ${sourceId}`);

    // Load course record from Firestore
    const courseRef = doc(db, 'users', userId, 'courses', courseId);
    const courseSnap = await getDoc(courseRef);
    if (!courseSnap.exists()) {
      console.error(`[Retry Endpoint] Course snap not found for path: users/${userId}/courses/${courseId}`);
      return res.status(404).json({ error: 'Course not found or unauthorized' });
    }

    const courseData = courseSnap.data();
    const sourceIdx = courseData.sources?.findIndex((s: any) => s.id === sourceId);
    if (sourceIdx === -1 || sourceIdx === undefined) {
      console.error(`[Retry Endpoint] Source index -1 for sourceId: ${sourceId}`);
      return res.status(404).json({ error: 'Source material not found in this course.' });
    }

    const source = courseData.sources[sourceIdx];
    const storageKey = source.storageKey;
    if (!storageKey) {
      console.error(`[Retry Endpoint] Missing storageKey for source: ${source.title}`);
      return res.status(400).json({ error: 'Original file unavailable. Please select the file again.' });
    }

    const fileBuffer = await downloadFromFirebaseStorage(storageKey);

    try {
      console.log(`[Retry Endpoint] Parsing original file at: ${storageKey}`);
      const { extractedText, result } = await parseFileContent(
        fileBuffer,
        source.fileName || source.title,
        source.mimeType || 'application/pdf',
        courseData.name,
        source.weekOrUnit,
        source.chapterOrTopic
      );

      // Validate extracted text
      if (!extractedText || extractedText.trim().length < 10) {
        throw new Error("No readable text found in this file.");
      }

      // Save extracted text & metadata
      source.content = extractedText;
      source.summary = result.summary;
      source.extractionStatus = 'ready';
      source.processingState = 'ready';
      source.extractedAt = new Date().toISOString();
      source.pageCount = result.notes?.sections?.length || 1;

      // Clean up previous generated assets linked to this source to avoid duplicates
      if (courseData.notes) {
        courseData.notes = courseData.notes.filter((n: any) => n.sourceId !== source.id);
      } else {
        courseData.notes = [];
      }
      if (courseData.flashcards) {
        courseData.flashcards = courseData.flashcards.filter((f: any) => f.sourceId !== source.id);
      } else {
        courseData.flashcards = [];
      }
      if (courseData.quizzes) {
        courseData.quizzes = courseData.quizzes.filter((q: any) => q.sourceId !== source.id);
      } else {
        courseData.quizzes = [];
      }

      // Inject newly extracted assets
      if (result.notes) {
        courseData.notes.push({
          id: `note-${Date.now()}`,
          sourceId: source.id,
          ...result.notes
        });
      }
      if (result.flashcards && result.flashcards.length > 0) {
        result.flashcards.forEach((f: any, i: number) => {
          courseData.flashcards.push({
            id: `fc-${Date.now()}-${i}`,
            sourceId: source.id,
            ...f
          });
        });
      }
      if (result.quizzes && result.quizzes.length > 0) {
        result.quizzes.forEach((q: any, i: number) => {
          courseData.quizzes.push({
            id: `qz-${Date.now()}-${i}`,
            sourceId: source.id,
            ...q
          });
        });
      }

      // 14. If syllabus, run Course Map generation
      let courseMap = null;
      const isSyllabus = source.sourceType === 'syllabus' || source.title.toLowerCase().includes('syllabus');
      if (isSyllabus) {
        console.log(`[Retry Endpoint]: Syllabus detected. Building Course Map...`);
        courseMap = await parseSyllabusIntoCourseMap(extractedText, courseData.name);
        courseData.syllabusMap = courseMap;
      }

      // Save the final completed course data to Firestore
      await setDoc(courseRef, courseData);

      console.log(`[Retry Endpoint]: Succeeded! Characters: ${extractedText.length}, Status: ready`);

      return res.json({
        success: true,
        source,
        courseMap
      });

    } catch (err: any) {
      console.error(`[Retry Endpoint] Parser Exception:`, err);
      
      source.extractionStatus = 'failed';
      source.processingState = 'failed';
      source.extractionError = err.message || 'Parser processing failed.';

      // Save failure state to Firestore
      await setDoc(courseRef, courseData);

      return res.status(500).json({
        error: err.message || 'File parser processing failed.',
        source
      });
    }

  } catch (error: any) {
    console.error(`[Retry Endpoint] General Route Exception:`, error);
    next(error);
  }
});

// 6. Syllabus Parsing API
app.post('/api/gemini/parse-syllabus', async (req, res, next) => {
  try {
    const { rawText, courseName } = req.body;
    const courseMap = await parseSyllabusIntoCourseMap(rawText || '', courseName || 'Course');
    res.json({ success: true, courseMap });
  } catch (error: any) {
    next(error);
  }
});

// 7. Material Classification API
app.post('/api/gemini/classify-material', async (req, res, next) => {
  try {
    const { materialText, syllabusMap } = req.body;
    if (!syllabusMap || !syllabusMap.sessions) {
      return res.json({
        success: true,
        classification: {
          confidence: 'low',
          suggestedWeek: 1,
          suggestedSession: 1,
          suggestedTopic: 'Unassigned',
          matchExplanation: 'No syllabus uploaded yet for automatic mapping.'
        }
      });
    }
    const classification = await classifyMaterialToSyllabus(materialText || '', syllabusMap);
    res.json({ success: true, classification });
  } catch (error: any) {
    next(error);
  }
});

// 8. Generate More Flashcards API (Requirement 7 & 9)
app.post('/api/gemini/generate-more-flashcards', async (req, res, next) => {
  try {
    const { rawText, existingCards, count, focus, difficulty, courseName } = req.body;

    if (!rawText || rawText.trim().length < 10) {
      return res.status(400).json({ error: "Generation could not begin because no usable source content was supplied." });
    }

    const cardsToAvoid = Array.isArray(existingCards) ? existingCards : [];
    const prompt = `Generate exactly ${count || 5} new active-recall study flashcards based STRICTLY on the source text below.
Focus style: ${focus || 'mixed'}
Difficulty level: ${difficulty || 'mixed'}

DO NOT generate duplicate questions or prompts. To avoid repeating existing cards, do NOT ask questions similar to the following existing prompts:
${cardsToAvoid.map((c: any) => `- ${c.front}`).join('\n')}

DO NOT mention filenames or document titles.
DO NOT use generic fallbacks or placeholders.
Each flashcard must test a substantive, real course concept.

Return a valid JSON array of flashcards matching:
[
  {
    "topicTag": "Specific Concept Tag",
    "front": "Clear question",
    "back": "Detailed answer",
    "explanation": "Intuitive analogy or explanation",
    "citation": {
      "sourceTitle": "Lecture Slide Source",
      "sourceType": "lecture_slides",
      "referenceDetail": "Slide/Page location"
    }
  }
]

Respond ONLY with valid JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json'
      }
    });

    const parsed = JSON.parse(response.text?.trim() || '[]');
    res.json({ success: true, flashcards: Array.isArray(parsed) ? parsed : (parsed.flashcards || []) });
  } catch (error: any) {
    next(error);
  }
});

// 9. Generate More Questions API (Requirement 8 & 9)
app.post('/api/gemini/generate-more-questions', async (req, res, next) => {
  try {
    const { rawText, existingQuestions, count, type, difficulty, courseName } = req.body;

    if (!rawText || rawText.trim().length < 10) {
      return res.status(400).json({ error: "Generation could not begin because no usable source content was supplied." });
    }

    const questionsToAvoid = Array.isArray(existingQuestions) ? existingQuestions : [];
    const prompt = `Generate exactly ${count || 5} new diagnostic practice questions based STRICTLY on the source text below.
Question Type: ${type || 'mixed'}
Difficulty level: ${difficulty || 'mixed'}

DO NOT generate duplicate or near-duplicate questions. Do NOT ask questions similar to:
${questionsToAvoid.map((q: any) => `- ${q.question}`).join('\n')}

DO NOT use filenames as answer choices. All distractors must be highly plausible academic concepts.
Each question must test a substantive, real course concept.

Return a valid JSON array matching this exact schema:
[
  {
    "topicTag": "Specific Concept Tag",
    "questionType": "${type === 'mixed' ? 'multiple_choice' : type}",
    "difficulty": "${difficulty === 'mixed' ? 'medium' : difficulty}",
    "question": "Question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctOptionIndex": 0,
    "optionExplanations": ["Why A is correct", "Why B is incorrect", "Why C is incorrect", "Why D is incorrect"],
    "hint": "Hint",
    "fullSolution": "Step-by-step math or reasoning solution",
    "whyCorrect": "Explanation of the correct answer",
    "citation": {
      "sourceTitle": "Lecture Slide Source",
      "sourceType": "lecture_slides",
      "referenceDetail": "Slide/Page location"
    }
  }
]

Respond ONLY with valid JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json'
      }
    });

    const parsed = JSON.parse(response.text?.trim() || '[]');
    res.json({ success: true, questions: Array.isArray(parsed) ? parsed : (parsed.questions || []) });
  } catch (error: any) {
    next(error);
  }
});

// Global API Error Handler Middleware (Ensures JSON response for all errors, never HTML)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Express API Error Handler]:', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    error: err.message || 'An error occurred while processing your request on the server.'
  });
});

// Vite Middleware for development & Static serving for production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true }
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
