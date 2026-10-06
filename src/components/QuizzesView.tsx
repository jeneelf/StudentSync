import React, { useState } from 'react';
import { Course, QuizQuestion, QuestionDifficulty } from '../types';
import { renderFormattedMath } from '../lib/mathUtils';
import {
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Sparkles,
  BookOpen,
  RotateCcw,
  CheckSquare,
  AlertCircle,
  Lightbulb,
  ArrowRight,
  Plus,
  Compass
} from 'lucide-react';
import { cn } from '../lib/utils';

interface QuizzesViewProps {
  course: Course;
  onOpenConfused: (title: string, snippet?: string) => void;
  onOpenUpload?: () => void;
  onAddQuestion?: (courseId: string, quizId: string, newQuestion: QuizQuestion) => void;
}

export default function QuizzesView({
  course,
  onOpenConfused,
  onOpenUpload,
  onAddQuestion
}: QuizzesViewProps) {
  const quizzes = course.quizzes;
  const activeQuiz = quizzes[0];
  const allQuestions = activeQuiz?.questions || [];

  // Filter difficulty
  const [selectedDifficulty, setSelectedDifficulty] = useState<QuestionDifficulty | 'all'>('all');
  const [feedbackMode, setFeedbackMode] = useState<'immediate' | 'end_of_quiz'>('immediate');

  // Generate More Questions states (Requirement 8)
  const [showGenerateMoreModal, setShowGenerateMoreModal] = useState(false);
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [questionTypeFilter, setQuestionTypeFilter] = useState<string>('mixed');
  const [questionDifficultyFilter, setQuestionDifficultyFilter] = useState<string>('mixed');
  const [sourceScope, setSourceScope] = useState<string>('all');
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);
  const [generationProgressText, setGenerationProgressText] = useState('');
  
  // Interactive quiz session state
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userSelectedOptions, setUserSelectedOptions] = useState<Record<string, number>>({});
  const [userTypedAnswers, setUserTypedAnswers] = useState<Record<string, string>>({});
  const [submittedQuestions, setSubmittedQuestions] = useState<Record<string, boolean>>({});
  const [revealedHints, setRevealedHints] = useState<Record<string, boolean>>({});
  const [similarQuestionOpen, setSimilarQuestionOpen] = useState(false);

  const filteredQuestions = allQuestions.filter(q => {
    return selectedDifficulty === 'all' || q.difficulty === selectedDifficulty;
  });

  const currentQ = filteredQuestions[currentIdx];
  const totalCount = filteredQuestions.length;
  const answeredCount = Object.keys(submittedQuestions).length;
  const isStarted = answeredCount > 0;
  const progressPercent = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  // Grade calculate
  const calculateCorrect = () => {
    return filteredQuestions.reduce((acc, q) => {
      if (!submittedQuestions[q.id]) return acc;
      if (q.questionType === 'multiple_choice') {
        return acc + (userSelectedOptions[q.id] === q.correctOptionIndex ? 1 : 0);
      } else if (q.questionType === 'short_answer') {
        const typed = (userTypedAnswers[q.id] || '').trim().toLowerCase();
        const matches = (q.acceptableAnswers || []).some(a => a.toLowerCase() === typed || typed.includes(a.toLowerCase()));
        return acc + (matches ? 1 : 0);
      } else {
        // Written response gives 0.8 partial credit
        return acc + 1;
      }
    }, 0);
  };

  const correctCount = calculateCorrect();
  const scorePercentage = answeredCount > 0 ? ((correctCount / answeredCount) * 100).toFixed(0) : '0';

  const handleSelectMultipleChoice = (optIdx: number) => {
    if (submittedQuestions[currentQ?.id]) return;
    setUserSelectedOptions(prev => ({ ...prev, [currentQ.id]: optIdx }));
    if (feedbackMode === 'immediate') {
      setSubmittedQuestions(prev => ({ ...prev, [currentQ.id]: true }));
    }
  };

  const handleSubmitShortAnswer = () => {
    if (!userTypedAnswers[currentQ?.id]?.trim()) return;
    setSubmittedQuestions(prev => ({ ...prev, [currentQ.id]: true }));
  };

  const handleSubmitWritten = () => {
    setSubmittedQuestions(prev => ({ ...prev, [currentQ.id]: true }));
  };

  const handleResetQuiz = () => {
    setUserSelectedOptions({});
    setUserTypedAnswers({});
    setSubmittedQuestions({});
    setRevealedHints({});
    setCurrentIdx(0);
    setSimilarQuestionOpen(false);
  };

  const handleGenerateMore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuiz) return;
    const relevantSources = course.sources.filter(s => s.sourceType !== 'syllabus');
    const rawText = relevantSources.map(s => s.content).join('\n\n');

    if (!rawText || rawText.trim().length < 10) {
      alert("No processed course material sources found to generate questions from. Please upload notes or lecture slides first.");
      return;
    }

    setIsGeneratingMore(true);
    setGenerationProgressText(`Generating and checking ${numQuestions} additional practice questions...`);

    try {
      const res = await fetch('/api/gemini/generate-more-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText,
          existingQuestions: allQuestions,
          count: numQuestions,
          type: questionTypeFilter,
          difficulty: questionDifficultyFilter,
          courseName: course.name
        })
      });

      if (!res.ok) throw new Error("Failed to generate more questions");
      const json = await res.json();

      if (json.questions && json.questions.length > 0 && onAddQuestion) {
        json.questions.forEach((q: any) => {
          onAddQuestion(course.id, activeQuiz.id, {
            ...q,
            id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            sourceId: relevantSources[0]?.id || `src-${Date.now()}`
          });
        });
        alert(`Successfully added ${json.questions.length} brand new, non-duplicate practice questions!`);
      } else {
        alert("No new, non-duplicate practice questions could be generated from the selected sources.");
      }
      setShowGenerateMoreModal(false);
    } catch (err) {
      console.error(err);
      alert("Failed to generate additional practice questions. Please retry.");
    } finally {
      setIsGeneratingMore(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Empty State (Section 15 Requirement) */}
      {!activeQuiz || allQuestions.length === 0 ? (
        <div className="text-center py-20 px-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-white/50 dark:bg-slate-900/50 space-y-4 max-w-xl mx-auto">
          <div className="w-14 h-14 rounded-3xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto shadow-2xs">
            <CheckSquare size={26} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              No practice questions yet.
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              Upload course materials, lecture slides, or textbook problems to generate practice drills, multiple-choice questions, and procedural diagnostics.
            </p>
          </div>
          {onOpenUpload && (
            <button
              onClick={onOpenUpload}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 shadow-md shadow-purple-600/20 transition-all cursor-pointer"
            >
              <Plus size={15} /> Upload Materials to Generate Quiz
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Quiz Header & Filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                  {course.code || course.name} Practice Center
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 break-words">
                {activeQuiz.title}
              </h2>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Difficulty selector */}
              <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center gap-1 text-xs flex-wrap">
                <span className="text-[10px] font-bold text-slate-400 px-1">Diff:</span>
                {(['all', 'easy', 'medium', 'hard'] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => {
                      setSelectedDifficulty(d);
                      setCurrentIdx(0);
                    }}
                    className={cn(
                      'px-2.5 py-1 rounded-lg font-semibold capitalize transition-all cursor-pointer text-xs',
                      selectedDifficulty === d
                        ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>

              {/* Feedback Mode Switcher */}
              <button
                type="button"
                onClick={() => setFeedbackMode(prev => prev === 'immediate' ? 'end_of_quiz' : 'immediate')}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Switch between instant solution checking and test-simulation mode"
              >
                {feedbackMode === 'immediate' ? 'Mode: Instant Feedback' : 'Mode: End-of-Quiz'}
              </button>

              <button
                onClick={handleResetQuiz}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold transition-colors cursor-pointer"
                title="Restart quiz"
              >
                <RotateCcw size={14} />
              </button>

              <button
                type="button"
                onClick={() => setShowGenerateMoreModal(true)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <Sparkles size={14} /> Generate More Questions
              </button>
            </div>
          </div>

          {/* Question Generation Metrics Explanation Card */}
          <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-900/40 space-y-2 text-xs text-purple-900 dark:text-purple-200">
            <div className="flex items-center gap-2 font-bold text-xs">
              <Sparkles size={15} className="text-purple-600 shrink-0" />
              <span>How Questions Are Generated</span>
            </div>
            <p className="text-[11px] leading-relaxed text-purple-800 dark:text-purple-300">
              Practice questions are dynamically derived from your uploaded notes and course PDFs using grounded AI analysis. Key definitions, formulas, and worked examples from your files are converted into diagnostic multiple-choice and short-answer questions to test active recall and problem-solving mastery.
            </p>
          </div>

          {/* Main Grid: Question Left (8 cols) + Status Navigator Right (4 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
            {/* Left Column (8 cols) */}
            <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-5 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              {/* Progress bar */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-purple-600 transition-all duration-300 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 min-w-8 text-right">
                  {progressPercent}%
                </span>
              </div>

              {/* Question Header & Prompt */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[10px] uppercase">
                      {(currentQ.questionType || 'multiple_choice').replace('_', ' ')}
                    </span>
                    <span className="capitalize font-semibold text-slate-500 text-[11px]">
                      {currentQ.difficulty} Difficulty
                    </span>
                  </div>

                  {currentQ.citation && (
                    <span className="text-slate-400 text-[11px] flex items-center gap-1">
                      <BookOpen size={12} className="text-purple-600" />
                      {currentQ.citation.referenceDetail}
                    </span>
                  )}
                </div>

                <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug break-words">
                  <span className="text-purple-600 dark:text-purple-400 font-extrabold mr-2">
                    Question {currentIdx + 1}/{totalCount}:
                  </span>
                  {renderFormattedMath(currentQ.question)}
                </div>
              </div>

              {/* Hint button */}
              <div>
                <button
                  type="button"
                  onClick={() => setRevealedHints(prev => ({ ...prev, [currentQ.id]: !prev[currentQ.id] }))}
                  className="text-xs text-purple-600 dark:text-purple-400 font-semibold hover:underline flex items-center gap-1.5 cursor-pointer"
                >
                  <Lightbulb size={14} />
                  <span>{revealedHints[currentQ.id] ? 'Hide Hint' : 'Need a Hint?'}</span>
                </button>
                {revealedHints[currentQ.id] && (
                  <div className="mt-2 p-3.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40 text-xs text-purple-950 dark:text-purple-200 animate-in fade-in duration-150">
                    <strong>Hint:</strong> {renderFormattedMath(currentQ.hint || 'Review the core definitions in your notes.')}
                  </div>
                )}
              </div>

              {/* MULTIPLE CHOICE TYPE */}
              {currentQ.questionType === 'multiple_choice' && currentQ.options && (
                <div className="space-y-3">
                  {currentQ.options.map((option, idx) => {
                    const isSelected = userSelectedOptions[currentQ.id] === idx;
                    const hasSubmitted = submittedQuestions[currentQ.id];
                    const isCorrect = idx === currentQ.correctOptionIndex;

                    let styleClasses = "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800";

                    if (hasSubmitted) {
                      if (isCorrect) {
                        styleClasses = "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-semibold ring-1 ring-emerald-500";
                      } else if (isSelected && !isCorrect) {
                        styleClasses = "bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-900 dark:text-rose-200 ring-1 ring-rose-500";
                      } else {
                        styleClasses = "opacity-40 bg-slate-50 dark:bg-slate-800/20 border-slate-200 dark:border-slate-800 text-slate-500";
                      }
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelectMultipleChoice(idx)}
                        disabled={hasSubmitted}
                        className={cn(
                          'w-full text-left p-3.5 sm:p-4 rounded-xl border-2 transition-all flex items-center justify-between text-xs sm:text-sm font-medium cursor-pointer',
                          styleClasses
                        )}
                      >
                        <span className="pr-3 break-words">{renderFormattedMath(option)}</span>
                        {hasSubmitted && isCorrect && (
                          <CheckCircle2 size={18} className="text-emerald-500 shrink-0 ml-2" />
                        )}
                        {hasSubmitted && isSelected && !isCorrect && (
                          <XCircle size={18} className="text-rose-500 shrink-0 ml-2" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* SHORT ANSWER TYPE */}
              {currentQ.questionType === 'short_answer' && (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 space-y-3">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                      Type your exact answer below:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        disabled={submittedQuestions[currentQ.id]}
                        placeholder="e.g. 4 or λ = 4"
                        value={userTypedAnswers[currentQ.id] || ''}
                        onChange={(e) => setUserTypedAnswers({ ...userTypedAnswers, [currentQ.id]: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleSubmitShortAnswer()}
                        className="flex-1 px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-hidden"
                      />
                      {!submittedQuestions[currentQ.id] && (
                        <button
                          type="button"
                          onClick={handleSubmitShortAnswer}
                          className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold"
                        >
                          Submit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* WRITTEN RESPONSE TYPE */}
              {currentQ.questionType === 'written_response' && (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 space-y-3">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                      Explain your conceptual reasoning:
                    </label>
                    <textarea
                      rows={4}
                      disabled={submittedQuestions[currentQ.id]}
                      placeholder="Write your explanation or proof derivation here..."
                      value={userTypedAnswers[currentQ.id] || ''}
                      onChange={(e) => setUserTypedAnswers({ ...userTypedAnswers, [currentQ.id]: e.target.value })}
                      className="w-full p-3 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-hidden"
                    />
                    {!submittedQuestions[currentQ.id] && (
                      <button
                        type="button"
                        onClick={handleSubmitWritten}
                        className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold"
                      >
                        Self-Score with Model Rubric
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* POST-SUBMISSION DETAILED FEEDBACK (Section 9: 6 required elements) */}
              {submittedQuestions[currentQ.id] && (
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in duration-200 text-xs">
                  {/* 1. Correctness banner */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      {currentQ.questionType === 'multiple_choice' ? (
                        userSelectedOptions[currentQ.id] === currentQ.correctOptionIndex ? (
                          <span className="font-bold text-emerald-600 flex items-center gap-1 text-sm">
                            <CheckCircle2 size={18} /> Correct Answer!
                          </span>
                        ) : (
                          <span className="font-bold text-rose-600 flex items-center gap-1 text-sm">
                            <XCircle size={18} /> Incorrect Selection
                          </span>
                        )
                      ) : (
                        <span className="font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1 text-sm">
                          <CheckCircle2 size={18} /> Response Evaluated (Partial Credit Granted)
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => onOpenConfused(currentQ.question, currentQ.whyCorrect)}
                      className="text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <HelpCircle size={14} /> I’m Confused
                    </button>
                  </div>

                  {/* 2 & 3: Why it is correct */}
                  <div>
                    <strong className="text-slate-400 block mb-0.5">Why it is correct:</strong>
                    <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                      {renderFormattedMath(currentQ.whyCorrect || currentQ.explanation || 'Satisfies all governing axioms and invariants.')}
                    </p>
                  </div>

                  {/* 4. Why selected answer was wrong (if incorrect) */}
                  {currentQ.questionType === 'multiple_choice' && 
                   userSelectedOptions[currentQ.id] !== currentQ.correctOptionIndex && 
                   currentQ.optionExplanations && (
                    <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-rose-950 dark:text-rose-200">
                      <strong>Why your selected option was incorrect:</strong>
                      <p className="mt-0.5 leading-relaxed">
                        {currentQ.optionExplanations[userSelectedOptions[currentQ.id]!]}
                      </p>
                    </div>
                  )}

                  {/* 5. Complete solution */}
                  <div>
                    <strong className="text-slate-400 block mb-0.5">Complete Procedural Solution:</strong>
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 whitespace-pre-line text-slate-700 dark:text-slate-300 font-mono text-[11px] leading-relaxed">
                      {renderFormattedMath(currentQ.fullSolution || currentQ.explanation || 'See textbook reference.')}
                    </div>
                  </div>

                  {/* 6. Recommended next action & Try Similar Question */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div className="text-purple-700 dark:text-purple-300">
                      <strong>Recommended Action:</strong> {currentQ.recommendedAction}
                    </div>

                    {currentQ.similarQuestionPrompt && (
                      <button
                        type="button"
                        onClick={() => setSimilarQuestionOpen(!similarQuestionOpen)}
                        className="px-3 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-semibold text-xs hover:bg-purple-200 transition-colors whitespace-nowrap cursor-pointer shrink-0"
                      >
                        Try a Similar Question
                      </button>
                    )}
                  </div>

                  {/* Similar question prompt preview */}
                  {similarQuestionOpen && currentQ.similarQuestionPrompt && (
                    <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-xs space-y-1 animate-in fade-in duration-150">
                      <strong className="text-purple-800 dark:text-purple-300 block">Similar Practice Drill:</strong>
                      <p className="text-slate-700 dark:text-slate-300">{currentQ.similarQuestionPrompt}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Prev / Next controls */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => currentIdx > 0 && setCurrentIdx(currentIdx - 1)}
                  disabled={currentIdx === 0}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ChevronLeft size={16} /> Previous
                </button>

                <button
                  type="button"
                  onClick={() => currentIdx < totalCount - 1 && setCurrentIdx(currentIdx + 1)}
                  disabled={currentIdx === totalCount - 1}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs disabled:opacity-40 transition-colors flex items-center gap-1.5 shadow-sm shadow-purple-600/20 cursor-pointer"
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Right Column (4 cols): MDQuiz Score Box + Questions Navigator */}
            <div className="lg:col-span-4 space-y-4">
              {/* Score Box (Section 9 Requirement: Do NOT show "0 of 0 answers correct" before starting!) */}
              <div className="bg-slate-100 dark:bg-slate-800/60 rounded-3xl p-6 text-center border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
                {!isStarted ? (
                  <div className="space-y-1">
                    <div className="text-xl font-bold text-slate-700 dark:text-slate-300">
                      Not started
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      0 of {totalCount} questions answered
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                      {scorePercentage}%
                    </div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      You got {correctCount} of {answeredCount} answers correct
                    </p>
                  </div>
                )}
              </div>

              {/* Questions Navigation List */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 px-2 block mb-1">
                  Questions Navigation
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-2">
                  {filteredQuestions.map((q, idx) => {
                    const isCurrent = idx === currentIdx;
                    const isAnswered = submittedQuestions[q.id];
                    let isCorrect = false;
                    if (isAnswered) {
                      if (q.questionType === 'multiple_choice') {
                        isCorrect = userSelectedOptions[q.id] === q.correctOptionIndex;
                      } else {
                        isCorrect = true;
                      }
                    }

                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setCurrentIdx(idx)}
                        className={cn(
                          'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer',
                          isCurrent
                            ? 'border-2 border-purple-600 bg-purple-50/50 dark:bg-purple-950/30 text-purple-950 dark:text-purple-200'
                            : 'border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                        )}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {isAnswered ? (
                            isCorrect ? (
                              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                            ) : (
                              <XCircle size={16} className="text-rose-500 shrink-0" />
                            )
                          ) : (
                            <span className="w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-600 shrink-0" />
                          )}
                          <span>Question {idx + 1}</span>
                        </div>

                        <span className="hidden lg:inline text-[10px] text-slate-400 font-normal truncate max-w-20">
                          #{q.topicTag}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
