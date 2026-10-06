import React, { useState } from 'react';
import { Course, TopicMastery } from '../types';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  BarChart3,
  Flame,
  Star,
  Target,
  Sparkles,
  ArrowRight,
  Info,
  HelpCircle
} from 'lucide-react';
import { cn } from '../lib/utils';

interface MasteryViewProps {
  course: Course;
  onOpenConfused?: (title: string, snippet?: string) => void;
  onNavigateToTopic?: (topicName: string) => void;
}

export default function MasteryView({
  course,
  onOpenConfused,
  onNavigateToTopic
}: MasteryViewProps) {
  const masteryItems = course.mastery;
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  const totalTopics = masteryItems.length;
  const masteredCount = masteryItems.filter(m => m.status === 'Mastered').length;
  const learningCount = masteryItems.filter(m => m.status === 'Learning' || m.status === 'Nearly mastered').length;
  const reviewCount = masteryItems.filter(m => m.status === 'Needs review').length;
  const notStartedCount = masteryItems.filter(m => m.status === 'Not started').length;

  // Compute honest average (excluding topics with not enough information)
  const evaluatedTopics = masteryItems.filter(m => m.overallScore !== null);
  const averageMastery = evaluatedTopics.length > 0
    ? Math.round(evaluatedTopics.reduce((acc, m) => acc + (m.overallScore || 0), 0) / evaluatedTopics.length)
    : null;

  const filteredItems = masteryItems.filter(m => {
    if (selectedStatusFilter === 'all') return true;
    return m.status.toLowerCase().replace(' ', '_') === selectedStatusFilter;
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Empty State (Section 15 Requirement) */}
      {totalTopics === 0 ? (
        <div className="text-center py-20 px-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-white/50 dark:bg-slate-900/50 space-y-4 max-w-xl mx-auto">
          <div className="w-14 h-14 rounded-3xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto shadow-2xs">
            <BarChart3 size={26} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              No mastery information yet.
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              Complete a few flashcards or practice questions to begin measuring your understanding with honest, evidence-based metrics.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Top Honest Overview Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Overall Course Mastery */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Overall Course Mastery
                </span>
                <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                  {averageMastery !== null ? `${averageMastery}%` : 'Evaluating'}
                </div>
                <span className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                  {evaluatedTopics.length} of {totalTopics} topics evaluated
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                <BarChart3 size={24} />
              </div>
            </div>

            {/* Mastered */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Mastered Topics
                </span>
                <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                  {masteredCount} <span className="text-xs font-normal text-slate-400">/ {totalTopics}</span>
                </div>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  High exam retention
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={24} />
              </div>
            </div>

            {/* Learning / In Progress */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Learning & Nearly Mastered
                </span>
                <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                  {learningCount}
                </div>
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                  Active study queue
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                <Clock size={24} />
              </div>
            </div>

            {/* Needs Review */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Needs Review
                </span>
                <div className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
                  {reviewCount}
                </div>
                <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                  Review priority
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                <AlertCircle size={24} />
              </div>
            </div>
          </div>

          {/* Detailed Evidence-Based Topic Cards */}
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <Target size={16} />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                    Evidence-Based Mastery Calibration
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  Topic Understanding & Actionable Next Steps
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Mastery separates practice performance, coverage, and self-confidence. Scores are only calculated when sufficient activity exists.
                </p>
              </div>

              {/* Status filter buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'mastered', label: 'Mastered' },
                  { id: 'learning', label: 'Learning' },
                  { id: 'needs_review', label: 'Needs Review' },
                  { id: 'not_started', label: 'Not Started' }
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStatusFilter(s.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors cursor-pointer',
                      selectedStatusFilter === s.id
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Topic Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredItems.map(topic => {
                const hasScore = topic.overallScore !== null;

                let statusBadge = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
                if (topic.status === 'Mastered') {
                  statusBadge = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';
                } else if (topic.status === 'Learning' || topic.status === 'Nearly mastered') {
                  statusBadge = 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300';
                } else if (topic.status === 'Needs review') {
                  statusBadge = 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300';
                }

                return (
                  <div
                    key={topic.id}
                    className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 hover:border-purple-300 dark:hover:border-purple-900/60 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div>
                      {/* Top Unit & Status Badge */}
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="text-[11px] font-semibold text-slate-400">
                          {topic.unit}
                        </span>
                        <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-md', statusBadge)}>
                          {topic.status}
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {topic.name}
                      </h4>

                      {/* Overall Mastery Percentage or "Not enough information yet" */}
                      <div className="mt-3 space-y-1.5">
                        <div className="flex justify-between items-baseline text-xs font-semibold">
                          <span className="text-slate-500 dark:text-slate-400">Overall Mastery:</span>
                          {hasScore ? (
                            <span className="text-slate-900 dark:text-slate-100 text-sm font-bold">
                              {topic.overallScore}%
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs font-medium italic">
                              Not enough information yet
                            </span>
                          )}
                        </div>

                        {hasScore ? (
                          <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all duration-500',
                                topic.overallScore! >= 75 ? 'bg-emerald-500' : topic.overallScore! >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                              )}
                              style={{ width: `${topic.overallScore}%` }}
                            />
                          </div>
                        ) : (
                          <div className="h-2 w-full bg-slate-200/50 dark:bg-slate-800 rounded-full" />
                        )}
                      </div>

                      {/* 4 Discrete Measurements (Section 11 Requirement) */}
                      <div className="mt-4 grid grid-cols-3 gap-2 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">Performance</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {topic.performanceScore !== null ? `${topic.performanceScore}%` : '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">Coverage</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {topic.coverageScore}%
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">Confidence</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-0.5">
                            {topic.selfConfidenceScore}/5 <Star size={11} className="text-amber-400 fill-amber-400" />
                          </span>
                        </div>
                      </div>

                      {/* Evidence Summary String (Section 11) */}
                      <div className="mt-3 flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <Info size={14} className="shrink-0 text-slate-400 mt-0.5" />
                        <p className="leading-relaxed text-[11px]">{topic.evidenceSummary}</p>
                      </div>
                    </div>

                    {/* Specific Actionable Recommendation (Section 11) */}
                    <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800/80 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block">
                        Recommended Next Action:
                      </span>
                      <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                        {topic.recommendedAction}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
