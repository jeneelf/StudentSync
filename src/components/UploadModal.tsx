import React, { useState, useRef } from 'react';
import { Course, MaterialSourceType, FileType, SourceMaterial, Note, Flashcard, Quiz, CrossCourseLink, FileProcessingState } from '../types';
import { extractTextFromFile, ExtractedFileResult } from '../lib/fileParser';
import {
  X,
  Upload,
  FileText,
  BookOpen,
  Presentation,
  PenTool,
  CheckCircle2,
  Sparkles,
  Layers,
  ArrowRight,
  AlertCircle,
  AlertTriangle,
  FileCode,
  FolderOpen,
  Check,
  RotateCw
} from 'lucide-react';
import { cn } from '../lib/utils';

import { User } from 'firebase/auth';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCourse: Course;
  allCourses: Course[];
  onSaveSource: (newSource: SourceMaterial, generatedNote?: Note, generatedFlashcards?: Flashcard[], generatedQuizzes?: Quiz[]) => void;
  currentUser: User | null;
}

export default function UploadModal({
  isOpen,
  onClose,
  currentCourse,
  allCourses,
  onSaveSource,
  currentUser
}: UploadModalProps) {
  if (!isOpen) return null;

  const [activeInputTab, setActiveInputTab] = useState<'file' | 'paste'>('file');
  const [sourceType, setSourceType] = useState<MaterialSourceType>('textbook');
  
  // File state
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [storedFile, setStoredFile] = useState<File | null>(null);
  const [currentSourceId, setCurrentSourceId] = useState<string>('');
  const [pastedText, setPastedText] = useState<string>('');
  const [processedFile, setProcessedFile] = useState<{
    sourceId: string;
    content: string;
    storageKey: string;
    extractionStatus: SourceMaterial['extractionStatus'];
    extractionAttempts: number;
    extractedAt: string;
  } | null>(null);
  const [fileType, setFileType] = useState<FileType>('pdf');
  const [fileSize, setFileSize] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  
  // Extraction states
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isAnalyzed, setIsAnalyzed] = useState<boolean>(false);
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const [processingStatusText, setProcessingStatusText] = useState<string>('');
  const [extractionError, setExtractionError] = useState<string | null>(null);
  
  // Extracted & user-editable fields
  const [noteHeading, setNoteHeading] = useState<string>('');
  const [conceptTitle, setConceptTitle] = useState<string>('');
  const [syllabusUnit, setSyllabusUnit] = useState<string>(currentCourse.syllabusUnits[0] || 'Unit 1: Fundamentals');
  const [topicTag, setTopicTag] = useState<string>('');
  const [weekOrUnit, setWeekOrUnit] = useState<string>('General');
  const [chapterOrTopic, setChapterOrTopic] = useState<string>('');
  
  // AI extracted artifacts
  const [extractedAiNotes, setExtractedAiNotes] = useState<ExtractedFileResult['aiNotes'] | null>(null);
  const [extractedAiFlashcards, setExtractedAiFlashcards] = useState<ExtractedFileResult['aiFlashcards'] | null>(null);
  const [extractedAiQuizzes, setExtractedAiQuizzes] = useState<ExtractedFileResult['aiQuizzes'] | null>(null);

  // Options
  const [generateNotes, setGenerateNotes] = useState(true);
  const [generateFlashcards, setGenerateFlashcards] = useState(true);
  const [generateQuestions, setGenerateQuestions] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const sourceTypesList: { type: MaterialSourceType; label: string; icon: React.ElementType; desc: string }[] = [
    { type: 'syllabus', label: 'Syllabus / Guide', icon: Layers, desc: 'Course schedule and exam guide' },
    { type: 'lecture_slides', label: 'Lecture Slides', icon: Presentation, desc: 'Slide presentations (PDF/PPT)' },
    { type: 'notes', label: 'Course Notes', icon: FileText, desc: 'Transcripts, prof notes, typed summaries' },
    { type: 'textbook', label: 'Textbook / Section', icon: BookOpen, desc: 'Textbook chapter or excerpt' },
    { type: 'assignments', label: 'Assignments', icon: FileCode, desc: 'Homework and problem sets' },
    { type: 'exercises', label: 'Exercises & Drills', icon: FileText, desc: 'Recitation and study drills' },
    { type: 'labs', label: 'Labs & Projects', icon: PenTool, desc: 'Laboratory guides & project specs' },
    { type: 'study_guide', label: 'Exam Study Guides', icon: CheckCircle2, desc: 'Review sheets & practice guides' }
  ];

  const selectSourceType = (type: MaterialSourceType) => {
    setSourceType(type);
    if (type === 'syllabus') {
      setGenerateNotes(false);
      setGenerateFlashcards(false);
      setGenerateQuestions(false);
    } else {
      setGenerateNotes(true);
      setGenerateFlashcards(true);
      setGenerateQuestions(true);
    }
  };

  const processFile = async (file: File, explicitSourceId?: string) => {
    const existingId = explicitSourceId || currentSourceId || `src-${Date.now()}`;
    setCurrentSourceId(existingId);
    setSelectedFileName(file.name);
    setStoredFile(file);
    setIsAnalyzing(true);
    setProcessingProgress(25);
    setProcessingStatusText(`Storing ${file.name} locally...`);
    setExtractionError(null);

    try {
      // 1. Save to IndexedDB
      await saveLocalSourceFile({
        sourceId: existingId,
        userId: currentUser?.uid || 'anonymous',
        courseId: currentCourse.id,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        blob: file,
        savedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // 2. Extract Text locally
      setProcessingStatusText(`Extracting text locally...`);
      const extracted = await extractPdfLocally(file);
      
      // 3. Save extraction to IndexedDB
      await saveLocalExtraction({
        sourceId: existingId,
        courseId: currentCourse.id,
        pages: extracted.pages,
        fullText: extracted.fullText,
        extractedAt: new Date().toISOString(),
        parserVersion: '1.0'
      });

      setProcessedFile({
        sourceId: existingId,
        content: extracted.fullText,
        storageKey: existingId, // Using sourceId as localFileKey
        extractionStatus: 'stored_locally',
        extractionAttempts: 1,
        extractedAt: new Date().toISOString()
      });

      // 4. Trigger backend generation with extracted pages
      setProcessingStatusText(`Synthesizing structured notes with Gemini...`);
      // TODO: Call generation endpoint with extracted.pages

      setIsAnalyzing(false);
      setIsAnalyzed(true);
    } catch (err: any) {
      console.error('File parsing error', err);
      setExtractionError(err?.message || 'Failed to extract text from file.');
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleManualAnalyze = async () => {
    if (!processedFile?.content.trim()) return;
    setIsAnalyzing(true);
    setProcessingProgress(50);
    setProcessingStatusText('Analyzing text with Gemini...');

    try {
      const blob = new Blob([processedFile.content], { type: 'text/plain' });
      const mockFile = new File([blob], selectedFileName || 'pasted-notes.txt', { type: 'text/plain' });
      const parsed = await extractTextFromFile(mockFile, {
        courseName: currentCourse.name,
        unit: weekOrUnit,
        topic: chapterOrTopic,
        sourceType
      });

      const heading = parsed.detectedTitle || selectedFileName || `${currentCourse.code || currentCourse.name} Notes`;
      setNoteHeading(heading);
      setConceptTitle(heading);
      setTopicTag(parsed.sampleTopics[0] || 'Pasted Material');
      setChapterOrTopic(heading);
      setExtractedAiNotes(parsed.aiNotes || null);
      setExtractedAiFlashcards(parsed.aiFlashcards || null);
      setProcessingProgress(100);
      setIsAnalyzing(false);
      setIsAnalyzed(true);
    } catch (err) {
      const heading = selectedFileName || `${currentCourse.code || currentCourse.name} Notes`;
      setNoteHeading(heading);
      setConceptTitle(heading);
      setTopicTag('Pasted Material');
      setChapterOrTopic(heading);
      setProcessingProgress(100);
      setIsAnalyzing(false);
      setIsAnalyzed(true);
    }
  };

  const handleSave = () => {
    if (!processedFile?.storageKey) {
      setExtractionError(
        'The original file was not saved. Please retry the upload.'
      );
      return;
    }

    const newSource: SourceMaterial = {
      id: processedFile.sourceId,
      userId: currentUser?.uid,
      courseId: currentCourse.id,
      title: noteHeading || selectedFileName || 'Course Upload',
      sourceType,
      fileType,
      fileName: selectedFileName || 'pasted-content.txt',
      mimeType: storedFile?.type,
      fileSize: fileSize || '0.5 MB',
      uploadedAt: new Date().toISOString(),
      content: processedFile.content,
      
      storageKey: processedFile.storageKey,
      extractionStatus: processedFile.extractionStatus,
      extractionError: null,
      extractionAttempts: processedFile.extractionAttempts,
      extractedAt: processedFile.extractedAt,
      
      weekOrUnit,
      chapterOrTopic: chapterOrTopic || noteHeading || 'Core Topic',
      syllabusUnit: syllabusUnit || currentCourse.syllabusUnits[0] || 'Unit 1: Fundamentals',
      processingState: 'ready'
    };

    let generatedNote: Note | undefined;
    let generatedFlashcards: Flashcard[] | undefined;
    let generatedQuizzes: Quiz[] | undefined;

    if (generateNotes && extractedAiNotes) {
      generatedNote = {
        ...extractedAiNotes,
        id: `note-${Date.now()}`,
        sourceId: newSource.id,
        syllabusUnit: syllabusUnit || currentCourse.syllabusUnits[0] || 'General'
      };
    }

    if (generateFlashcards && extractedAiFlashcards && extractedAiFlashcards.length > 0) {
      generatedFlashcards = extractedAiFlashcards.map((fc, idx) => ({
        ...fc,
        id: `fc-${Date.now()}-${idx}`,
        sourceId: newSource.id
      }));
    }

    if (generateQuestions && extractedAiQuizzes && extractedAiQuizzes.length > 0) {
      generatedQuizzes = extractedAiQuizzes.map((q, idx) => ({
        ...q,
        id: `quiz-${Date.now()}-${idx}`,
        sourceId: newSource.id
      }));
    }

    onSaveSource(newSource, generatedNote, generatedFlashcards, generatedQuizzes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-2xl sm:max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-purple-50/60 dark:bg-purple-950/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-600 text-white shadow-xs">
              <Upload size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block">
                {currentCourse.code || currentCourse.name}
              </span>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                Upload Course Material
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Step 1: Material Category */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              1. Material Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {sourceTypesList.map((st) => (
                <button
                  key={st.type}
                  type="button"
                  onClick={() => selectSourceType(st.type)}
                  className={cn(
                    'p-2.5 sm:p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer',
                    sourceType === st.type
                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-950 dark:text-purple-200 shadow-2xs font-bold'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                  )}
                >
                  <div className={cn('mb-2', sourceType === st.type ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400')}>
                    <st.icon size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold leading-tight">{st.label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 hidden sm:block leading-tight">{st.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Ingestion Method */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                2. Upload File or Paste Notes
              </label>

              <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveInputTab('file')}
                  className={cn(
                    'px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer',
                    activeInputTab === 'file' ? 'bg-white dark:bg-slate-900 text-purple-600 shadow-xs' : 'text-slate-500'
                  )}
                >
                  File Upload
                </button>
                <button
                  type="button"
                  onClick={() => setActiveInputTab('paste')}
                  className={cn(
                    'px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer',
                    activeInputTab === 'paste' ? 'bg-white dark:bg-slate-900 text-purple-600 shadow-xs' : 'text-slate-500'
                  )}
                >
                  Paste Text
                </button>
              </div>
            </div>

            {activeInputTab === 'file' ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-3xl p-6 text-center space-y-3 cursor-pointer transition-all",
                  isDragging 
                    ? "border-purple-600 bg-purple-50/80 dark:bg-purple-950/40 scale-[1.01]" 
                    : "border-slate-300 dark:border-slate-700 hover:border-purple-500 bg-slate-50/50 dark:bg-slate-800/10"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.png,.jpg,.jpeg"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto shadow-2xs">
                  <Upload size={22} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {selectedFileName ? selectedFileName : 'Click to select or drop files here'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Supports PDF, DOCX, PPTX, TXT, Markdown, and Images
                  </p>
                </div>

                <div className="pt-1">
                  <span className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs">
                    <FolderOpen size={14} /> Browse Device
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  rows={6}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste lecture notes, homework problems, formulas, or textbook paragraphs here..."
                  className="w-full p-4 text-xs font-mono rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="button"
                  onClick={handleManualAnalyze}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Sparkles size={14} /> Process Pasted Material
                </button>
              </div>
            )}
          </div>

          {/* Processing Progress State */}
          {isAnalyzing && (
            <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 space-y-2 text-xs text-purple-900 dark:text-purple-200 animate-pulse">
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-2">
                  <RotateCw size={14} className="animate-spin text-purple-600" />
                  {processingStatusText || 'Extracting document content...'}
                </span>
                <span>{processingProgress}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-purple-200 dark:bg-purple-900 overflow-hidden">
                <div 
                  className="h-full bg-purple-600 transition-all duration-300"
                  style={{ width: `${processingProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Extraction Error Banner */}
          {extractionError && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 space-y-2 text-xs text-amber-900 dark:text-amber-200 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-xs text-amber-800 dark:text-amber-300">
                <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                <span>Extraction Error</span>
              </div>
              <p>{extractionError}</p>
              <div className="pt-1 flex items-center gap-2 flex-wrap">
                {activeInputTab === 'file' && storedFile && (
                  <button
                    type="button"
                    onClick={() => {
                      setExtractionError(null);
                      processFile(storedFile, currentSourceId);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <RotateCw size={12} />
                    <span>Retry Extraction</span>
                  </button>
                )}

                {activeInputTab === 'paste' && processedFile?.content.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      setExtractionError(null);
                      handleManualAnalyze();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <RotateCw size={12} />
                    <span>Retry Processing</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setExtractionError(null);
                    fileInputRef.current?.click();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-200/80 dark:bg-amber-900/60 font-bold text-[11px] hover:bg-amber-300 dark:hover:bg-amber-800 transition-colors cursor-pointer"
                >
                  {activeInputTab === 'file' ? 'Choose Different File' : 'Change Pasted Text'}
                </button>
              </div>
            </div>
          )}

          {/* Ready State Badge after successful extraction */}
          {isAnalyzed && !isAnalyzing && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300 font-bold animate-in fade-in">
              <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Ready: Text successfully extracted from PDF source & grounded via Gemini</span>
            </div>
          )}

          {/* Step 3: Extracted Metadata (Editable) */}
          {(isAnalyzed || selectedFileName || processedFile) && !isAnalyzing && (
            <div className="space-y-4 p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 text-xs animate-in fade-in">
              <span className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                3. Course Organization & Study Generation
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Resource Title
                  </label>
                  <input
                    type="text"
                    value={noteHeading}
                    onChange={(e) => setNoteHeading(e.target.value)}
                    placeholder="e.g. Chapter 4: Matrix Invariants"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Week or Unit Tag
                  </label>
                  <input
                    type="text"
                    value={weekOrUnit}
                    onChange={(e) => setWeekOrUnit(e.target.value)}
                    placeholder="e.g. Week 3, Unit 2"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={generateNotes}
                    onChange={(e) => setGenerateNotes(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span>Generate structured explanations & worked examples</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={generateFlashcards}
                    onChange={(e) => setGenerateFlashcards(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span>Generate active recall flashcards</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={(!selectedFileName && !processedFile) || isAnalyzing}
            onClick={handleSave}
            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-md shadow-purple-600/20 transition-all cursor-pointer"
          >
            <CheckCircle2 size={15} />
            <span>Add to Course System</span>
          </button>
        </div>
      </div>
    </div>
  );
}
