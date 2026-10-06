import React, { useState } from 'react';
import { Course, StudyDeadline, LearningPreferences } from '../types';
import { exportUserDataPackage, resetUserAccount } from '../lib/storage';
import { 
  ShieldCheck, 
  X, 
  Download, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  SlidersHorizontal, 
  UserCheck 
} from 'lucide-react';
import { cn } from '../lib/utils';

interface AccountPrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  deadlines: StudyDeadline[];
  preferences: LearningPreferences;
  onUpdatePreferences: (prefs: LearningPreferences) => void;
  onResetAccount: () => void;
  onDeleteCourse: (courseId: string) => void;
}

export default function AccountPrivacyModal({
  isOpen,
  onClose,
  courses,
  deadlines,
  preferences,
  onUpdatePreferences,
  onResetAccount,
  onDeleteCourse
}: AccountPrivacyModalProps) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'privacy' | 'preferences' | 'data'>('privacy');
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const handleExport = () => {
    exportUserDataPackage(courses, deadlines, preferences);
  };

  const handleResetConfirm = () => {
    resetUserAccount();
    onResetAccount();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-purple-50/60 dark:bg-purple-950/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-600 text-white shadow-2xs">
              <ShieldCheck size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                Single-User Private Account
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Account & Privacy Controls
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="px-6 pt-3 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={cn(
              'pb-2.5 font-semibold transition-colors border-b-2',
              activeTab === 'privacy'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            )}
          >
            Privacy Guarantee
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preferences')}
            className={cn(
              'pb-2.5 font-semibold transition-colors border-b-2',
              activeTab === 'preferences'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            )}
          >
            Learning Preferences
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('data')}
            className={cn(
              'pb-2.5 font-semibold transition-colors border-b-2',
              activeTab === 'data'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            )}
          >
            Data Export & Reset
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {activeTab === 'privacy' && (
            <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 text-purple-950 dark:text-purple-200 space-y-2">
                <span className="font-bold text-sm block">Core Privacy Architecture</span>
                <p className="text-xs">
                  “Your courses, uploaded files, study activity, and progress are private to your account.”
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800 dark:text-slate-100 block">Strict Single-User Isolation</strong>
                    <span>No other student or classmate can see your notes, questions, uploads, or mastery results.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800 dark:text-slate-100 block">No Public or Shared Decks</strong>
                    <span>There are no public study decks, collaborative classroom spaces, leaderboards, or public comments.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800 dark:text-slate-100 block">Full Content Ownership & Deletion</strong>
                    <span>You can delete individual files, generated flashcards, or wipe your entire course environment at any moment.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Explanation Style
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['very_simple', 'standard', 'detailed'] as const).map(style => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => onUpdatePreferences({ ...preferences, explanationStyle: style })}
                      className={cn(
                        'p-2.5 rounded-xl border text-xs font-semibold capitalize transition-all cursor-pointer',
                        preferences.explanationStyle === style
                          ? 'border-purple-600 bg-purple-50 text-purple-900 dark:bg-purple-950/40 dark:text-purple-200'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      )}
                    >
                      {style.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Learning Bias
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(['worked_examples', 'visual_explanations', 'theory', 'practice_questions', 'balanced'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => onUpdatePreferences({ ...preferences, learningPreference: p })}
                      className={cn(
                        'p-2.5 rounded-xl border text-xs font-semibold capitalize transition-all cursor-pointer',
                        preferences.learningPreference === p
                          ? 'border-purple-600 bg-purple-50 text-purple-900 dark:bg-purple-950/40 dark:text-purple-200'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      )}
                    >
                      {p.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.adhdFocusMode}
                    onChange={(e) => onUpdatePreferences({ ...preferences, adhdFocusMode: e.target.checked })}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span>ADHD-friendly focus mode (reduces visual distractions)</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.largerText}
                    onChange={(e) => onUpdatePreferences({ ...preferences, largerText: e.target.checked })}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span>Larger text for reading comfort</span>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-5 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">Export Study Materials</h4>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                    Download a complete JSON package of your courses, notes, flashcards, and preferences.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExport}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  <Download size={14} /> Export Backup
                </button>
              </div>

              {/* Course deletion list */}
              {courses.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="font-bold uppercase tracking-wider text-slate-400 block text-[10px]">
                    Delete Specific Course
                  </span>
                  {courses.map(c => (
                    <div 
                      key={c.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                    >
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{c.code || c.name}</span>
                        <span className="text-slate-400 ml-2">({c.notes.length} notes, {c.flashcards.length} cards)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeleteCourse(c.id)}
                        className="text-rose-500 hover:text-rose-700 flex items-center gap-1 font-semibold p-1 transition-colors"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Reset Account Danger Zone */}
              <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-rose-950 dark:text-rose-200 space-y-3">
                <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold">
                  <AlertTriangle size={16} /> Danger Zone: Delete / Reset Account
                </div>
                <p className="text-[11px] leading-relaxed">
                  Permanently erase all courses, uploaded documents, notes, flashcards, and mastery progress from this device.
                </p>

                {!showConfirmReset ? (
                  <button
                    type="button"
                    onClick={() => setShowConfirmReset(true)}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-colors cursor-pointer"
                  >
                    Reset & Start Over
                  </button>
                ) : (
                  <div className="flex items-center gap-3 animate-in fade-in duration-150">
                    <button
                      type="button"
                      onClick={handleResetConfirm}
                      className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl font-bold transition-colors cursor-pointer"
                    >
                      Yes, Permanently Erase All Data
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowConfirmReset(false)}
                      className="px-3 py-2 text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
