import React, { useState, useRef } from 'react';
import { Course, Note, StructuredNoteSection, ProceduralWorkedExample } from '../types';
import { renderFormattedMath } from '../lib/mathUtils';
import { transcribeAudioBlob } from '../lib/gemini';
import {
  Lightbulb,
  Compass,
  FileCheck,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Search,
  Sparkles,
  HelpCircle,
  AlertTriangle,
  Layers,
  Edit3,
  Flag,
  RotateCcw,
  Trash2,
  ExternalLink,
  Plus,
  CheckCircle2,
  Check,
  Mic,
  MicOff
} from 'lucide-react';
import { cn } from '../lib/utils';

interface NotesViewProps {
  course: Course;
  onOpenConfused: (title: string, snippet?: string, type?: 'note' | 'formula' | 'step') => void;
  onTurnIntoFlashcards?: (topicTag: string, content: string) => void;
  onTurnIntoQuestions?: (topicTag: string, content: string) => void;
  onDeleteNote?: (noteId: string) => void;
  onOpenUpload?: () => void;
}

export default function NotesView({
  course,
  onOpenConfused,
  onTurnIntoFlashcards,
  onTurnIntoQuestions,
  onDeleteNote,
  onOpenUpload
}: NotesViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [densityMode, setDensityMode] = useState<'short' | 'standard' | 'detailed'>('standard');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [reportedNoteId, setReportedNoteId] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Audio voice transcription state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startVoiceSearch = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        setIsTranscribing(true);
        try {
          const text = await transcribeAudioBlob(blob, 'Transcribe search query or concept question.');
          setSearchQuery(text);
          showToast(`Voice search: "${text}"`);
        } catch (err) {
          console.error(err);
        } finally {
          setIsTranscribing(false);
        }
      };

      mr.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Mic access error:', err);
    }
  };

  const stopVoiceSearch = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  const filteredNotes = course.notes.filter((note) => {
    const matchesSearch =
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.topicTag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.standardExplanation || note.content || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesUnit = selectedUnit === 'all' || note.syllabusUnit === selectedUnit;
    return matchesSearch && matchesUnit;
  });

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2.5 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 size={16} className="text-emerald-400 dark:text-emerald-600" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Top Filter, Density & Search */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md flex items-center">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isRecording ? 'Listening to voice...' : `Search ${course.code || course.name} notes & formulas...`}
            className="w-full pl-9 pr-10 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
          />
          <button
            type="button"
            onClick={isRecording ? stopVoiceSearch : startVoiceSearch}
            className={cn(
              "absolute right-2 p-1.5 rounded-lg transition-colors cursor-pointer",
              isRecording ? "bg-rose-500 text-white animate-pulse" : "text-slate-400 hover:text-purple-600 dark:hover:text-purple-400"
            )}
            title={isRecording ? "Stop voice search" : "Dictate search query (Audio Transcription)"}
          >
            {isRecording ? <MicOff size={15} /> : <Mic size={15} />}
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end">
          {/* Explanation Density Switcher (Section 12 requirement) */}
          <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center gap-1 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1.5 hidden sm:inline">
              Detail:
            </span>
            {(['short', 'standard', 'detailed'] as const).map(d => (
              <button
                key={d}
                onClick={() => setDensityMode(d)}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-semibold capitalize transition-all cursor-pointer text-xs',
                  densityMode === d
                    ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                )}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Unit selector */}
          <select
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Syllabus Units</option>
            {course.syllabusUnits.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Empty State (Section 15 Requirement) */}
      {filteredNotes.length === 0 ? (
        <div className="text-center py-20 px-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-white/50 dark:bg-slate-900/50 space-y-4 max-w-xl mx-auto">
          <div className="w-14 h-14 rounded-3xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto shadow-2xs">
            <BookOpen size={26} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              No generated notes yet.
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              Upload course materials, lecture slides, or textbook excerpts to generate organized explanations and worked models for {course.code || course.name}.
            </p>
          </div>
          {onOpenUpload && (
            <button
              onClick={onOpenUpload}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 shadow-md shadow-purple-600/20 transition-all cursor-pointer"
            >
              <Plus size={15} /> Upload Course Materials
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {filteredNotes.map((note) => {
            const isEditing = editingNoteId === note.id;

            return (
              <article
                key={note.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all"
              >
                {/* Note Header & Source Transparency */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                        {note.syllabusUnit}
                      </span>
                      <span className="text-slate-300 dark:text-slate-700">·</span>
                      <span className="text-xs font-semibold text-slate-500">
                        #{note.topicTag}
                      </span>
                      {note.citation && (
                        <>
                          <span className="text-slate-300 dark:text-slate-700">·</span>
                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <BookOpen size={12} className="text-purple-600" />
                            Source: {note.citation.referenceDetail}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Prominent "I'm Confused" button */}
                    <button
                      onClick={() => onOpenConfused(note.title, note.shortExplanation, 'note')}
                      className="px-3 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800/80 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      title="Request simplified assistance or symbol breakdown"
                    >
                      <HelpCircle size={14} />
                      <span>I’m Confused</span>
                    </button>
                  </div>

                  {/* Title & Edit Actions */}
                  <div className="flex items-start justify-between gap-4">
                    {isEditing ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={editedTitle}
                          onChange={(e) => setEditedTitle(e.target.value)}
                          className="flex-1 px-3 py-1.5 text-lg font-bold rounded-lg border border-purple-500 bg-white dark:bg-slate-800"
                        />
                        <button
                          onClick={() => {
                            note.title = editedTitle;
                            setEditingNoteId(null);
                            showToast('Note title updated');
                          }}
                          className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                        {note.title}
                      </h2>
                    )}

                    {/* Source Action Buttons */}
                    <div className="flex items-center gap-1 shrink-0 text-slate-400">
                      <button
                        onClick={() => {
                          setEditingNoteId(note.id);
                          setEditedTitle(note.title);
                        }}
                        className="p-1.5 rounded-lg hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Edit note title"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() => {
                          setReportedNoteId(note.id);
                          showToast('Note reported for re-evaluation');
                        }}
                        className="p-1.5 rounded-lg hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Report incorrect content"
                      >
                        <Flag size={15} />
                      </button>
                      {onDeleteNote && (
                        <button
                          onClick={() => onDeleteNote(note.id)}
                          className="p-1.5 rounded-lg hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Delete note"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Explanation text according to selected density mode */}
                <div className="p-6 space-y-6">
                  <div className="p-4 rounded-2xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block mb-1">
                      {densityMode === 'short' && 'Short Executive Overview'}
                      {densityMode === 'standard' && 'Core Principle Overview'}
                      {densityMode === 'detailed' && 'Comprehensive Theoretical Overview'}
                    </span>
                    <p className="break-words">
                      {densityMode === 'short' && renderFormattedMath(note.shortExplanation || note.content || '')}
                      {densityMode === 'standard' && renderFormattedMath(note.standardExplanation || note.content || '')}
                      {densityMode === 'detailed' && renderFormattedMath(note.detailedExplanation || note.content || '')}
                    </p>
                  </div>

                  {/* Structured Sections (Section 12 requirement) */}
                  <div className="space-y-4">
                    {(note.sections || []).map((sec) => {
                      const isCollapsed = collapsedSections[sec.id] || false;

                      return (
                        <div
                          key={sec.id}
                          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs"
                        >
                          {/* Section Header */}
                          <div 
                            onClick={() => toggleSection(sec.id)}
                            className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-800/70 transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="text-slate-400">
                                {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                              </span>
                              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                                {sec.title}
                              </h3>
                            </div>

                            {/* Section transformation actions */}
                            <div 
                              onClick={(e) => e.stopPropagation()} 
                              className="flex items-center gap-1.5"
                            >
                              <button
                                onClick={() => onTurnIntoFlashcards && onTurnIntoFlashcards(note.topicTag, sec.inSimpleTerms)}
                                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-purple-100 dark:bg-slate-800 dark:hover:bg-purple-950/60 text-slate-600 dark:text-slate-300 hover:text-purple-700 transition-colors cursor-pointer"
                                title="Turn this section into flashcards"
                              >
                                + Flashcard
                              </button>
                              <button
                                onClick={() => onTurnIntoQuestions && onTurnIntoQuestions(note.topicTag, sec.inSimpleTerms)}
                                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-purple-100 dark:bg-slate-800 dark:hover:bg-purple-950/60 text-slate-600 dark:text-slate-300 hover:text-purple-700 transition-colors cursor-pointer"
                                title="Turn this section into practice questions"
                              >
                                + Question
                              </button>
                              <button
                                onClick={() => onOpenConfused(sec.title, sec.definition, 'note')}
                                className="p-1 rounded-lg text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-950/60 cursor-pointer"
                                title="I'm Confused on this section"
                              >
                                <HelpCircle size={15} />
                              </button>
                            </div>
                          </div>

                          {/* Section Body */}
                          {!isCollapsed && (
                            <div className="p-5 space-y-5 text-xs sm:text-sm">
                              {/* In Simple Terms */}
                              <div className="space-y-1">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block">
                                  In Simple Terms
                                </span>
                                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                                  {renderFormattedMath(sec.inSimpleTerms)}
                                </p>
                              </div>

                              {/* Why This Matters */}
                              <div className="space-y-1 p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 block">
                                  Why This Matters
                                </span>
                                <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                                  {renderFormattedMath(sec.whyThisMatters)}
                                </p>
                              </div>

                              {/* Algorithm or Pseudocode */}
                              {sec.algorithmOrPseudocode && (
                                <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/50 bg-slate-900 text-slate-100 space-y-2 font-mono text-xs">
                                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 block font-sans">
                                    Algorithm & Pseudocode
                                  </span>
                                  <pre className="p-3 rounded-lg bg-slate-950 overflow-x-auto text-purple-300 leading-relaxed whitespace-pre-wrap">
                                    {sec.algorithmOrPseudocode}
                                  </pre>
                                </div>
                              )}

                              {/* Key Terms */}
                              {sec.keyTerms && sec.keyTerms.length > 0 && (
                                <div className="space-y-2">
                                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                                    Important Terminology
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {sec.keyTerms.map((kt, kIdx) => (
                                      <div key={kIdx} className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                                        <strong className="text-purple-600 dark:text-purple-400 block">{kt.term}</strong>
                                        <span className="text-slate-600 dark:text-slate-400 text-[11px] leading-tight block mt-0.5">{kt.definition}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Comparison Table */}
                              {sec.comparison && sec.comparison.items && sec.comparison.items.length > 0 && (
                                <div className="space-y-2 pt-1">
                                  <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block">
                                    {sec.comparison.title || 'Concept Comparison'}
                                  </span>
                                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                                    <table className="w-full text-left text-xs border-collapse">
                                      <thead>
                                        <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800">
                                          <th className="p-2.5 font-bold">Property</th>
                                          <th className="p-2.5 font-bold text-purple-700 dark:text-purple-300">{sec.comparison.conceptA}</th>
                                          <th className="p-2.5 font-bold text-blue-700 dark:text-blue-300">{sec.comparison.conceptB}</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                                        {sec.comparison.items.map((item, cIdx) => (
                                          <tr key={cIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                            <td className="p-2.5 font-bold text-slate-500">{item.property}</td>
                                            <td className="p-2.5 font-semibold">{item.valueA}</td>
                                            <td className="p-2.5 font-semibold">{item.valueB}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {/* Important Definition & Formula */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                                    Important Definition
                                  </span>
                                  <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                                    {renderFormattedMath(sec.definition || '')}
                                  </p>
                                </div>

                                {sec.formula && (
                                  <div className="p-4 rounded-xl border border-purple-200/80 dark:border-purple-900/50 bg-purple-50/30 dark:bg-purple-950/20 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                                        Formula
                                      </span>
                                      <button
                                        onClick={() => onOpenConfused(`${sec.title} Formula`, sec.formula, 'formula')}
                                        className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                                      >
                                        <HelpCircle size={12} /> Explain symbols
                                      </button>
                                    </div>
                                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 font-mono text-sm text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60 text-center">
                                      {renderFormattedMath(sec.formula)}
                                    </div>

                                    {/* What each symbol means */}
                                    {sec.symbolBreakdown && sec.symbolBreakdown.length > 0 && (
                                      <div className="space-y-1 pt-1 text-[11px]">
                                        <span className="text-slate-400 font-semibold block">What each symbol means:</span>
                                        <ul className="space-y-0.5 text-slate-600 dark:text-slate-400">
                                          {sec.symbolBreakdown.map((sym, sIdx) => (
                                            <li key={sIdx} className="flex items-baseline gap-1.5">
                                              <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{sym.symbol}:</span>
                                              <span>{sym.meaning}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Step-by-Step Procedural Worked Example (Section 10 Requirement) */}
                              {sec.workedExample && (
                                <div className="space-y-3 pt-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                      <FileCheck size={16} className="text-emerald-500" />
                                      {sec.workedExample.title}
                                    </span>
                                    <button
                                      onClick={() => onOpenConfused(sec.workedExample!.title, sec.workedExample!.problem, 'step')}
                                      className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                                    >
                                      <HelpCircle size={13} /> I’m Confused on this example
                                    </button>
                                  </div>

                                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 space-y-4">
                                    {/* Problem Statement */}
                                    <div>
                                      <strong className="text-slate-400 text-xs block mb-0.5">Problem</strong>
                                      <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                                        {renderFormattedMath(sec.workedExample.problem)}
                                      </p>
                                    </div>

                                    {/* What are we trying to find? */}
                                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                                      <span className="text-[11px] font-bold text-slate-500 block">What are we trying to find?</span>
                                      <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">
                                        {sec.workedExample.whatAreWeTryingToFind}
                                      </p>
                                    </div>

                                    {/* Information given */}
                                    <div>
                                      <span className="text-[11px] font-bold text-slate-400 block mb-1">Information given:</span>
                                      <ul className="list-disc pl-5 text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                                        {sec.workedExample.informationGiven.map((info, iIdx) => (
                                          <li key={iIdx}>{renderFormattedMath(info)}</li>
                                        ))}
                                      </ul>
                                    </div>

                                    {/* Procedural Steps */}
                                    <div className="space-y-3 pt-1">
                                      {sec.workedExample.steps.map(step => (
                                        <div 
                                          key={step.stepNumber}
                                          className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2"
                                        >
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center justify-center">
                                                {step.stepNumber}
                                              </span>
                                              <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                                {step.title}
                                              </span>
                                            </div>

                                            {/* Individual Step "I'm Confused" button */}
                                            <button
                                              onClick={() => onOpenConfused(`Step ${step.stepNumber}: ${step.title}`, step.explanation, 'step')}
                                              className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                                              title={`Help with Step ${step.stepNumber}`}
                                            >
                                              <HelpCircle size={12} /> I’m Confused on this step
                                            </button>
                                          </div>

                                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                            {renderFormattedMath(step.explanation)}
                                          </p>

                                          {step.mathOrCode && (
                                            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 font-mono text-xs text-purple-700 dark:text-purple-300">
                                              {renderFormattedMath(step.mathOrCode)}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>

                                    {/* Final Answer & Intuition */}
                                    <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-xs text-emerald-950 dark:text-emerald-200 space-y-1">
                                      <strong className="block text-emerald-800 dark:text-emerald-300">Final Answer:</strong>
                                      <p className="font-bold text-sm">{renderFormattedMath(sec.workedExample.finalAnswer || '')}</p>
                                      <p className="text-[11px] text-slate-600 dark:text-slate-400 pt-1">
                                        <strong>Why this makes sense:</strong> {sec.workedExample.whyThisAnswerMakesSense}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Common Mistake Callout */}
                              {sec.commonMistake && (
                                <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 text-xs text-amber-950 dark:text-amber-200 space-y-1">
                                  <span className="font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                                    <AlertTriangle size={14} /> Common Student Mistake:
                                  </span>
                                  <p className="leading-relaxed">{renderFormattedMath(sec.commonMistake)}</p>
                                </div>
                              )}

                              {/* Quick Understanding Check */}
                              {sec.quickCheck && (
                                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                                    Quick Understanding Check
                                  </span>
                                  <p className="text-slate-700 dark:text-slate-300 font-medium">
                                    {renderFormattedMath(sec.quickCheck.question)}
                                  </p>
                                  <details className="text-[11px] text-purple-700 dark:text-purple-300 cursor-pointer pt-1">
                                    <summary className="font-semibold select-none">Show Answer</summary>
                                    <p className="mt-1 text-slate-600 dark:text-slate-400 font-normal">
                                      {renderFormattedMath(sec.quickCheck.answer)}
                                    </p>
                                  </details>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
