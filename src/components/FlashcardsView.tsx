import React, { useState, useMemo, useEffect } from 'react';
import {
  Layers,
  RotateCw,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  Shuffle,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Cloud,
  ArrowRight,
  Check,
} from 'lucide-react';
import { FlashcardItem, UserProgressData, ExamDomain } from '../types';
import { FLASHCARDS_DECK, DOMAINS } from '../data/az900Data';

interface FlashcardsViewProps {
  progress: UserProgressData;
  onUpdateFlashcard: (cardId: string, status: 'know' | 'need-practice') => void;
  onOpenCoach: (conceptKey: string, conceptTitle: string) => void;
  initialFilter?: 'all' | 'missed' | 'need-practice' | 'mastered';
  initialConceptKey?: string;
}

export const FlashcardsView: React.FC<FlashcardsViewProps> = ({
  progress,
  onUpdateFlashcard,
  onOpenCoach,
  initialFilter = 'all',
  initialConceptKey,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'missed' | 'need-practice' | 'mastered'>(
    initialConceptKey ? 'missed' : initialFilter
  );
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [sessionCardsReviewed, setSessionCardsReviewed] = useState<number>(0);

  // Missed concept keys from user's quiz progress
  const missedConceptKeys = useMemo(
    () => new Set(Object.keys(progress.missedConcepts)),
    [progress.missedConcepts]
  );

  // Compute active deck based on filters
  const deck = useMemo(() => {
    let list = [...FLASHCARDS_DECK];

    // If navigated with a specific concept key
    if (initialConceptKey) {
      const specific = list.filter((c) => c.conceptKey === initialConceptKey);
      if (specific.length > 0) return specific;
    }

    if (filterMode === 'missed') {
      list = list.filter((c) => missedConceptKeys.has(c.conceptKey));
    } else if (filterMode === 'need-practice') {
      list = list.filter(
        (c) => progress.flashcardStates[c.id]?.status === 'need-practice'
      );
    } else if (filterMode === 'mastered') {
      list = list.filter(
        (c) => progress.flashcardStates[c.id]?.status === 'know'
      );
    }

    if (domainFilter !== 'all') {
      list = list.filter((c) => c.domain === domainFilter);
    }

    // Sort: prioritize cards with missed quiz concepts to the front
    list.sort((a, b) => {
      const aMissed = missedConceptKeys.has(a.conceptKey) ? 1 : 0;
      const bMissed = missedConceptKeys.has(b.conceptKey) ? 1 : 0;
      return bMissed - aMissed;
    });

    return list;
  }, [filterMode, domainFilter, progress.flashcardStates, missedConceptKeys, initialConceptKey]);

  // Reset index when deck changes
  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [filterMode, domainFilter]);

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleCardResponse('need-practice');
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleCardResponse('know');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, isFlipped, deck]);

  const currentCard: FlashcardItem | undefined = deck[currentIndex];
  const cardState = currentCard ? progress.flashcardStates[currentCard.id] : undefined;

  const handleCardResponse = (status: 'know' | 'need-practice') => {
    if (!currentCard) return;

    onUpdateFlashcard(currentCard.id, status);
    setSessionCardsReviewed((prev) => prev + 1);

    // Advance to next card
    if (currentIndex < deck.length - 1) {
      setIsFlipped(false);
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Reached end of filtered deck
      setIsFlipped(false);
    }
  };

  const handleShuffle = () => {
    deck.sort(() => 0.5 - Math.random());
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  // Stats counters
  const totalDeckCount = FLASHCARDS_DECK.length;
  const masteredCount = Object.values(progress.flashcardStates).filter((s) => s.status === 'know')
    .length;
  const needPracticeCount = Object.values(progress.flashcardStates).filter(
    (s) => s.status === 'need-practice'
  ).length;

  return (
    <div className="max-w-4xl mx-auto py-2 space-y-6">
      {/* Header & Filter Controls */}
      <div className="bg-[#0F223D]/90 border border-slate-700/80 p-5 rounded-2xl shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-950 border border-teal-800 text-teal-400 text-xs font-mono">
              <Layers className="w-3.5 h-3.5" />
              <span>Spaced Active Recall Deck</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Flashcard Coach
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm">
              Reinforce terminology, comparisons, and exam principles. Prioritizes concepts you
              missed in practice quizzes.
            </p>
          </div>

          {/* Quick Deck Stats */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="bg-teal-950/60 border border-teal-800/60 px-3 py-1.5 rounded-xl text-center">
              <div className="text-[10px] text-teal-400 font-mono">Mastered</div>
              <div className="text-sm font-bold text-teal-300 font-mono">{masteredCount}</div>
            </div>
            <div className="bg-amber-950/60 border border-amber-800/60 px-3 py-1.5 rounded-xl text-center">
              <div className="text-[10px] text-amber-400 font-mono">Need Practice</div>
              <div className="text-sm font-bold text-amber-300 font-mono">{needPracticeCount}</div>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterMode === 'all'
                  ? 'bg-sky-500 text-slate-950 font-semibold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              All Cards ({totalDeckCount})
            </button>

            <button
              onClick={() => setFilterMode('missed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                filterMode === 'missed'
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span>Missed in Quiz ({missedConceptKeys.size})</span>
            </button>

            <button
              onClick={() => setFilterMode('need-practice')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterMode === 'need-practice'
                  ? 'bg-rose-500 text-white font-semibold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Need Practice ({needPracticeCount})
            </button>

            <button
              onClick={() => setFilterMode('mastered')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterMode === 'mastered'
                  ? 'bg-teal-500 text-slate-950 font-semibold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Mastered ({masteredCount})
            </button>
          </div>

          <button
            onClick={handleShuffle}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-colors ml-auto sm:ml-0"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Shuffle</span>
          </button>
        </div>
      </div>

      {/* Main Flashcard Stage */}
      {deck.length === 0 ? (
        <div className="bg-[#0F223D]/80 border border-slate-700/80 rounded-2xl p-12 text-center space-y-4 shadow-xl">
          <CheckCircle2 className="w-12 h-12 text-teal-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">No Flashcards In This Filter</h3>
          <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto">
            {filterMode === 'missed'
              ? 'You have not missed any concepts recently, or you have already marked them as mastered! Great job.'
              : 'Try selecting "All Cards" to explore the full AZ-900 syllabus deck.'}
          </p>
          <button
            onClick={() => setFilterMode('all')}
            className="px-4 py-2 rounded-xl bg-sky-500 text-slate-950 font-semibold text-xs hover:bg-sky-400 transition-colors"
          >
            Switch to All Cards
          </button>
        </div>
      ) : currentCard ? (
        <div className="space-y-4">
          {/* Deck Counter & Navigation bar */}
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono px-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sky-400">
                Card {currentIndex + 1} of {deck.length}
              </span>
              {missedConceptKeys.has(currentCard.conceptKey) && (
                <span className="bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded text-[10px] font-semibold">
                  Missed in Quiz
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={currentIndex === 0}
                onClick={() => {
                  setCurrentIndex((prev) => prev - 1);
                  setIsFlipped(false);
                }}
                className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={currentIndex === deck.length - 1}
                onClick={() => {
                  setCurrentIndex((prev) => prev + 1);
                  setIsFlipped(false);
                }}
                className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Flippable Card Container */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="min-h-[380px] bg-[#0B1A2F] border border-slate-700 hover:border-slate-500 rounded-3xl p-6 sm:p-8 cursor-pointer shadow-2xl transition-all duration-300 relative flex flex-col justify-between select-none"
          >
            {/* Card Header */}
            <div className="flex items-center justify-between">
              <span
                className="px-2.5 py-1 rounded-md text-xs font-semibold"
                style={{
                  backgroundColor: `${DOMAINS[currentCard.domain]?.color}25`,
                  color: DOMAINS[currentCard.domain]?.color,
                }}
              >
                {DOMAINS[currentCard.domain]?.name}
              </span>

              <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                <RotateCw className="w-3 h-3" />
                <span>Click or Space to Flip</span>
              </span>
            </div>

            {/* Card Body: Front or Back */}
            <div className="my-auto py-6">
              {!isFlipped ? (
                /* Card Front */
                <div className="text-center space-y-4 max-w-xl mx-auto">
                  {currentCard.frontSubtext && (
                    <span className="text-xs font-mono text-teal-400 bg-teal-950/60 px-2.5 py-1 rounded border border-teal-800/40 inline-block">
                      {currentCard.frontSubtext}
                    </span>
                  )}
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
                    {currentCard.frontPrompt}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Topic: {currentCard.topic} • Concept: {currentCard.conceptTitle}
                  </p>
                </div>
              ) : (
                /* Card Back */
                <div className="space-y-4 max-w-2xl mx-auto text-left animate-fadeIn">
                  <div className="space-y-1">
                    <div className="text-xs font-mono text-teal-400 font-semibold uppercase tracking-wider">
                      Core Definition
                    </div>
                    <p className="text-sm sm:text-base text-slate-100 leading-relaxed font-medium">
                      {currentCard.backDefinition}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                      <div className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5" />
                        <span>Everyday Analogy</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {currentCard.backAnalogy}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                      <div className="text-xs font-semibold text-sky-400 flex items-center gap-1.5">
                        <Cloud className="w-3.5 h-3.5" />
                        <span>Azure Context</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {currentCard.azureContext}
                      </p>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-teal-950/40 border border-teal-800/50 text-teal-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                    <span>
                      <strong>Key Exam Takeaway:</strong> {currentCard.keyTakeaway}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Card Footer Status & Hint */}
            <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono">Current Status:</span>
                <span
                  className={`font-semibold font-mono text-[11px] px-2 py-0.5 rounded ${
                    cardState?.status === 'know'
                      ? 'bg-teal-950 text-teal-300 border border-teal-800'
                      : cardState?.status === 'need-practice'
                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {cardState?.status === 'know'
                    ? 'Mastered'
                    : cardState?.status === 'need-practice'
                    ? 'Need Practice'
                    : 'Unreviewed'}
                </span>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenCoach(currentCard.conceptKey, currentCard.conceptTitle);
                }}
                className="text-sky-400 hover:text-sky-300 text-xs font-medium flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Explain in Concept Coach</span>
              </button>
            </div>
          </div>

          {/* Action Control Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              onClick={() => handleCardResponse('need-practice')}
              className="w-full sm:w-auto px-6 py-3 rounded-xl border border-rose-600/60 bg-rose-950/40 hover:bg-rose-900/60 text-rose-200 text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <ThumbsDown className="w-4 h-4 text-rose-400" />
              <span>Need Practice (Left Key)</span>
            </button>

            <button
              onClick={() => setIsFlipped(!isFlipped)}
              className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium flex items-center justify-center gap-2"
            >
              <RotateCw className="w-4 h-4" />
              <span>{isFlipped ? 'Show Question' : 'Reveal Answer (Space)'}</span>
            </button>

            <button
              onClick={() => handleCardResponse('know')}
              className="w-full sm:w-auto px-6 py-3 rounded-xl border border-teal-500 bg-gradient-to-r from-teal-600 to-teal-500 text-slate-950 text-sm font-bold flex items-center justify-center gap-2 hover:brightness-110 shadow-lg active:scale-95 transition-all"
            >
              <ThumbsUp className="w-4 h-4 text-slate-950" />
              <span>Know It! (Right Key)</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
