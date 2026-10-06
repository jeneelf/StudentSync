import React, { useState } from 'react';
import { StudyDeadline, Course } from '../types';
import {
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  Target,
  CheckCircle2,
  Plus,
  Filter,
  ArrowRight,
  ListOrdered,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Trash2
} from 'lucide-react';
import { cn, formatDate, getDaysUntil } from '../lib/utils';

interface PlannerViewProps {
  deadlines: StudyDeadline[];
  courses: Course[];
  onToggleComplete: (deadlineId: string) => void;
  onAddDeadline: (newDeadline: StudyDeadline) => void;
  onNavigateToCourse: (courseId: string) => void;
  onDeleteDeadline?: (deadlineId: string) => void;
}

export default function PlannerView({
  deadlines,
  courses,
  onToggleComplete,
  onAddDeadline,
  onNavigateToCourse,
  onDeleteDeadline
}: PlannerViewProps) {
  const [viewMode, setViewMode] = useState<'timeline' | 'calendar'>('timeline');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // Dynamic calendar navigation state
  const [calYear, setCalYear] = useState<number>(2026);
  const [calMonth, setCalMonth] = useState<number>(9); // 0-indexed: 9 = October

  // New deadline form state
  const [newTitle, setNewTitle] = useState('');
  const [newCourseId, setNewCourseId] = useState(courses[0]?.id || '');
  const [newType, setNewType] = useState<StudyDeadline['type']>('Exam');
  const [newDueDate, setNewDueDate] = useState('2026-10-24');
  const [newPriority, setNewPriority] = useState<StudyDeadline['priority']>('high');
  const [newAction, setNewAction] = useState('');

  const filteredDeadlines = deadlines.filter((d) => {
    if (selectedCourseFilter === 'all') return true;
    return d.courseId === selectedCourseFilter;
  });

  const sortedDeadlines = [...filteredDeadlines].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const course = courses.find((c) => c.id === newCourseId) || courses[0];
    const newDeadline: StudyDeadline = {
      id: `dl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      courseId: course?.id || 'course-default',
      courseCode: course?.code || course?.name || 'Course',
      title: newTitle.trim(),
      type: newType,
      dueDate: newDueDate,
      weightPercent: newType === 'Exam' ? 25 : 10,
      priority: newPriority,
      relatedTopics: [course?.syllabusUnits?.[0]?.split(':')[1]?.trim() || 'Core'],
      recommendedAction: newAction.trim() || `Review notes and problem sets for ${newTitle}.`,
      completed: false
    };

    onAddDeadline(newDeadline);

    // Auto navigate calendar to the month of the newly added deadline
    const [y, m] = newDueDate.split('-').map(Number);
    if (y && m) {
      setCalYear(y);
      setCalMonth(m - 1);
    }

    setNewTitle('');
    setNewAction('');
    setShowAddModal(false);
  };

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(prev => prev - 1);
    } else {
      setCalMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(prev => prev + 1);
    } else {
      setCalMonth(prev => prev + 1);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysInCurrentMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const startDayOfWeek = new Date(calYear, calMonth, 1).getDay(); // 0 = Sunday

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full px-1 sm:px-0">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
            Schedule & Planning
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CalendarIcon className="text-purple-600" size={24} />
            Study Planner & Deadlines
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Track exam dates, assignments, project milestones, and preparation timelines.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Timeline vs Calendar Toggle */}
          <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center gap-1">
            <button
              onClick={() => setViewMode('timeline')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer',
                viewMode === 'timeline'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <ListOrdered size={14} /> Timeline
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer',
                viewMode === 'calendar'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <CalendarDays size={14} /> Calendar
            </button>
          </div>

          {/* Add Deadline Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Plus size={15} /> Add Deadline
          </button>
        </div>
      </div>

      {/* Course Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1 shrink-0">
          <Filter size={12} /> Filter:
        </span>
        <button
          onClick={() => setSelectedCourseFilter('all')}
          className={cn(
            'px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0',
            selectedCourseFilter === 'all'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
          )}
        >
          All Courses ({deadlines.length})
        </button>
        {courses.filter(c => !c.isArchived).map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCourseFilter(c.id)}
            className={cn(
              'px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0',
              selectedCourseFilter === c.id
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
            )}
          >
            {c.code || c.name}
          </button>
        ))}
      </div>

      {/* MODE 1: Sequential Vertical Timeline */}
      {viewMode === 'timeline' && (
        <div className="space-y-4 py-2">
          {sortedDeadlines.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
              <CalendarIcon className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No deadlines scheduled</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">Add upcoming exams, midterms, or assignments to prioritize your review schedule.</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus size={14} /> Add First Deadline
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedDeadlines.map((deadline) => {
                const daysInfo = getDaysUntil(deadline.dueDate);
                const course = courses.find((c) => c.id === deadline.courseId);

                let badgeColor = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900';
                if (deadline.priority === 'high' || deadline.type === 'Exam' || deadline.type === 'Midterm') {
                  badgeColor = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900';
                } else if (deadline.priority === 'medium') {
                  badgeColor = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900';
                }

                return (
                  <div
                    key={deadline.id}
                    className={cn(
                      'p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs',
                      deadline.completed
                        ? 'opacity-60 border-slate-200 dark:border-slate-800'
                        : 'border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-800'
                    )}
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => onToggleComplete(deadline.id)}
                        className={cn(
                          'w-6 h-6 rounded-lg border flex items-center justify-center transition-colors mt-0.5 shrink-0 cursor-pointer',
                          deadline.completed
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 dark:border-slate-700 hover:border-purple-500'
                        )}
                        title={deadline.completed ? 'Mark incomplete' : 'Mark complete'}
                      >
                        {deadline.completed && <CheckCircle2 size={16} />}
                      </button>

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          <span className={cn('px-2 py-0.5 rounded-md font-bold text-[10px] uppercase border', badgeColor)}>
                            {deadline.type}
                          </span>
                          <span className="font-bold text-purple-600 dark:text-purple-400">
                            {deadline.courseCode}
                          </span>
                          <span className="text-slate-300 dark:text-slate-700">·</span>
                          <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                            <Clock size={12} /> {formatDate(deadline.dueDate)}
                          </span>
                          <span className={cn(
                            'font-bold text-[11px]',
                            daysInfo.isPast ? 'text-slate-400' : daysInfo.days <= 3 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300'
                          )}>
                            ({daysInfo.text})
                          </span>
                        </div>

                        <h4 className={cn(
                          'text-sm font-bold text-slate-900 dark:text-slate-100 break-words',
                          deadline.completed && 'line-through text-slate-400'
                        )}>
                          {deadline.title}
                        </h4>

                        {deadline.recommendedAction && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {deadline.recommendedAction}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {course && (
                        <button
                          type="button"
                          onClick={() => onNavigateToCourse(course.id)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 cursor-pointer"
                        >
                          <span>Open Course</span>
                          <ArrowRight size={13} />
                        </button>
                      )}

                      {onDeleteDeadline && (
                        <button
                          type="button"
                          onClick={() => onDeleteDeadline(deadline.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors rounded-lg cursor-pointer"
                          title="Delete deadline"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODE 2: Interactive Monthly Calendar Grid */}
      {viewMode === 'calendar' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-4">
          {/* Calendar Header with Month Navigation */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <CalendarDays className="text-purple-600 dark:text-purple-400" size={20} />
                <span>{monthNames[calMonth]} {calYear}</span>
              </h3>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setCalYear(now.getFullYear());
                  setCalMonth(now.getMonth());
                }}
                className="px-2.5 py-1 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                title="Next Month"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[10px] sm:text-xs font-bold text-slate-400 uppercase py-1">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Calendar Day Cells */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {/* Blank offset for starting day */}
            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="min-h-16 sm:min-h-24 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/40 p-1 sm:p-2 opacity-30"
              />
            ))}

            {/* Days in Month */}
            {Array.from({ length: daysInCurrentMonth }).map((_, i) => {
              const dayNum = i + 1;
              const formattedMonth = (calMonth + 1) < 10 ? `0${calMonth + 1}` : `${calMonth + 1}`;
              const formattedDay = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
              const dateStr = `${calYear}-${formattedMonth}-${formattedDay}`;
              const dayDeadlines = filteredDeadlines.filter((d) => d.dueDate === dateStr);
              
              const now = new Date();
              const isToday = now.getFullYear() === calYear && now.getMonth() === calMonth && now.getDate() === dayNum;

              return (
                <div
                  key={dayNum}
                  className={cn(
                    'min-h-16 sm:min-h-24 rounded-2xl border p-1.5 sm:p-2 flex flex-col justify-between transition-all text-xs',
                    isToday
                      ? 'border-purple-500 bg-purple-50/40 dark:bg-purple-950/20'
                      : dayDeadlines.length > 0
                      ? 'border-purple-200 dark:border-purple-900/50 bg-white dark:bg-slate-900 shadow-2xs'
                      : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] sm:text-[11px]',
                        isToday
                          ? 'bg-purple-600 text-white'
                          : 'text-slate-700 dark:text-slate-300'
                      )}
                    >
                      {dayNum}
                    </span>
                    {dayDeadlines.length > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-600 dark:bg-purple-400" />
                    )}
                  </div>

                  <div className="space-y-1 mt-1 overflow-y-auto max-h-14 sm:max-h-16">
                    {dayDeadlines.map((dl) => (
                      <div
                        key={dl.id}
                        className={cn(
                          'p-1 rounded text-[9px] sm:text-[10px] font-bold leading-tight truncate',
                          dl.priority === 'high' || dl.type === 'Exam'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            : dl.priority === 'medium'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                        )}
                        title={`${dl.courseCode}: ${dl.title} (${dl.type})`}
                      >
                        {dl.courseCode} · {dl.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Deadline Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-purple-50/50 dark:bg-purple-950/20">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Add Class Deadline / Exam
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Class / Course
                </label>
                <select
                  value={newCourseId}
                  onChange={(e) => setNewCourseId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                >
                  {courses.filter(c => !c.isArchived).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code || c.name} - {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Midterm 2, Final Exam, Lab 4"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Type
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Exam">Exam</option>
                    <option value="Midterm">Midterm</option>
                    <option value="Assignment">Assignment</option>
                    <option value="Project">Project</option>
                    <option value="Lab">Lab</option>
                    <option value="Presentation">Presentation</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Priority
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'medium', 'high'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewPriority(p)}
                      className={cn(
                        'py-2 text-xs font-bold rounded-xl border uppercase transition-colors cursor-pointer',
                        newPriority === p
                          ? p === 'high' ? 'bg-rose-50 border-rose-500 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300' : 'bg-purple-50 border-purple-500 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-600/20 cursor-pointer"
                >
                  Add to Calendar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
