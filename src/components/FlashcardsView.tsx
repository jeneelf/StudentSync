import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Course, Flashcard } from '../types';
import { renderFormattedMath } from '../lib/mathUtils';
import {
  RotateCcw,
  Plus,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Star,
  Shuffle,
  Filter,
  Eye,
  BookOpen,
  Edit3,
  Flag,
  Keyboard,
  ArrowRight,
  X,
  Volume2
} from 'lucide-react';
import { cn } from '../lib/utils';

interface FlashcardsViewProps {
  course: Course;
  onAddFlashcard: (newCard: Flashcard) => void;
  onUpdateFlashcard: (updatedCard: Flashcard) => void;
  onOpenConfused: (title: string, snippet?: string) => void;
  onOpenUpload?: () => void;
}

export default function FlashcardsView({
  course,
  onAddFlashcard,
  onUpdateFlashcard,
  onOpenConfused,
  onOpenUpload
}: FlashcardsViewProps) {
  const allCards = course.flashcards;

  // Deck filtering & controls
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [studyWeakOnly, setStudyWeakOnly] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  
  // Interactive Type-Answer mode
  const [typeAnswerMode, setTypeAnswerMode] = useState(false);
  const [userTypedAnswer, setUserTypedAnswer] = useState('');
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  
  // Modals & feedback
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [editFront, setEditFront] = useState('');
  const [editBack, setEditBack] = useState('');
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // New card form state
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [newTopicTag, setNewTopicTag] = useState('');

  // Generate More Flashcards state (Requirement 7)
  const [showGenerateMoreModal, setShowGenerateMoreModal] = useState(false);
  const [numCards, setNumCards] = useState<number>(5);
  const [sourceScope, setSourceScope] = useState<string>('all');
  const [cardFocus, setCardFocus] = useState<string>('mixed');
  const [cardDifficulty, setCardDifficulty] = useState<string>('mixed');
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);
  const [generationProgressText, setGenerationProgressText] = useState('');

  const cardRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  const handleGenerateMore = async (e: React.FormEvent) => {
    e.preventDefault();
    const relevantSources = course.sources.filter(s => s.sourceType !== 'syllabus');
    const rawText = relevantSources.map(s => s.content).join('\n\n');

    if (!rawText || rawText.trim().length < 10) {
      alert("No processed course material sources found to generate flashcards from. Please upload course notes or lecture slides first.");
      return;
    }

    setIsGeneratingMore(true);
    setGenerationProgressText(`Generating and checking ${numCards} additional flashcards...`);

    try {
      const res = await fetch('/api/gemini/generate-more-flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText,
          existingCards: allCards,
          count: numCards,
          focus: cardFocus,
          difficulty: cardDifficulty,
          courseName: course.name
        })
      });

      if (!res.ok) throw new Error("Failed to generate more flashcards");
      const json = await res.json();

      if (json.flashcards && json.flashcards.length > 0) {
        let addedCount = 0;
        json.flashcards.forEach((c: any, idx: number) => {
          onAddFlashcard({
            id: `fc-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
            sourceId: relevantSources[0]?.id || `src-${Date.now()}`,
            topicTag: c.topicTag || (selectedTopic !== 'all' ? selectedTopic : 'Core Topic'),
            front: c.front,
            back: c.back,
            explanation: c.explanation,
            citation: c.citation || { sourceTitle: relevantSources[0]?.title || 'Course Material', sourceType: 'lecture_slides', referenceDetail: 'Generated' },
            attemptsCount: 0,
            correctCount: 0,
            history: [],
            masteryStatus: 'needs_review'
          });
          addedCount++;
        });

        showToast(`Successfully added ${addedCount} brand new, non-duplicate flashcards!`);
      } else {
        showToast("No new, non-duplicate flashcards could be generated from the selected sources.");
      }
      setShowGenerateMoreModal(false);
    } catch (err) {
      console.error(err);
      alert("Failed to generate additional flashcards. Please retry.");
    } finally {
      setIsGeneratingMore(false);
    }
  };

  // Filtered Deck
  const filteredCards = allCards.filter(c => {
    const matchesTopic = selectedTopic === 'all' || c.topicTag === selectedTopic;
    const matchesWeak = !studyWeakOnly || c.masteryStatus === 'needs_review';
    return matchesTopic && matchesWeak;
  });

  const currentCard = filteredCards[currentIndex];

  const handleNext = useCallback(() => {
    if (filteredCards.length === 0) return;
    setIsFlipped(false);
    setUserTypedAnswer('');
    setAnswerSubmitted(false);
    setCurrentIndex(prev => (prev + 1) % filteredCards.length);
  }, [filteredCards.length]);

  const handlePrev = useCallback(() => {
    if (filteredCards.length === 0) return;
    setIsFlipped(false);
    setUserTypedAnswer('');
    setAnswerSubmitted(false);
    setCurrentIndex(prev => (prev - 1 + filteredCards.length) % filteredCards.length);
  }, [filteredCards.length]);

  const toggleFlip = useCallback(() => {
    setIsFlipped(prev => !prev);
  }, []);

  // Spacebar to flip card & Arrow keys to navigate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If modal is open, do not handle hotkeys
      if (showAddModal || editingCard) return;

      const target = e.target as HTMLElement | null;
      const isInput = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        Boolean(target.closest('input')) ||
        Boolean(target.closest('textarea'))
      );

      if (isInput) return;

      const isSpace = e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar' || e.keyCode === 32;

      if (isSpace) {
        e.preventDefault();
        e.stopPropagation();
        if (target && target.tagName === 'BUTTON') {
          target.blur();
        }
        toggleFlip();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [handleNext, handlePrev, toggleFlip, showAddModal, editingCard]);

  const handleShuffle = () => {
    if (filteredCards.length > 1) {
      const nextIdx = Math.floor(Math.random() * filteredCards.length);
      setCurrentIndex(nextIdx);
      setIsFlipped(false);
      setUserTypedAnswer('');
      setAnswerSubmitted(false);
      showToast('Deck shuffled');
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setUserTypedAnswer('');
    setAnswerSubmitted(false);
    showToast('Deck restarted from card 1');
  };

  const handleToggleStar = (card: Flashcard) => {
    const updated: Flashcard = { ...card, isStarred: !card.isStarred };
    onUpdateFlashcard(updated);
    showToast(updated.isStarred ? 'Card starred for review' : 'Star removed');
  };

  // Performance-based rating handler ("I forgot", "Almost", "I knew it")
  const handleRating = (rating: 'forgot' | 'almost' | 'knew_it') => {
    if (!currentCard) return;

    const newAttempts = (currentCard.attemptsCount || 0) + 1;
    const newCorrect = (currentCard.correctCount || 0) + (rating === 'knew_it' ? 1 : 0);
    const accuracy = newCorrect / newAttempts;

    // Multi-factor mastery status based on repeated performance & accuracy
    let newStatus: Flashcard['masteryStatus'] = 'learning';
    if (rating === 'forgot') {
      newStatus = 'needs_review';
    } else if (rating === 'almost') {
      newStatus = 'learning';
    } else if (rating === 'knew_it') {
      if (newAttempts >= 2 && accuracy >= 0.7) {
        newStatus = 'mastered';
      } else {
        newStatus = 'learning';
      }
    }

    const updatedCard: Flashcard = {
      ...currentCard,
      attemptsCount: newAttempts,
      correctCount: newCorrect,
      lastReviewedAt: new Date().toISOString().split('T')[0],
      masteryStatus: newStatus,
      history: [
        ...(currentCard.history || []),
        { reviewedAt: new Date().toISOString().split('T')[0], rating }
      ]
    };

    onUpdateFlashcard(updatedCard);
    handleNext();
  };

  const handleSaveEdit = () => {
    if (!editingCard) return;
    const updated: Flashcard = {
      ...editingCard,
      front: editFront.trim() || editingCard.front,
      back: editBack.trim() || editingCard.back
    };
    onUpdateFlashcard(updated);
    setEditingCard(null);
    showToast('Card updated');
  };

  const handleAddNewCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFront.trim() || !newBack.trim()) return;

    const created: Flashcard = {
      id: `fc-${Date.now()}`,
      topicTag: newTopicTag.trim() || 'Custom Card',
      front: newFront.trim(),
      back: newBack.trim(),
      attemptsCount: 0,
      correctCount: 0,
      history: [],
      masteryStatus: 'needs_review'
    };

    onAddFlashcard(created);
    setNewFront('');
    setNewBack('');
    setNewTopicTag('');
    setShowAddModal(false);
    showToast('Flashcard created');
  };

  const allTopicTags = Array.from(new Set(allCards.map(c => c.topicTag).filter(Boolean)));

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto px-1 sm:px-0">
      {/* Toast Feedback */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-2 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={15} className="text-emerald-400" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Main Study Container */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-7 shadow-xs space-y-6">
        {/* Deck Header and Controls */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block">
                Active Recall Deck
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 break-words">
                {course.code || course.name} Flashcards
              </h3>
            </div>

            {/* Deck action buttons */}
            <div className="flex items-center gap-1.5 flex-wrap self-stretch sm:self-auto justify-between sm:justify-start">
              <button
                type="button"
                onClick={() => setTypeAnswerMode(!typeAnswerMode)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer',
                  typeAnswerMode
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                )}
                title="Type an answer before revealing"
              >
                <Keyboard size={14} />
                <span>Type Answer</span>
              </button>

              <button
                type="button"
                onClick={handleShuffle}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
                title="Shuffle deck"
              >
                <Shuffle size={14} />
              </button>

              <button
                type="button"
                onClick={handleRestart}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
                title="Restart deck"
              >
                <RotateCcw size={14} />
              </button>

              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors cursor-pointer"
              >
                <Plus size={14} /> Add Card Manually
              </button>

              <button
                type="button"
                onClick={() => setShowGenerateMoreModal(true)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <Sparkles size={14} /> Generate More Flashcards
              </button>
            </div>
          </div>

          {/* Flashcard Generation Metrics Info Card */}
          <div className="p-3.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-900/40 space-y-1.5 text-xs text-purple-900 dark:text-purple-200">
            <div className="flex items-center gap-2 font-bold text-xs">
              <Sparkles size={14} className="text-purple-600 shrink-0" />
              <span>How Flashcards Are Generated</span>
            </div>
            <p className="text-[11px] leading-relaxed text-purple-800 dark:text-purple-300">
              Flashcards are automatically constructed from key axioms, formal definitions, and formula rules detected in your uploaded course materials. As you upload new notes, slides, or chapters, additional flashcards are synthesized for high-yield topics.
            </p>
          </div>

          {/* Filter by topic & Weak cards only filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                <Filter size={12} /> Topic:
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedTopic('all');
                  setCurrentIndex(0);
                  setIsFlipped(false);
                }}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors shrink-0 cursor-pointer',
                  selectedTopic === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
              >
                All ({allCards.length})
              </button>
              {allTopicTags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setSelectedTopic(tag);
                    setCurrentIndex(0);
                    setIsFlipped(false);
                  }}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors shrink-0 cursor-pointer',
                    selectedTopic === tag
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  #{tag}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={studyWeakOnly}
                onChange={(e) => {
                  setStudyWeakOnly(e.target.checked);
                  setCurrentIndex(0);
                  setIsFlipped(false);
                }}
                className="rounded text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
              />
              <span className="font-semibold">Weak Cards Only</span>
            </label>
          </div>
        </div>

        {/* Flashcard Active Area */}
        {filteredCards.length === 0 ? (
          <div className="text-center py-16 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-500">
            No flashcards matching the current filter. Try selecting "All" topics or disable "Weak Cards Only".
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-4 w-full">
            {/* Meta row */}
            <div className="w-full max-w-xl flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 px-2">
              <span>Card {currentIndex + 1} of {filteredCards.length}</span>
              <span className="text-purple-600 dark:text-purple-400 font-bold truncate max-w-[150px]">
                #{currentCard.topicTag}
              </span>
              <div className="flex items-center gap-2">
                <span className={cn(
                  'px-2 py-0.5 rounded-md text-[10px] font-bold uppercase',
                  (currentCard.masteryStatus || 'learning') === 'mastered'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : (currentCard.masteryStatus || 'learning') === 'learning'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                )}>
                  {(currentCard.masteryStatus || 'learning').replace('_', ' ')}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleStar(currentCard)}
                  className={cn('p-1 rounded-lg transition-colors cursor-pointer', currentCard.isStarred ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600 hover:text-amber-500')}
                  title={currentCard.isStarred ? 'Starred card' : 'Star this card'}
                >
                  <Star size={16} fill={currentCard.isStarred ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>

            {/* 3D Flip Card */}
            <div
              ref={cardRef}
              tabIndex={0}
              onClick={toggleFlip}
              className="relative w-full max-w-xl min-h-[280px] sm:h-80 perspective-1000 cursor-pointer select-none group focus:outline-hidden"
            >
              <div
                className="w-full h-full duration-500 transform-style-3d relative rounded-3xl transition-transform"
                style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
              >
                {/* Front */}
                <div className="absolute inset-0 w-full h-full backface-hidden bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 group-hover:border-purple-400 dark:group-hover:border-purple-500/50 rounded-3xl shadow-md p-6 sm:p-8 flex flex-col justify-between transition-colors">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles size={14} /> Active Recall Prompt
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-500">
                      Spacebar or click to flip
                    </span>
                  </div>

                  <div className="my-auto py-4 text-base sm:text-lg font-medium text-slate-900 dark:text-slate-100 text-center leading-relaxed">
                    {renderFormattedMath(currentCard.front)}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <span>Attempts: {currentCard.attemptsCount || 0}</span>
                    <span className="text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1">
                      Reveal Solution <ArrowRight size={12} />
                    </span>
                  </div>
                </div>

                {/* Back */}
                <div
                  className="absolute inset-0 w-full h-full backface-hidden bg-purple-50/90 dark:bg-slate-900 border-2 border-purple-500/80 rounded-3xl shadow-md p-6 sm:p-8 flex flex-col justify-between"
                  style={{ transform: 'rotateY(180deg)' }}
                >
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 size={14} /> Solution / Explanation
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-[11px] font-semibold text-purple-700 dark:text-purple-300">
                      Spacebar to flip back
                    </span>
                  </div>

                  <div className="my-auto py-4 text-sm sm:text-base font-normal text-slate-900 dark:text-slate-100 leading-relaxed text-center overflow-y-auto max-h-40">
                    {renderFormattedMath(currentCard.back)}
                  </div>

                  {/* Card citation / source info */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 border-t border-purple-200/60 dark:border-slate-800 pt-3">
                    <span className="truncate max-w-[250px]">
                      Source: {currentCard.citation?.sourceTitle || course.name}
                    </span>
                    <span className="font-semibold text-purple-600 dark:text-purple-400">
                      Rate below to record mastery
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Type Answer Mode Box */}
            {typeAnswerMode && (
              <div className="w-full max-w-xl p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    Type your answer before flipping:
                  </span>
                  {answerSubmitted && (
                    <span className="text-purple-600 font-semibold text-[11px]">
                      Comparing with solution
                    </span>
                  )}
                </div>

                <textarea
                  rows={2}
                  value={userTypedAnswer}
                  onChange={(e) => setUserTypedAnswer(e.target.value)}
                  placeholder="Type your explanation, formula, or proof..."
                  className="w-full p-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-purple-500 resize-none"
                />

                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAnswerSubmitted(true);
                      setIsFlipped(true);
                    }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
                  >
                    Submit & Flip
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUserTypedAnswer('');
                      setAnswerSubmitted(false);
                    }}
                    className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {/* Rating Buttons ("I forgot", "Almost", "I knew it") */}
            <div className="w-full max-w-xl space-y-2 pt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block text-center">
                How well did you know this?
              </span>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleRating('forgot')}
                  className="p-3 rounded-2xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300 font-bold text-xs flex flex-col items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  <span>I forgot</span>
                  <span className="text-[10px] font-normal opacity-80">Needs review</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRating('almost')}
                  className="p-3 rounded-2xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300 font-bold text-xs flex flex-col items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  <span>Almost</span>
                  <span className="text-[10px] font-normal opacity-80">Still learning</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRating('knew_it')}
                  className="p-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300 font-bold text-xs flex flex-col items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  <span>I knew it</span>
                  <span className="text-[10px] font-normal opacity-80">Mastered</span>
                </button>
              </div>
            </div>

            {/* Navigation and Extra Card Controls */}
            <div className="w-full max-w-xl flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <button
                type="button"
                onClick={handlePrev}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <ChevronLeft size={16} /> Prev
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenConfused(currentCard.front, `Flashcard for ${currentCard.topicTag}: ${currentCard.back}`)}
                  className="px-3 py-1.5 rounded-xl text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 font-bold flex items-center gap-1 cursor-pointer"
                  title="Ask for a simpler breakdown"
                >
                  <HelpCircle size={14} /> I’m Confused
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingCard(currentCard);
                    setEditFront(currentCard.front);
                    setEditBack(currentCard.back);
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  title="Edit flashcard"
                >
                  <Edit3 size={15} />
                </button>
              </div>

              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Flashcard Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-purple-50/50 dark:bg-purple-950/20">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Create Flashcard
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddNewCard} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Topic Tag
                </label>
                <input
                  type="text"
                  value={newTopicTag}
                  onChange={(e) => setNewTopicTag(e.target.value)}
                  placeholder="e.g. Eigenvalues, Invariants"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Front (Prompt / Question)
                </label>
                <textarea
                  rows={3}
                  required
                  value={newFront}
                  onChange={(e) => setNewFront(e.target.value)}
                  placeholder="What is the condition for..."
                  className="w-full p-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Back (Answer / Explanation)
                </label>
                <textarea
                  rows={3}
                  required
                  value={newBack}
                  onChange={(e) => setNewBack(e.target.value)}
                  placeholder="The determinant det(A - λI) must equal zero..."
                  className="w-full p-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
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
                  Create Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Flashcard Modal */}
      {editingCard && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-purple-50/50 dark:bg-purple-950/20">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Edit Flashcard
              </h3>
              <button
                onClick={() => setEditingCard(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Front Prompt
                </label>
                <textarea
                  rows={3}
                  value={editFront}
                  onChange={(e) => setEditFront(e.target.value)}
                  className="w-full p-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Back Solution
                </label>
                <textarea
                  rows={3}
                  value={editBack}
                  onChange={(e) => setEditBack(e.target.value)}
                  className="w-full p-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingCard(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-600/20 cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generate More Flashcards Modal (Requirement 7) */}
      {showGenerateMoreModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-purple-50/50 dark:bg-purple-950/20">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Sparkles size={16} className="text-purple-600" />
                <span>Generate More Flashcards</span>
              </h3>
              <button
                onClick={() => setShowGenerateMoreModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGenerateMore} className="p-6 space-y-4 text-xs">
              {isGeneratingMore ? (
                <div className="py-8 text-center space-y-3 animate-pulse">
                  <RotateCcw className="animate-spin text-purple-600 mx-auto" size={24} />
                  <p className="font-bold text-slate-700 dark:text-slate-200">{generationProgressText}</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      Number of Flashcards to Create
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[5, 10, 15, 20].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setNumCards(num)}
                          className={cn(
                            'py-2 rounded-xl border text-center font-bold transition-all cursor-pointer',
                            numCards === num
                              ? 'border-purple-600 bg-purple-50 text-purple-700 dark:bg-purple-950/30'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                          )}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      Source Scope
                    </label>
                    <select
                      value={sourceScope}
                      onChange={(e) => setSourceScope(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-hidden"
                    >
                      <option value="all">All Processed Course Materials</option>
                      {selectedTopic !== 'all' && <option value="topic">Topic: {selectedTopic}</option>}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      Card Focus Area
                    </label>
                    <select
                      value={cardFocus}
                      onChange={(e) => setCardFocus(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-hidden"
                    >
                      <option value="mixed">Mixed & Balanced Concepts</option>
                      <option value="definitions">Formal Definitions & Terms</option>
                      <option value="conceptual">Conceptual Deep-Dives</option>
                      <option value="comparisons">Direct Comparisons (e.g. BFS vs DFS)</option>
                      <option value="application">Application & Formula Problems</option>
                      <option value="common_mistakes">Common Mistakes & Misconceptions</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      Difficulty Level
                    </label>
                    <select
                      value={cardDifficulty}
                      onChange={(e) => setCardDifficulty(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-hidden"
                    >
                      <option value="mixed">Mixed</option>
                      <option value="easy">Easy (Foundational Recall)</option>
                      <option value="medium">Medium (Analytical)</option>
                      <option value="hard">Hard (Advanced / Complex Trace)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowGenerateMoreModal(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md shadow-purple-600/20 cursor-pointer"
                    >
                      Begin Generation
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
