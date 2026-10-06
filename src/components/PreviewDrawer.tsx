import React from 'react';
import { CrossCourseLink, Course } from '../types';
import { renderFormattedMath } from '../lib/mathUtils';
import { X, ArrowRight, BookOpen, Sparkles, CheckCircle2 } from 'lucide-react';

interface PreviewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  link: CrossCourseLink | null;
  allCourses: Course[];
  onNavigateToCourse: (courseId: string) => void;
}

export default function PreviewDrawer({
  isOpen,
  onClose,
  link,
  allCourses,
  onNavigateToCourse
}: PreviewDrawerProps) {
  if (!isOpen || !link) return null;

  const targetCourse = allCourses.find(
    (c) => c.code && c.code.toLowerCase() === link.targetCourseCode.toLowerCase()
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-300">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col z-10 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Sparkles size={18} />
            </span>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                Cross-Course Concept Link
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {link.conceptName}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Target Course Banner */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            <div className="flex items-center justify-between mb-2">
              <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">
                {link.targetCourseCode}
              </span>
              {targetCourse?.isArchived && (
                <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                  Archived Prerequisite
                </span>
              )}
            </div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">
              {link.targetCourseName}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Referenced as prerequisite & foundation knowledge
            </p>
          </div>

          {/* Connected Excerpt */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-2">
              <BookOpen size={14} className="text-purple-500" /> Connected Course Excerpt
            </label>
            <div className="p-4 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-slate-800 dark:text-slate-200 text-sm leading-relaxed">
              "{renderFormattedMath(link.excerpt)}"
            </div>
          </div>

          {/* Conceptual Rationale */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-2">
              <CheckCircle2 size={14} className="text-emerald-500" /> Why This Connection Matters
            </label>
            <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-300 text-sm leading-relaxed">
              {renderFormattedMath(link.rationale)}
            </div>
          </div>

          {/* Related Notes in Target Course */}
          {targetCourse && targetCourse.notes.length > 0 && (
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 block">
                Related Notes Available in {targetCourse.code}
              </label>
              <div className="space-y-2">
                {targetCourse.notes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{note.title}</div>
                      <div className="text-slate-500 dark:text-slate-400">{note.syllabusUnit}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Action */}
        <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          {targetCourse ? (
            <button
              onClick={() => {
                onNavigateToCourse(targetCourse.id);
                onClose();
              }}
              className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl text-sm flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
            >
              Switch to {targetCourse.code} Dashboard
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium rounded-xl text-sm transition-colors cursor-pointer"
            >
              Close Preview
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
