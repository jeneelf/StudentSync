import React, { useState } from 'react';
import { Course, SourceMaterial, MaterialSourceType, DashboardTab } from '../types';
import { renderFormattedMath } from '../lib/mathUtils';
import {
  Upload,
  BookOpen,
  FileText,
  Presentation,
  PenTool,
  Layers,
  FileCode,
  Search,
  ChevronDown,
  ChevronUp,
  Clock,
  HardDrive,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  FolderOpen,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  Eye,
  X,
  FileCheck,
  AlertTriangle,
  Info
} from 'lucide-react';
import { cn } from '../lib/utils';

interface SourcesViewProps {
  course: Course;
  onOpenUploadModal: () => void;
  onDeleteSource?: (sourceId: string) => void;
  onSelectConceptLink?: (conceptName: string, targetCourseCode: string) => void;
  onNavigateToTab?: (tab: DashboardTab, topic?: string) => void;
  onOpenStudyAssist?: () => void;
}

export default function SourcesView({
  course,
  onOpenUploadModal,
  onDeleteSource,
  onSelectConceptLink,
  onNavigateToTab,
  onOpenStudyAssist
}: SourcesViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(
    course.sources[0]?.id || null
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // File Inspector Modal State (Functional 2-Tab File Previewer)
  const [previewModalSource, setPreviewModalSource] = useState<SourceMaterial | null>(null);
  const [activePreviewTab, setActivePreviewTab] = useState<'metadata' | 'extracted_content'>('extracted_content');

  const handleCopyContent = (sourceId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(sourceId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const getSourceIcon = (type: MaterialSourceType) => {
    switch (type) {
      case 'syllabus':
        return <Layers size={18} className="text-purple-600 dark:text-purple-400" />;
      case 'lecture_slides':
        return <Presentation size={18} className="text-blue-500" />;
      case 'notes':
        return <FileText size={18} className="text-emerald-500" />;
      case 'textbook':
        return <BookOpen size={18} className="text-amber-500" />;
      case 'assignments':
      case 'exercises':
        return <FileCode size={18} className="text-rose-500" />;
      case 'labs':
      case 'projects':
        return <PenTool size={18} className="text-indigo-500" />;
      case 'study_guide':
        return <CheckCircle2 size={18} className="text-cyan-500" />;
      default:
        return <FileText size={18} className="text-slate-500" />;
    }
  };

  const tabs: { id: string; label: string; types: MaterialSourceType[] }[] = [
    { id: 'all', label: 'All Files', types: [] },
    { id: 'syllabus', label: 'Syllabus', types: ['syllabus'] },
    { id: 'lecture_slides', label: 'Lecture Slides', types: ['lecture_slides', 'slide_deck'] },
    { id: 'notes', label: 'Notes & Recitations', types: ['notes', 'lecture_notes', 'written_notes'] },
    { id: 'textbook', label: 'Textbooks', types: ['textbook', 'excerpt'] },
    { id: 'assignments', label: 'Assignments', types: ['assignments'] },
    { id: 'exercises', label: 'Exercises', types: ['exercises'] },
    { id: 'labs', label: 'Labs & Projects', types: ['labs', 'projects'] },
    { id: 'study_guide', label: 'Exam Guides', types: ['study_guide'] }
  ];

  const getCountForTab = (tab: typeof tabs[0]) => {
    if (tab.id === 'all') return course.sources.length;
    return course.sources.filter(s => tab.types.includes(s.sourceType)).length;
  };

  const filteredSources = course.sources.filter((s) => {
    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.chapterOrTopic && s.chapterOrTopic.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.fileName && s.fileName.toLowerCase().includes(searchQuery.toLowerCase()));

    if (selectedTypeFilter === 'all') return matchesSearch;

    const currentTabObj = tabs.find(t => t.id === selectedTypeFilter);
    const matchesType = currentTabObj ? currentTabObj.types.includes(s.sourceType) : s.sourceType === selectedTypeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 w-full">
      {/* Top Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              {course.code || course.name}
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {course.sources.length} Uploaded Files
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
            Course Source Materials
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
            View your syllabus, slide decks, recitation notes, problem sets, and textbook chapters.
          </p>
        </div>

        <button
          onClick={onOpenUploadModal}
          className="shrink-0 px-5 py-2.5 sm:py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-purple-600/25 transition-all cursor-pointer"
        >
          <Upload size={16} />
          <span>Upload Material</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${course.code || course.name} files & chapters...`}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Source type tabs with counts */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
          {tabs.map((tab) => {
            const count = getCountForTab(tab);
            const isSelected = selectedTypeFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTypeFilter(tab.id)}
                className={cn(
                  'px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer shrink-0',
                  isSelected
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                )}
              >
                <span>{tab.label}</span>
                <span className={cn(
                  'px-1.5 py-0.2 rounded-md text-[10px] font-bold',
                  isSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sources List */}
      {filteredSources.length === 0 ? (
        <div className="text-center py-16 px-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-white/50 dark:bg-slate-900/50 space-y-4 max-w-xl mx-auto">
          <div className="w-14 h-14 rounded-3xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto shadow-2xs">
            <BookOpen size={26} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              No materials in this category.
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              Upload files for this course section to generate notes, flashcards, and step-by-step models.
            </p>
          </div>
          <button
            onClick={onOpenUploadModal}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 shadow-md shadow-purple-600/20 transition-all cursor-pointer"
          >
            <Upload size={15} /> Upload {tabs.find(t => t.id === selectedTypeFilter)?.label || 'File'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSources.map((source) => {
            const isExpanded = expandedSourceId === source.id;

            // Find related notes & flashcards linked to this source
            const relatedNotes = course.notes.filter(
              n => n.sourceId === source.id || n.title.toLowerCase().includes(source.title.toLowerCase().slice(0, 15))
            );
            const relatedFlashcards = course.flashcards.filter(
              f => f.sourceId === source.id || (source.chapterOrTopic && f.topicTag.toLowerCase().includes(source.chapterOrTopic.toLowerCase()))
            );

            return (
              <div
                key={source.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden transition-all"
              >
                {/* Header row */}
                <div
                  onClick={() => setExpandedSourceId(isExpanded ? null : source.id)}
                  className="p-4 sm:p-5 flex items-start sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 shrink-0">
                      {getSourceIcon(source.sourceType)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider text-[10px]">
                          {source.sourceType.replace('_', ' ')}
                        </span>
                        {source.weekOrUnit && (
                          <>
                            <span className="text-slate-300 dark:text-slate-700">·</span>
                            <span className="text-slate-500 dark:text-slate-400 text-[11px]">{source.weekOrUnit}</span>
                          </>
                        )}
                        {source.fileSize && (
                          <>
                            <span className="text-slate-300 dark:text-slate-700">·</span>
                            <span className="text-slate-400 text-[11px]">{source.fileSize}</span>
                          </>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5 break-words">
                        {source.title}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewModalSource(source);
                        setActivePreviewTab('extracted_content');
                      }}
                      className="px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-purple-200 dark:border-purple-800"
                      title="Open full extracted text preview"
                    >
                      <Eye size={13} />
                      <span className="hidden sm:inline">Preview Extracted Text</span>
                    </button>

                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 size={13} /> {source.processingState === 'ready' ? 'Ready' : (source.processingState || 'Ready')}
                    </span>

                    {onDeleteSource && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSource(source.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        title="Delete source material"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}

                    <div className="text-slate-400">
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>
                </div>

                {/* Expanded Source Details */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-4 text-xs">
                    {/* Content Preview with Copy Button */}
                    <div>
                      <div className="flex items-center justify-between pb-1.5">
                        <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                          Extracted Content Preview
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewModalSource(source);
                              setActivePreviewTab('extracted_content');
                            }}
                            className="px-2 py-1 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Eye size={12} />
                            <span>Full Screen Preview</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopyContent(source.id, source.content || '')}
                            className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            {copiedId === source.id ? (
                              <>
                                <Check size={12} className="text-emerald-500" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                <span>Copy Text</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-mono text-xs leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto">
                        {renderFormattedMath(source.content || 'Extracted material from uploaded document.')}
                      </div>
                    </div>

                    {/* Metadata line */}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-slate-400 pt-1 text-[11px]">
                      <div className="flex items-center gap-4 flex-wrap">
                        <span>File: <strong className="text-slate-700 dark:text-slate-300">{source.fileName || source.title}</strong></span>
                        <span>Uploaded: <strong className="text-slate-700 dark:text-slate-300">{source.uploadedAt || 'Today'}</strong></span>
                        <span>Status: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{source.processingState || 'ready'}</strong></span>
                      </div>
                    </div>

                    {/* Interactive Linked Study Resources Action Bar */}
                    <div className="p-3.5 rounded-2xl bg-purple-50/80 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <span className="font-bold text-purple-900 dark:text-purple-200 text-xs block">
                          Generated Study Resources
                        </span>
                        <p className="text-[11px] text-purple-700 dark:text-purple-300">
                          {relatedNotes.length > 0 || relatedFlashcards.length > 0
                            ? `Available: ${relatedNotes.length} note modules, ${relatedFlashcards.length} flashcards.`
                            : 'Create notes, explanations, and flashcards directly from this file.'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {relatedNotes.length > 0 && onNavigateToTab && (
                          <button
                            type="button"
                            onClick={() => onNavigateToTab('notes')}
                            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                          >
                            <FileText size={13} />
                            <span>View Notes ({relatedNotes.length})</span>
                          </button>
                        )}

                        {relatedFlashcards.length > 0 && onNavigateToTab && (
                          <button
                            type="button"
                            onClick={() => onNavigateToTab('flashcards')}
                            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                          >
                            <Layers size={13} />
                            <span>Study Flashcards ({relatedFlashcards.length})</span>
                          </button>
                        )}

                        {onOpenStudyAssist && (
                          <button
                            type="button"
                            onClick={onOpenStudyAssist}
                            className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                          >
                            <Sparkles size={13} />
                            <span>Generate Resources</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* FUNCTIONAL 2-TAB FILE PREVIEW INSPECTOR MODAL */}
      {previewModalSource && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 shrink-0">
                  {getSourceIcon(previewModalSource.sourceType)}
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block">
                    File Extraction Inspector
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                    {previewModalSource.title}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setPreviewModalSource(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Tabs Navigation */}
            <div className="px-6 pt-3 pb-0 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 bg-slate-50/40 dark:bg-slate-900/40 shrink-0 text-xs">
              <button
                onClick={() => setActivePreviewTab('extracted_content')}
                className={cn(
                  'pb-3 font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5',
                  activePreviewTab === 'extracted_content'
                    ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                )}
              >
                <FileText size={15} />
                <span>Extracted Content</span>
              </button>

              <button
                onClick={() => setActivePreviewTab('metadata')}
                className={cn(
                  'pb-3 font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5',
                  activePreviewTab === 'metadata'
                    ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                )}
              >
                <Info size={15} />
                <span>Original File & Metadata</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
              {activePreviewTab === 'extracted_content' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                      Extracted Raw Text ({previewModalSource.content.length} chars)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyContent(previewModalSource.id, previewModalSource.content)}
                      className="px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold text-[10px] flex items-center gap-1 cursor-pointer border border-purple-200 dark:border-purple-800"
                    >
                      {copiedId === previewModalSource.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      <span>{copiedId === previewModalSource.id ? 'Copied!' : 'Copy Full Extracted Text'}</span>
                    </button>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs leading-relaxed whitespace-pre-wrap overflow-y-auto max-h-[50vh] border border-slate-800 shadow-inner">
                    {renderFormattedMath(previewModalSource.content || 'No text extracted.')}
                  </div>
                </div>
              )}

              {activePreviewTab === 'metadata' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Original Filename</span>
                      <p className="font-bold text-slate-800 dark:text-slate-200 break-all">{previewModalSource.fileName || previewModalSource.title}</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Detected Material Type</span>
                      <p className="font-bold text-purple-600 dark:text-purple-400 uppercase">{previewModalSource.sourceType.replace('_', ' ')}</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Processing Status</span>
                      <p className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 size={13} /> {previewModalSource.processingState || 'ready'}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">File Size & Format</span>
                      <p className="font-bold text-slate-800 dark:text-slate-200">{previewModalSource.fileSize || '1.2 MB'} • {previewModalSource.fileType.toUpperCase()}</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Upload Date</span>
                      <p className="font-bold text-slate-800 dark:text-slate-200">{previewModalSource.uploadedAt}</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Syllabus Mapping</span>
                      <p className="font-bold text-slate-800 dark:text-slate-200">{previewModalSource.weekOrUnit || 'General'}</p>
                    </div>
                  </div>

                  {previewModalSource.extractionWarnings && previewModalSource.extractionWarnings.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-1">
                      <span className="font-bold flex items-center gap-1.5 text-xs">
                        <AlertTriangle size={14} className="text-amber-600" /> Extraction Warnings
                      </span>
                      {previewModalSource.extractionWarnings.map((w, i) => (
                        <p key={i} className="text-[11px]">• {w}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-400">Course Source ID: {previewModalSource.id}</span>
              <button
                onClick={() => setPreviewModalSource(null)}
                className="px-5 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
