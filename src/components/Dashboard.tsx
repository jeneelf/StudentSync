import React, { useState } from 'react';
import { Course, DashboardTab, Note, Flashcard, SyllabusCourseMap } from '../types';
import { auth } from '../lib/firebase';
import NotesView from './NotesView';
import FlashcardsView from './FlashcardsView';
import QuizzesView from './QuizzesView';
import MasteryView from './MasteryView';
import SourcesView from './SourcesView';
import {
  BookOpen,
  FileText,
  Layers,
  CheckSquare,
  BarChart2,
  Upload,
  Sparkles,
  HelpCircle,
  Calendar,
  Clock,
  ShieldCheck,
  Archive,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Target,
  ChevronDown,
  Sliders
} from 'lucide-react';
import { cn } from '../lib/utils';

interface DashboardProps {
  course: Course;
  allCourses: Course[];
  activeTab?: DashboardTab;
  setActiveTab?: (tab: DashboardTab) => void;
  onOpenUploadModal: () => void;
  onOpenStudyAssist: () => void;
  onOpenConfused: (title: string, snippet?: string) => void;
  onAddNote?: (newNote: Note) => void;
  onUpdateNote?: (updatedNote: Note) => void;
  onDeleteNote?: (noteId: string) => void;
  onAddFlashcard: (newCard: Flashcard) => void;
  onUpdateFlashcard: (updatedCard: Flashcard) => void;
  onSelectConceptLink?: (conceptName: string, targetCourseCode: string) => void;
  onDeleteSource?: (sourceId: string) => void;
  onToggleArchiveCourse?: (courseId: string) => void;
  onDeleteCourse?: (courseId: string) => void;
  onSaveCourseMap?: (courseId: string, newMap: SyllabusCourseMap) => void;
  refreshCourse?: () => Promise<void>;
}

