import React, { useState, useMemo, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Layers,
  HelpCircle,
  Award,
  Zap,
  Target,
  Clock,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import {
  QuizQuestion,
  ExamDomain,
  AnswerRecord,
  QuizSessionResult,
  UserProgressData,
} from '../types';
import { QUIZ_QUESTIONS, DOMAINS } from '../data/az900Data';

interface QuizViewProps {
  progress: UserProgressData;
  onQuizComplete: (result: QuizSessionResult) => void;
  onOpenCoach: (conceptKey: string, conceptTitle: string, questionContext?: string) => void;
  onOpenFlashcard: (conceptKey: string) => void;
  initialMode?: 'sprint' | 'full' | 'topic' | 'missed-drill' | 'checkpoint-drill';
  initialDomain?: ExamDomain;
  initialConceptKey?: string;
  initialConceptTitle?: string;
}

export const QuizView: React.FC<QuizViewProps> = ({
  progress,
  onQuizComplete,
  onOpenCoach,
  onOpenFlashcard,
  initialMode = 'sprint',
  initialDomain,
  initialConceptKey,
  initialConceptTitle,
}) => {
  // Quiz configuration state
  const [selectedMode, setSelectedMode] = useState<
    'sprint' | 'full' | 'topic' | 'missed-drill' | 'checkpoint-drill'
  >(initialMode);
  const [selectedDomain, setSelectedDomain] = useState<ExamDomain>(
    initialDomain || 'cloud-concepts'
  );
  const [activeConceptKey, setActiveConceptKey] = useState<string | undefined>(initialConceptKey);
  const [activeConceptTitle, setActiveConceptTitle] = useState<string | undefined>(
    initialConceptTitle
  );

  // Active quiz session state
  const [isActive, setIsActive] = useState<boolean>(false);
  const [activeQuestions, setActiveQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState<boolean>(false);
  const [answersRecord, setAnswersRecord] = useState<AnswerRecord[]>([]);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [finalSession, setFinalSession] = useState<QuizSessionResult | null>(null);

  // Missed concept keys recorded in user progress
  const missedConceptKeys = useMemo(
    () => Object.keys(progress.missedConcepts),
    [progress.missedConcepts]
  );

  // Build question queue for a new quiz
  const startQuiz = (
    mode: 'sprint' | 'full' | 'topic' | 'missed-drill' | 'checkpoint-drill',
    domain?: ExamDomain,
    conceptKey?: string,
    conceptTitle?: string
  ) => {
    let pool = [...QUIZ_QUESTIONS];

    if (mode === 'checkpoint-drill' && (conceptKey || activeConceptKey)) {
      const targetKey = conceptKey || activeConceptKey;
      const targetTitle = conceptTitle || activeConceptTitle;
      if (targetTitle) setActiveConceptTitle(targetTitle);
      if (targetKey) setActiveConceptKey(targetKey);

      // Prioritize questions matching this conceptKey
      const exact = pool.filter((q) => q.conceptKey === targetKey);
      const targetDomain = exact.length > 0 ? exact[0].domain : domain;
      const targetTopic = exact.length > 0 ? exact[0].topic : undefined;

      const related = pool.filter(
        (q) => q.conceptKey !== targetKey && (q.topic === targetTopic || q.domain === targetDomain)
      );
      const shuffledRelated = [...related].sort(() => 0.5 - Math.random());
      pool = [...exact, ...shuffledRelated.slice(0, Math.max(0, 5 - exact.length))];
    } else if (mode === 'topic' && domain) {
      pool = pool.filter((q) => q.domain === domain);
    } else if (mode === 'missed-drill') {
      const missedSet = new Set(missedConceptKeys);
      const filtered = pool.filter((q) => missedSet.has(q.conceptKey));
      pool = filtered.length > 0 ? filtered : pool;
    }

    // Shuffle pool
    const shuffled = [...pool].sort(() => 0.5 - Math.random());

    let count = 5;
    if (mode === 'sprint') count = Math.min(5, shuffled.length);
    else if (mode === 'full') count = Math.min(15, shuffled.length);
    else if (mode === 'topic') count = Math.min(6, shuffled.length);
    else if (mode === 'missed-drill') count = Math.min(6, shuffled.length);
    else if (mode === 'checkpoint-drill') count = Math.min(5, shuffled.length);

    const questions = shuffled.slice(0, count);

    setSelectedMode(mode);
    setActiveQuestions(questions);
    setCurrentIndex(0);
    setSelectedOptionIndex(null);
    setIsAnswerSubmitted(false);
    setAnswersRecord([]);
    setIsCompleted(false);
    setFinalSession(null);
    setIsActive(true);
  };

  // Launch automatically if checkpoint drill requested via props
  useEffect(() => {
    if (initialMode === 'checkpoint-drill' && initialConceptKey) {
      setActiveConceptKey(initialConceptKey);
      setActiveConceptTitle(initialConceptTitle);
      startQuiz('checkpoint-drill', initialDomain, initialConceptKey, initialConceptTitle);
    } else if (initialMode && initialMode !== selectedMode) {
      setSelectedMode(initialMode);
      if (initialDomain) setSelectedDomain(initialDomain);
    }
  }, [initialMode, initialConceptKey, initialDomain]);

  const currentQuestion = activeQuestions[currentIndex];

  // Submit answer for current question
  const handleSubmitAnswer = () => {
    if (selectedOptionIndex === null || isAnswerSubmitted || !currentQuestion) return;

    const isCorrect = selectedOptionIndex === currentQuestion.correctIndex;
    const record: AnswerRecord = {
      questionId: currentQuestion.id,
      selectedIndex: selectedOptionIndex,
      isCorrect,
      conceptKey: currentQuestion.conceptKey,
      topic: currentQuestion.topic,
      domain: currentQuestion.domain,
    };

    setAnswersRecord((prev) => [...prev, record]);
    setIsAnswerSubmitted(true);
  };

  // Move to next question or complete quiz
  const handleNextQuestion = () => {
    if (currentIndex < activeQuestions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOptionIndex(null);
      setIsAnswerSubmitted(false);
    } else {
      // Quiz complete - calculate deterministic score
      finishQuiz();
    }
  };

  // Finalize quiz results and save to progress
  const finishQuiz = () => {
    const total = activeQuestions.length;
    const correct = answersRecord.filter((a) => a.isCorrect).length;
    const scorePct = Math.round((correct / total) * 100);
    const passed = scorePct >= 70; // Standard AZ-900 passing mark

    const missed = answersRecord
      .filter((a) => !a.isCorrect)
      .map((a) => a.conceptKey);

    const sessionResult: QuizSessionResult = {
      id: `quiz-${Date.now()}`,
      timestamp: new Date().toISOString(),
      mode: selectedMode,
      topicFilter:
        selectedMode === 'topic'
          ? DOMAINS[selectedDomain].name
          : selectedMode === 'checkpoint-drill'
          ? activeConceptTitle || 'Knowledge Checkpoint'
          : undefined,
      totalQuestions: total,
      correctCount: correct,
      scorePercent: scorePct,
      passed,
      answers: answersRecord,
      missedConceptKeys: missed,
    };

    setFinalSession(sessionResult);
    setIsCompleted(true);
    setIsActive(false);
    onQuizComplete(sessionResult);
  };

  // If Quiz is NOT active and NOT completed: Show Launcher Mode Selector
  if (!isActive && !isCompleted) {
    return (
      <div className="space-y-8 max-w-4xl mx-auto py-4">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-950/80 border border-sky-800 text-sky-400 text-xs font-mono">
            <Target className="w-3.5 h-3.5" />
            <span>Deterministic Assessment Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Smart Quiz Builder
          </h1>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            Test your understanding with original, scenario-based AZ-900 questions.
            Instant feedback, distractor explanations, and direct AI tutor integration.
          </p>
        </div>

        {/* Mode Selector Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Quick Sprint */}
          <div
            onClick={() => {
              setSelectedMode('sprint');
              startQuiz('sprint');
            }}
            className="group relative bg-[#0F223D]/80 hover:bg-[#132A4B] border border-slate-700/80 hover:border-sky-500/60 p-5 rounded-2xl cursor-pointer transition-all duration-200 shadow-lg flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <Zap className="w-5 h-5" />
                </span>
                <span className="text-xs font-mono text-sky-400 bg-sky-950/70 px-2 py-0.5 rounded border border-sky-800/50">
                  5 Questions • ~4 Mins
                </span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white group-hover:text-sky-300 transition-colors">
                  Flight Sprint
                </h3>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                  Fast multi-domain diagnostic. Perfect for coffee breaks and daily habit-building.
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-medium text-sky-400">
              <span>Launch Sprint</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Full Mini-Exam */}
          <div
            onClick={() => {
              setSelectedMode('full');
              startQuiz('full');
            }}
            className="group relative bg-[#0F223D]/80 hover:bg-[#132A4B] border border-slate-700/80 hover:border-teal-500/60 p-5 rounded-2xl cursor-pointer transition-all duration-200 shadow-lg flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                  <Award className="w-5 h-5" />
                </span>
                <span className="text-xs font-mono text-teal-400 bg-teal-950/70 px-2 py-0.5 rounded border border-teal-800/50">
                  15 Questions • ~15 Mins
                </span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white group-hover:text-teal-300 transition-colors">
                  Full Flight Simulation
                </h3>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                  Balanced mix representing Cloud Concepts, Architecture, and Governance domains.
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-medium text-teal-400">
              <span>Begin Simulation</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Missed Concepts Drill */}
          <div
            onClick={() => {
              if (missedConceptKeys.length === 0) return;
              setSelectedMode('missed-drill');
              startQuiz('missed-drill');
            }}
            className={`group relative p-5 rounded-2xl transition-all duration-200 shadow-lg flex flex-col justify-between ${
              missedConceptKeys.length > 0
                ? 'bg-[#0F223D]/80 hover:bg-[#132A4B] border border-amber-600/50 hover:border-amber-400 cursor-pointer'
                : 'bg-slate-900/50 border border-slate-800/60 opacity-60 cursor-not-allowed'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <RotateCcw className="w-5 h-5" />
                </span>
                <span className="text-xs font-mono text-amber-400 bg-amber-950/70 px-2 py-0.5 rounded border border-amber-800/50">
                  {missedConceptKeys.length} Concepts In Queue
                </span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white group-hover:text-amber-300 transition-colors">
                  Missed Concepts Recovery
                </h3>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                  {missedConceptKeys.length > 0
                    ? 'Target questions on concepts you recently missed to turn weak points into strengths.'
                    : 'No missed concepts recorded yet! Take a sprint first to populate your recovery queue.'}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-medium text-amber-400">
              <span>{missedConceptKeys.length > 0 ? 'Drill Missed Concepts' : 'Queue Empty'}</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Domain Specific Drill */}
          <div className="bg-[#0F223D]/80 border border-slate-700/80 p-5 rounded-2xl shadow-lg flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <BookOpen className="w-5 h-5" />
                </span>
                <span className="text-xs font-mono text-indigo-400 bg-indigo-950/70 px-2 py-0.5 rounded border border-indigo-800/50">
                  Domain Focus
                </span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Targeted Domain Drill</h3>
                <p className="text-slate-400 text-xs mt-1">
                  Choose a specific AZ-900 domain to isolate and master:
                </p>
              </div>

              <div className="pt-2 space-y-2">
                {(Object.keys(DOMAINS) as ExamDomain[]).map((dom) => (
                  <button
                    key={dom}
                    onClick={() => {
                      setSelectedDomain(dom);
                      setSelectedMode('topic');
                      startQuiz('topic', dom);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 hover:border-sky-500 text-xs text-slate-200 flex items-center justify-between transition-colors"
                  >
                    <span>{DOMAINS[dom].name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{DOMAINS[dom].weight}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active Quiz In Progress
  if (isActive && currentQuestion) {
    const isAnswered = isAnswerSubmitted;
    const progressPercent = Math.round(((currentIndex + 1) / activeQuestions.length) * 100);
    const domainMeta = DOMAINS[currentQuestion.domain];

    return (
      <div className="max-w-3xl mx-auto py-2 space-y-6">
        {/* Top Quiz Bar */}
        <div className="bg-[#0F223D]/90 border border-slate-700/80 p-4 rounded-2xl shadow-lg space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sky-400 font-semibold">
                Question {currentIndex + 1} of {activeQuestions.length}
              </span>
              <span className="text-slate-500">•</span>
              <span
                className="px-2 py-0.5 rounded text-[11px] font-medium"
                style={{ backgroundColor: `${domainMeta.color}25`, color: domainMeta.color }}
              >
                {domainMeta.name}
              </span>
            </div>
            <span className="text-slate-400 font-mono text-[11px] hidden sm:inline">
              Topic: {currentQuestion.topic}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-sky-500 to-teal-400 h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-[#0B1A2F] border border-slate-700/90 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-mono text-teal-400 bg-teal-950/60 px-2.5 py-1 rounded-md border border-teal-800/40 inline-block">
              {currentQuestion.conceptTitle}
            </span>
            <h2 className="text-lg sm:text-xl font-medium text-slate-100 leading-relaxed">
              {currentQuestion.question}
            </h2>
          </div>

          {/* Multiple Choice Options */}
          <div className="space-y-3">
            {currentQuestion.options.map((option, idx) => {
              const isSelected = selectedOptionIndex === idx;
              const isCorrectOption = idx === currentQuestion.correctIndex;

              let optionStyle =
                'border-slate-700/70 bg-slate-900/60 text-slate-300 hover:border-slate-500 hover:bg-slate-800/60';

              if (isAnswered) {
                if (isCorrectOption) {
                  optionStyle = 'border-teal-500 bg-teal-950/40 text-teal-200 shadow-md shadow-teal-950/50';
                } else if (isSelected && !isCorrectOption) {
                  optionStyle = 'border-rose-500 bg-rose-950/40 text-rose-200 shadow-md shadow-rose-950/50';
                } else {
                  optionStyle = 'border-slate-800 bg-slate-900/30 text-slate-500 opacity-60';
                }
              } else if (isSelected) {
                optionStyle = 'border-sky-400 bg-sky-950/50 text-white shadow-md shadow-sky-950/40';
              }

              return (
                <button
                  key={idx}
                  disabled={isAnswered}
                  onClick={() => setSelectedOptionIndex(idx)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-150 flex items-start gap-3.5 ${optionStyle}`}
                >
                  <span
                    className={`w-6 h-6 rounded-full text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                      isAnswered && isCorrectOption
                        ? 'bg-teal-500 text-black'
                        : isAnswered && isSelected && !isCorrectOption
                        ? 'bg-rose-500 text-white'
                        : isSelected
                        ? 'bg-sky-400 text-black'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <div className="flex-1 text-sm leading-snug">{option}</div>
                  {isAnswered && isCorrectOption && (
                    <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                  )}
                  {isAnswered && isSelected && !isCorrectOption && (
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Action Button: Submit Answer */}
          {!isAnswered ? (
            <div className="pt-2 flex justify-end">
              <button
                disabled={selectedOptionIndex === null}
                onClick={handleSubmitAnswer}
                className="px-6 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-sky-500 to-teal-500 text-slate-950 hover:brightness-110 active:scale-95"
              >
                <span>Submit Answer</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Feedback Drawer after Answer is Submitted */
            <div className="space-y-4 pt-2 border-t border-slate-800">
              {/* Correctness banner */}
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 ${
                  selectedOptionIndex === currentQuestion.correctIndex
                    ? 'bg-teal-950/30 border-teal-500/40 text-teal-300'
                    : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                }`}
              >
                {selectedOptionIndex === currentQuestion.correctIndex ? (
                  <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="font-semibold text-sm">
                    {selectedOptionIndex === currentQuestion.correctIndex
                      ? 'Correct! Nominal reading.'
                      : 'Incorrect reading recorded.'}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {currentQuestion.explanation}
                  </p>
                </div>
              </div>

              {/* Exam Tip */}
              <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-300/90 text-xs space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-amber-300">
                  <Award className="w-3.5 h-3.5" />
                  <span>AZ-900 Flight Tip:</span>
                </div>
                <p className="text-slate-300 leading-relaxed">{currentQuestion.examTip}</p>
              </div>

              {/* Action Hooks for Missed Concepts */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() =>
                      onOpenCoach(
                        currentQuestion.conceptKey,
                        currentQuestion.conceptTitle,
                        currentQuestion.question
                      )
                    }
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-sky-950/80 hover:bg-sky-900 border border-sky-600/50 text-sky-300 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                    <span>Coach Me on "{currentQuestion.conceptTitle}"</span>
                  </button>

                  <button
                    onClick={() => onOpenFlashcard(currentQuestion.conceptKey)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 transition-colors"
                  >
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    <span>Review Flashcard</span>
                  </button>
                </div>

                <button
                  onClick={handleNextQuestion}
                  className="px-5 py-2 rounded-xl font-medium text-xs sm:text-sm bg-gradient-to-r from-sky-400 to-teal-400 text-slate-950 hover:brightness-110 transition-all flex items-center gap-1.5 ml-auto"
                >
                  <span>{currentIndex < activeQuestions.length - 1 ? 'Next Question' : 'View Debrief'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Quiz Debrief / Results Screen
  if (isCompleted && finalSession) {
    const isPassed = finalSession.passed;
    return (
      <div className="max-w-3xl mx-auto py-4 space-y-6">
        {/* Scorecard Hero */}
        <div
          className={`p-6 sm:p-8 rounded-2xl border text-center space-y-4 shadow-2xl relative overflow-hidden ${
            isPassed
              ? 'bg-gradient-to-b from-[#0F2D3A] to-[#0A1A2F] border-teal-500/50 shadow-teal-950/40'
              : 'bg-gradient-to-b from-[#2B1B26] to-[#0A1A2F] border-rose-500/50 shadow-rose-950/40'
          }`}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-slate-900/80 border border-slate-700 text-slate-300">
            <span>Mission Telemetry Debrief</span>
          </div>

          <div className="space-y-1">
            <div
              className={`text-5xl sm:text-6xl font-extrabold font-mono tracking-tight ${
                isPassed ? 'text-teal-400' : 'text-rose-400'
              }`}
            >
              {finalSession.scorePercent}%
            </div>
            <div className="text-base sm:text-lg font-semibold text-white">
              {isPassed ? 'Flight Certified — Passing Score!' : 'Telemetry Flagged — Review Recommended'}
            </div>
            <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto">
              You correctly answered{' '}
              <span className="font-bold text-white">{finalSession.correctCount}</span> of{' '}
              <span className="font-bold text-white">{finalSession.totalQuestions}</span> questions.
              Official AZ-900 benchmark target is 70% (700/1000).
            </p>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-3 gap-2 max-w-md mx-auto pt-2">
            <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
              <div className="text-[11px] text-slate-400 font-mono">Status</div>
              <div
                className={`text-xs font-bold font-mono mt-0.5 ${
                  isPassed ? 'text-teal-400' : 'text-amber-400'
                }`}
              >
                {isPassed ? 'PASS' : 'RETRY'}
              </div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
              <div className="text-[11px] text-slate-400 font-mono">Accuracy</div>
              <div className="text-xs font-bold font-mono text-white mt-0.5">
                {finalSession.correctCount}/{finalSession.totalQuestions}
              </div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
              <div className="text-[11px] text-slate-400 font-mono">Missed</div>
              <div className="text-xs font-bold font-mono text-rose-400 mt-0.5">
                {finalSession.missedConceptKeys.length} Concepts
              </div>
            </div>
          </div>
        </div>

        {/* Missed Concepts Follow-up Section */}
        {finalSession.missedConceptKeys.length > 0 && (
          <div className="bg-[#0F223D]/80 border border-slate-700/80 rounded-2xl p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-white">
                  Concepts to Reinforce ({finalSession.missedConceptKeys.length})
                </h3>
              </div>
              <span className="text-xs text-slate-400">Recorded to your flight telemetry</span>
            </div>

            <div className="space-y-2.5">
              {finalSession.missedConceptKeys.map((key) => {
                const q = activeQuestions.find((item) => item.conceptKey === key);
                const title = q ? q.conceptTitle : key;
                return (
                  <div
                    key={key}
                    className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-200">{title}</div>
                      <div className="text-[11px] text-slate-400">
                        Topic: {q?.topic || 'Cloud Architecture'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onOpenCoach(key, title)}
                        className="px-2.5 py-1.5 rounded-lg bg-sky-950 border border-sky-700 text-sky-300 text-xs font-medium flex items-center gap-1 hover:bg-sky-900"
                      >
                        <Sparkles className="w-3 h-3 text-sky-400" />
                        <span>AI Coach</span>
                      </button>
                      <button
                        onClick={() => onOpenFlashcard(key)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 hover:bg-slate-700"
                      >
                        <Layers className="w-3 h-3 text-slate-400" />
                        <span>Flashcard</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            onClick={() => {
              setIsCompleted(false);
              setIsActive(false);
            }}
            className="px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-sm font-medium flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Select Different Mode</span>
          </button>

          <button
            onClick={() => startQuiz(selectedMode, selectedDomain)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-400 to-teal-400 text-slate-950 font-semibold text-sm hover:brightness-110 flex items-center gap-2 shadow-lg"
          >
            <span>Retake This Quiz</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
};
