import React, { useState } from 'react';
import { Course } from '../types';
import {
  BookOpen,
  Calendar,
  Plus,
  Layers,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  Archive,
  BarChart2,
  CheckCircle2,
  Clock,
  X,
  Sliders,
  Settings,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  courses: Course[];
  activeCourseId: string;
  isPlannerActive: boolean;
  onSelectCourse: (courseId: string) => void;
  onSelectPlanner: () => void;
  onOpenWizard: () => void;
  onOpenPrivacy: () => void;
  onToggleArchiveCourse?: (courseId: string) => void;
  onDeleteCourse?: (courseId: string) => void;
  onClose?: () => void;
}

export default function Sidebar({
  courses,
  activeCourseId,
  isPlannerActive,
  onSelectCourse,
  onSelectPlanner,
  onOpenWizard,
  onOpenPrivacy,
  onToggleArchiveCourse,
  onDeleteCourse,
  onClose
}: SidebarProps) {
  const [showArchived, setShowArchived] = useState(false);

  const activeCourses = courses.filter((c) => !c.isArchived);
  const archivedCourses = courses.filter((c) => c.isArchived);

  return (
    <aside className="w-72 max-w-[85vw] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full select-none overflow-x-hidden">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-xs">
            <BookOpen size={18} />
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white block">
              Nexus Study
            </span>
            <span className="text-[10px] text-slate-400 font-semibold block">
              Learning System
            </span>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 md:hidden cursor-pointer"
            title="Close sidebar"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation and Courses List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        {/* Global Planner / Calendar Shortcut */}
        <div className="space-y-1">
          <button
            onClick={onSelectPlanner}
            className={cn(
              'w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all group cursor-pointer',
              isPlannerActive
                ? 'bg-purple-600 text-white shadow-sm'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
            )}
          >
            <div className="flex items-center gap-2.5">
              <Calendar
                size={16}
                className={cn(
                  'transition-colors',
                  isPlannerActive ? 'text-white' : 'text-purple-600 dark:text-purple-400'
                )}
              />
              <span>Study Planner & Deadlines</span>
            </div>
            <span
              className={cn(
                'text-[10px] px-2 py-0.5 rounded-md font-bold',
                isPlannerActive ? 'bg-purple-700 text-white' : 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
              )}
            >
              Calendar
            </span>
          </button>
        </div>

        {/* Active Classes List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Courses ({activeCourses.length})
            </span>
            <button
              onClick={onOpenWizard}
              className="p-1 rounded-md text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Add New Course"
            >
              <Plus size={15} />
            </button>
          </div>

          {activeCourses.length === 0 ? (
            <div className="p-4 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 text-xs space-y-2">
              <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                No courses created yet.
              </p>
              <button
                type="button"
                onClick={onOpenWizard}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1 shadow-2xs cursor-pointer"
              >
                <Plus size={13} /> Add Course
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {activeCourses.map((c) => {
                const isSelected = !isPlannerActive && activeCourseId === c.id;
                const totalTopics = c.mastery.length;
                const masteredCount = c.mastery.filter((m) => m.status === 'Mastered').length;
                const percentage = totalTopics > 0 ? Math.round((masteredCount / totalTopics) * 100) : 0;
                const progressTooltip = `${masteredCount} of ${totalTopics} topics mastered (${percentage}%)`;

                return (
                  <div
                    key={c.id}
                    onClick={() => onSelectCourse(c.id)}
                    className={cn(
                      'w-full text-left p-3 rounded-2xl text-xs transition-all flex flex-col gap-1.5 group cursor-pointer relative',
                      isSelected
                        ? 'bg-purple-50/80 dark:bg-slate-800/90 text-purple-950 dark:text-purple-200 font-bold shadow-2xs border border-purple-200/80 dark:border-slate-700'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300 font-medium border border-transparent'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 w-full">
                      <div className="flex items-start gap-2 min-w-0 flex-1">
                        <span
                          className={cn(
                            'w-2 h-2 rounded-full shrink-0 mt-1',
                            isSelected ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-600'
                          )}
                        />
                        <div className="min-w-0 flex-1 space-y-0.5">
                          {c.code && (
                            <span className="inline-block px-1.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 font-bold text-[10px] mb-0.5">
                              {c.code}
                            </span>
                          )}
                          <p className="font-bold text-slate-900 dark:text-slate-100 text-xs leading-snug break-words">
                            {c.name}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span 
                          className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap"
                          title={progressTooltip}
                        >
                          {totalTopics > 0 ? `${percentage}%` : 'Active'}
                        </span>

                        {/* Quick Hover Archive & Delete Controls */}
                        {onToggleArchiveCourse && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleArchiveCourse(c.id);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Archive Class"
                          >
                            <Archive size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Archived Courses Collapsible Section */}
        {archivedCourses.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="w-full flex items-center justify-between px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <Archive size={12} />
                <span>Archived ({archivedCourses.length})</span>
              </div>
              <ChevronDown
                size={14}
                className={cn('transition-transform', showArchived && 'rotate-180')}
              />
            </button>

            {showArchived && (
              <div className="space-y-1 pl-2">
                {archivedCourses.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => onSelectCourse(c.id)}
                    className="w-full text-left p-2 rounded-xl text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer group"
                  >
                    <span className="break-words flex-1 pr-2 truncate">{c.name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {onToggleArchiveCourse && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleArchiveCourse(c.id);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-purple-600"
                          title="Restore / Unarchive Class"
                        >
                          <RotateCcw size={12} />
                        </button>
                      )}
                      {onDeleteCourse && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Permanently delete course "${c.name}"?`)) {
                              onDeleteCourse(c.id);
                            }
                          }}
                          className="p-1 rounded text-slate-400 hover:text-rose-600"
                          title="Delete Class"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Controls: Preferences & Account Settings */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0 space-y-1">
        <button
          onClick={onOpenPrivacy}
          className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Settings size={15} className="text-purple-600 dark:text-purple-400" />
            <span>Settings & Preferences</span>
          </div>
          <span className="text-[10px] text-slate-400">Data & Backup</span>
        </button>
      </div>
    </aside>
  );
}