export default function Dashboard({
  course,
  allCourses,
  activeTab,
  setActiveTab,
  onOpenUploadModal,
  onOpenStudyAssist,
  onOpenConfused,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onAddFlashcard,
  onUpdateFlashcard,
  onSelectConceptLink,
  onDeleteSource,
  onToggleArchiveCourse,
  onDeleteCourse,
  onSaveCourseMap,
  refreshCourse
}: DashboardProps) {
  const [internalTab, setInternalTab] = useState<DashboardTab>('notes');
  const [isExtractingMap, setIsExtractingMap] = useState(false);
  const [extractionErrorMessage, setExtractionErrorMessage] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [showSyllabusSelector, setShowSyllabusSelector] = useState(false);
  const [isCourseOptionsOpen, setIsCourseOptionsOpen] = useState(false);
  const [lastAttemptedSyllabusId, setLastAttemptedSyllabusId] = useState<string | null>(null);

  const currentTab = activeTab || internalTab;
  const handleTabChange = setActiveTab || setInternalTab;

  const tabs: { id: DashboardTab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'notes', label: 'Notes & Explanations', icon: FileText, count: course.notes.length },
    { id: 'flashcards', label: 'Flashcards', icon: Layers, count: course.flashcards.length },
    { id: 'quizzes', label: 'Practice Questions', icon: CheckSquare, count: course.quizzes.reduce((acc, q) => acc + q.questions.length, 0) },
    { id: 'mastery', label: 'Topic Mastery', icon: BarChart2, count: course.mastery.length },
    { id: 'course_map', label: 'Course Map', icon: Calendar, count: course.syllabusMap?.sessions?.length || 0 },
    { id: 'sources', label: 'Source & Upload', icon: BookOpen, count: course.sources.length }
  ];

  const handleRetrySyllabusExtraction = async (sourceId: string) => {
    if (isExtractingMap) return;

    setExtractionErrorMessage(null);
    setIsExtractingMap(true);
    setProcessingStatus('Retrieving original file…');

    try {
      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;

      // Update actual progress
      setProcessingStatus('Extracting syllabus text…');

      const res = await fetch(
        `/api/sources/${encodeURIComponent(sourceId)}/retry-extraction`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
          },
          body: JSON.stringify({ courseId: course.id })
        }
      );

      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          payload?.error ||
          `Extraction failed with status ${res.status}.`
        );
      }

      setProcessingStatus('Validating extracted content…');

      if (!payload?.source?.content?.trim()) {
        throw new Error(
          'Extraction completed without returning readable text.'
        );
      }

      setProcessingStatus('Creating Course Map…');

      if (!payload?.courseMap) {
        throw new Error(
          'The syllabus text was extracted, but a Course Map was not returned.'
        );
      }

      setProcessingStatus('Saving Course Map…');

      if (!onSaveCourseMap) {
        throw new Error(
          'The Course Map save handler is unavailable.'
        );
      }

      await onSaveCourseMap(course.id, payload.courseMap);

      // Refresh the course to pull down the newly extracted materials, notes, flashcards, etc.
      if (refreshCourse) {
        await refreshCourse();
      }

      setProcessingStatus('');
      setShowSyllabusSelector(false);
    } catch (error: any) {
      console.error('Syllabus extraction retry failed:', error);

      setExtractionErrorMessage(
        error instanceof Error
          ? error.message
          : 'The syllabus could not be reprocessed.'
      );
    } finally {
      setIsExtractingMap(false);
    }
  };

  const handleBuildCourseMap = async (manualSourceId?: string) => {
    setExtractionErrorMessage(null);
    const syllabusSources = course.sources.filter(s => s.sourceType === 'syllabus' || s.title.toLowerCase().includes('syllabus'));

    let targetSyllabus = syllabusSources[0];

    if (manualSourceId) {
      targetSyllabus = syllabusSources.find(s => s.id === manualSourceId) || syllabusSources[0];
      setLastAttemptedSyllabusId(manualSourceId);
    } else if (lastAttemptedSyllabusId) {
      targetSyllabus = syllabusSources.find(s => s.id === lastAttemptedSyllabusId) || syllabusSources[0];
    } else if (syllabusSources.length > 1) {
      setShowSyllabusSelector(true);
      return;
    }

    if (!targetSyllabus) {
      setExtractionErrorMessage("No processed syllabus was found for this course.");
      return;
    }

    if (!targetSyllabus.content || targetSyllabus.content.trim().length < 10) {
      setExtractionErrorMessage(`The text content for your syllabus "${targetSyllabus.title}" is missing or unreadable. Please run 'Retry File Extraction' first.`);
      return;
    }

    setIsExtractingMap(true);
    setProcessingStatus(`Creating your Course Map from ${targetSyllabus.title}...`);

    try {
      const res = await fetch('/api/gemini/parse-syllabus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: targetSyllabus.content,
          courseName: course.name
        })
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || `Server responded with status ${res.status}`);
      }

      if (!json?.courseMap) {
        throw new Error(
          json?.error || 'The server returned no Course Map.'
        );
      }

      if (!onSaveCourseMap) {
        throw new Error(
          'The Course Map save handler is unavailable.'
        );
      }

      await onSaveCourseMap(course.id, json.courseMap);
      setIsExtractingMap(false);
      setShowSyllabusSelector(false);
    } catch (err: any) {
      console.error('Course map extraction error:', err);
      setExtractionErrorMessage(err.message || "Failed to parse syllabus. Please try again.");
    } finally {
      setIsExtractingMap(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full min-w-0 px-1 sm:px-0">
      {/* Course Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-xs w-full min-w-0">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(16rem,1fr)_auto] gap-5 items-start w-full">
          {/* Course Title & Information Section */}
          <div className="space-y-2 min-w-0 w-full">
            <div className="flex items-center gap-2 flex-wrap">
              {course.code && (
                <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-xl bg-purple-600 text-white shadow-2xs shrink-0">
                  {course.code}
                </span>
              )}
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                {course.semesterTerm || 'Fall'} {course.semesterYear || 2026}
              </span>
              {course.instructor && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {course.instructor}
                </span>
              )}
              {course.schedule && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {course.schedule.days.join('/')} {course.schedule.startTime}
                </span>
              )}
              {course.isArchived && (
                <span className="text-xs px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-800 shrink-0">
                  Archived Course
                </span>
              )}
            </div>

            {/* Course Title - Strict word-break normal to prevent single-letter vertical breaking */}
            <h1 
              className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight leading-tight w-full min-w-0"
              style={{
                wordBreak: 'normal',
                overflowWrap: 'normal',
                whiteSpace: 'normal'
              }}
            >
              {course.name}
            </h1>

            {/* Clean Course Status */}
            <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
              Learning System
            </p>
          </div>

          {/* Action Buttons Region - Wraps cleanly under title on screens < 1100px */}
          <div className="flex items-center justify-start xl:justify-end gap-2.5 flex-wrap w-full xl:w-auto shrink-0 pt-2 xl:pt-0 border-t xl:border-t-0 border-slate-100 dark:border-slate-800">
            {/* Course Options Overflow Menu */}
            {(onToggleArchiveCourse || onDeleteCourse) && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsCourseOptionsOpen(!isCourseOptionsOpen)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500"
                  title="Course options"
                  aria-expanded={isCourseOptionsOpen}
                >
                  <Sliders size={14} className="text-purple-600 dark:text-purple-400" />
                  <span>Course Options</span>
                  <ChevronDown size={14} className={cn("transition-transform", isCourseOptionsOpen && "rotate-180")} />
                </button>

                {isCourseOptionsOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsCourseOptionsOpen(false)} 
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-1.5 space-y-1 animate-in fade-in zoom-in-95">
                      {onToggleArchiveCourse && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsCourseOptionsOpen(false);
                            onToggleArchiveCourse(course.id);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <Archive size={14} className="text-amber-500" />
                          <span>{course.isArchived ? "Unarchive Class" : "Archive Class"}</span>
                        </button>
                      )}

                      {onDeleteCourse && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsCourseOptionsOpen(false);
                            if (confirm(`Are you sure you want to delete class "${course.name}"? This action cannot be undone.`)) {
                              onDeleteCourse(course.id);
                            }
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-500"
                        >
                          <Trash2 size={14} />
                          <span>Delete Class</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* "I'm Confused" quick trigger */}
            <button
              onClick={() => onOpenConfused(course.name, `Course overview for ${course.name}`)}
              className="px-3.5 py-2 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/70 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500"
              title="Open 'I'm Confused' helper"
            >
              <HelpCircle size={14} />
              <span>I’m Confused</span>
            </button>

            {/* Custom Study Assistance button */}
            <button
              onClick={onOpenStudyAssist}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500"
              title="Choose what assistance to generate"
            >
              <Sparkles size={14} className="text-purple-600" />
              <span>Study Assistance</span>
            </button>

            {/* Upload to course */}
            <button
              onClick={onOpenUploadModal}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md shadow-purple-600/20 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <Upload size={14} />
              <span>Upload Material</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation - Scrollable & Fully Visible */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-200/60 dark:bg-slate-800/60 rounded-2xl overflow-x-auto scrollbar-none w-full min-w-0 max-w-full">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={cn(
              'px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer shrink-0 focus:outline-none focus:ring-2 focus:ring-purple-500',
              currentTab === tab.id
                ? 'bg-white text-purple-700 dark:bg-slate-900 dark:text-purple-300 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/40'
            )}
          >
            <tab.icon size={16} />
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded-md text-[10px] font-bold',
                  currentTab === tab.id
                    ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300'
                    : 'bg-slate-300/60 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content Panes */}
      <div className="transition-all duration-200 min-w-0 w-full">
        {currentTab === 'notes' && (
          <NotesView
            course={course}
            onDeleteNote={onDeleteNote}
            onOpenConfused={onOpenConfused}
            onOpenUpload={onOpenUploadModal}
          />
        )}

        {currentTab === 'flashcards' && (
          <FlashcardsView
            course={course}
            onAddFlashcard={onAddFlashcard}
            onUpdateFlashcard={onUpdateFlashcard}
            onOpenConfused={onOpenConfused}
            onOpenUpload={onOpenUploadModal}
          />
        )}

        {currentTab === 'quizzes' && (
          <QuizzesView
            course={course}
            onOpenConfused={onOpenConfused}
            onOpenUpload={onOpenUploadModal}
          />
        )}

        {currentTab === 'mastery' && (
          <MasteryView
            course={course}
            onOpenConfused={onOpenConfused}
            onNavigateToTopic={() => handleTabChange('notes')}
          />
        )}

        {/* DEDICATED COURSE MAP TAB */}
        {currentTab === 'course_map' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Multiple Syllabus Selection Dialog */}
            {showSyllabusSelector && (
              <div className="p-5 rounded-3xl border border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/20 space-y-3 animate-in slide-in-from-top-4">
                <h3 className="text-sm font-bold text-purple-950 dark:text-purple-200">
                  Which syllabus should be used to build this Course Map?
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {course.sources.filter(s => s.sourceType === 'syllabus' || s.title.toLowerCase().includes('syllabus')).map(s => {
                    const isFailed = s.extractionStatus === 'failed';
                    const hasNoStorage = !s.storageKey;
                    return (
                      <div
                        key={s.id}
                        className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-left flex flex-col justify-between"
                      >
                        <div>
                          <div className="font-bold text-xs truncate">{s.title || s.fileName}</div>
                          <div className="text-[10px] text-slate-400 mt-1">Uploaded: {s.uploadedAt}</div>
                          <div className="text-[10px] mt-1">
                            Status: <span className={cn("font-bold", isFailed ? "text-rose-500" : "text-emerald-500")}>
                              {s.extractionStatus || (s.processingState === 'ready' ? 'ready' : 'ready')}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5 justify-end">
                          {hasNoStorage ? (
                            <div className="w-full space-y-1.5">
                              <div className="text-[10px] text-rose-500 font-medium">Original file unavailable. Please select the file again.</div>
                              <button
                                onClick={() => onOpenUploadModal()}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold"
                              >
                                Choose File Again
                              </button>
                            </div>
                          ) : isFailed ? (
                            <button
                              onClick={() => handleRetrySyllabusExtraction(s.id)}
                              disabled={isExtractingMap}
                              className="px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-[10px] font-bold cursor-pointer"
                            >
                              Retry File Extraction
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBuildCourseMap(s.id)}
                              disabled={isExtractingMap}
                              className="px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-[10px] font-bold cursor-pointer"
                            >
                              Rebuild Course Map
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => setShowSyllabusSelector(false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                  >
                    Cancel Selection
                  </button>
                </div>
              </div>
            )}

            {/* Error Message Panel with Solutions */}
            {extractionErrorMessage && (
              <div className="p-5 rounded-3xl border border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20 space-y-3 animate-in fade-in">
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  {extractionErrorMessage}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  To build a Course Map, please upload a parsed syllabus document so our pipeline can extract the complete timeline and reading schedules.
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={onOpenUploadModal}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Upload size={13} />
                    <span>Upload Syllabus</span>
                  </button>
                  {(() => {
                    const syllabusSources = course.sources.filter(s => s.sourceType === 'syllabus' || s.title.toLowerCase().includes('syllabus'));
                    if (syllabusSources.length === 0) return null;
                    const s = lastAttemptedSyllabusId 
                      ? syllabusSources.find(f => f.id === lastAttemptedSyllabusId) || syllabusSources[0]
                      : syllabusSources[0];
                    if (!s.storageKey) return null;

                    return (
                      <button
                        onClick={() => {
                          setExtractionErrorMessage(null);
                          if (s.extractionStatus === 'failed') {
                            handleRetrySyllabusExtraction(s.id);
                          } else {
                            handleBuildCourseMap(s.id);
                          }
                        }}
                        disabled={isExtractingMap}
                        className="px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold rounded-xl cursor-pointer"
                      >
                        {s.extractionStatus === 'failed' ? 'Retry File Extraction' : 'Retry Map Generation'}
                      </button>
                    );
                  })()}
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                    <Calendar size={22} />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      Structured Syllabus Course Map
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Week-by-week schedule, session topics, readings, and objectives extracted from syllabus.
                    </p>
                  </div>
                </div>

                {isExtractingMap ? (
                  <div className="px-4 py-2.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs font-semibold text-purple-700 dark:text-purple-300 rounded-xl flex items-center gap-2 animate-pulse">
                    <RefreshCw size={14} className="animate-spin" />
                    <span>{processingStatus || 'Extracting...'}</span>
                  </div>
                ) : (() => {
                  const syllabusSources = course.sources.filter(s => s.sourceType === 'syllabus' || s.title.toLowerCase().includes('syllabus'));
                  if (syllabusSources.length === 0) {
                    return (
                      <button
                        onClick={onOpenUploadModal}
                        className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md shadow-purple-600/20 transition-all cursor-pointer focus:outline-none"
                      >
                        <Upload size={14} />
                        <span>Upload Syllabus</span>
                      </button>
                    );
                  }

                  if (syllabusSources.length > 1) {
                    return (
                      <button
                        onClick={() => setShowSyllabusSelector(true)}
                        className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md shadow-purple-600/20 transition-all cursor-pointer focus:outline-none"
                      >
                        <RefreshCw size={14} />
                        <span>Select Syllabus ({syllabusSources.length})</span>
                      </button>
                    );
                  }

                  const s = syllabusSources[0];
                  const isFailed = s.extractionStatus === 'failed';
                  const hasNoStorage = !s.storageKey;

                  if (hasNoStorage) {
                    return (
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] text-rose-500 font-semibold text-right">Original file unavailable. Please select the file again.</span>
                        <button
                          onClick={onOpenUploadModal}
                          className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg shadow-2xs transition-all cursor-pointer focus:outline-none"
                        >
                          Choose File Again
                        </button>
                      </div>
                    );
                  }

                  if (isFailed) {
                    return (
                      <button
                        onClick={() => handleRetrySyllabusExtraction(s.id)}
                        className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md shadow-purple-600/25 transition-all cursor-pointer focus:outline-none"
                      >
                        <RefreshCw size={14} />
                        <span>Retry File Extraction</span>
                      </button>
                    );
                  }

                  return (
                    <button
                      onClick={() => handleBuildCourseMap(s.id)}
                      className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md shadow-purple-600/20 transition-all cursor-pointer focus:outline-none"
                    >
                      <RefreshCw size={14} />
                      <span>Rebuild Course Map</span>
                    </button>
                  );
                })()}
              </div>

              {course.syllabusMap && course.syllabusMap.sessions && course.syllabusMap.sessions.length > 0 ? (
                <div className="space-y-3 pt-2">
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 flex-wrap gap-2">
                    <span>
                      Course: <strong>{course.syllabusMap.courseName}</strong> ({course.syllabusMap.courseCode}) • {course.syllabusMap.sessions.length} Mapped Sessions
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold inline-flex items-center gap-1">
                      <CheckCircle2 size={13} /> Source-supported
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {course.syllabusMap.sessions.map((session, idx) => (
                      <div 
                        key={session.id || idx}
                        className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 space-y-2 hover:border-purple-300 transition-all shadow-2xs"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[10px] font-extrabold uppercase tracking-wider">
                            Week {session.weekNumber} • Session {session.sessionNumber}
                          </span>
                          {session.assignedChapters && (
                            <span className="text-[11px] text-slate-500 font-medium">
                              📖 {session.assignedChapters}
                            </span>
                          )}
                        </div>

                        <div className="space-y-1">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                            {session.topicTitle}
                          </h4>
                          {session.topicDescription && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">{session.topicDescription}</p>
                          )}
                        </div>

                        {session.learningObjectives && session.learningObjectives.length > 0 && (
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5">
                            {session.learningObjectives.map((obj, i) => (
                              <span key={i} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1">
                                <Target size={11} className="text-purple-600" />
                                {obj}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 space-y-3">
                  <Calendar size={32} className="mx-auto text-purple-600 dark:text-purple-400 opacity-80" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      No Course Map generated yet
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                      Upload your syllabus or course guide PDF, then click "Generate Course Map" to build a verified week-by-week Course Map.
                    </p>
                  </div>
                  <button
                    onClick={() => handleBuildCourseMap()}
                    disabled={isExtractingMap}
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 shadow-md shadow-purple-600/20 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <RefreshCw size={14} className={cn(isExtractingMap && "animate-spin")} />
                    <span>Generate Course Map</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {currentTab === 'sources' && (
          <SourcesView
            course={course}
            onOpenUploadModal={onOpenUploadModal}
            onDeleteSource={onDeleteSource}
            onSelectConceptLink={onSelectConceptLink}
            onNavigateToTab={handleTabChange}
            onOpenStudyAssist={onOpenStudyAssist}
          />
        )}
      </div>
    </div>
  );
}
