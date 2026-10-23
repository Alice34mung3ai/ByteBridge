import React from 'react';
import {
  Compass,
  CheckCircle2,
  Target,
  Sparkles,
  Layers,
  ArrowRight,
  RotateCcw,
  AlertTriangle,
  Award,
  Zap,
  TrendingUp,
  HardDrive,
  BarChart2,
  RefreshCw,
  Flame,
  HelpCircle,
  Clock,
} from 'lucide-react';
import { UserProgressData, ExamDomain } from '../types';
import { DOMAINS, CONCEPTS_CATALOG, FLASHCARDS_DECK } from '../data/az900Data';
import { getRecommendedActivity } from '../utils/storage';
import { NavTab } from './Navbar';
import { WeeklyStudySummary } from './WeeklyStudySummary';
import { DailyLearningGoal } from './DailyLearningGoal';
import { FlightLog } from './FlightLog';

interface DashboardProps {
  progress: UserProgressData;
  onNavigate: (tab: NavTab) => void;
  onStartQuizMode: (mode: 'sprint' | 'full' | 'topic' | 'missed-drill', domain?: ExamDomain) => void;
  onOpenCoach: (conceptKey: string, conceptTitle: string) => void;
  onOpenFlashcard: (conceptKey: string) => void;
  onSeedSampleData: () => void;
  onResetProgress: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  progress,
  onNavigate,
  onStartQuizMode,
  onOpenCoach,
  onOpenFlashcard,
  onSeedSampleData,
  onResetProgress,
}) => {
  const attempted = progress?.questionsAttempted || 0;
  const correct = progress?.questionsCorrect || 0;
  const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;

  // Calculate readiness score (weighted accuracy + flashcard mastery)
  const totalDeck = FLASHCARDS_DECK.length;
  const flashcardStates = progress?.flashcardStates || {};
  const cardsMastered = Object.values(flashcardStates).filter((s) => s?.status === 'know').length;
  const cardsNeedPractice = Object.values(flashcardStates).filter(
    (s) => s?.status === 'need-practice'
  ).length;

  let readinessIndex = 0;
  if (attempted > 0) {
    const accuracyScore = accuracy * 0.7; // 70% weight on quiz accuracy
    const coverageScore = Math.min(100, (attempted / 15) * 100) * 0.15; // 15% weight on volume
    const cardScore = (cardsMastered / Math.max(1, totalDeck)) * 100 * 0.15; // 15% weight on cards
    readinessIndex = Math.min(100, Math.round(accuracyScore + coverageScore + cardScore));
  }

  // Recommended next activity
  const recommendation = getRecommendedActivity(progress);

  // Recently missed concepts list
  const missedConceptsMap = progress?.missedConcepts || {};
  const missedList = Object.values(missedConceptsMap).sort(
    (a, b) => new Date(b.lastMissedAt).getTime() - new Date(a.lastMissedAt).getTime()
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-2">
      {/* Flight Control Telemetry Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#0B1E38] via-[#0F2A4D] to-[#0A1A2F] border border-sky-800/60 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-950 border border-sky-800/80 text-sky-400 text-xs font-mono">
              <Compass className="w-3.5 h-3.5 text-sky-400" />
              <span>ByteBridge AZ-900 Telemetry • Active Station</span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>{progress.studyStreakDays} Day Habit Streak</span>
            </div>
          </div>

          <div className="max-w-2xl space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              ByteBridge Mission Control
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Your real-time preparation status for the AZ-900 Azure Fundamentals certification on ByteBridge.
              Track actual practice accuracy, review flagged concepts, and get guided coaching.
            </p>
          </div>

          {/* 4 Key Flight Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-4">
            {/* Questions Attempted */}
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-1">
              <div className="text-xs text-slate-400 font-mono flex items-center justify-between">
                <span>Questions Attempted</span>
                <Target className="w-3.5 h-3.5 text-sky-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-white">
                {progress.questionsAttempted}
              </div>
              <div className="text-[11px] text-slate-400">
                {progress.questionsCorrect} correct answers
              </div>
            </div>

            {/* Actual Practice Accuracy */}
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-1">
              <div className="text-xs text-slate-400 font-mono flex items-center justify-between">
                <span>Practice Accuracy</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
              </div>
              <div
                className={`text-2xl sm:text-3xl font-bold font-mono ${
                  progress.questionsAttempted === 0
                    ? 'text-slate-500'
                    : accuracy >= 70
                    ? 'text-teal-400'
                    : 'text-amber-400'
                }`}
              >
                {progress.questionsAttempted > 0 ? `${accuracy}%` : '—'}
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {accuracy >= 70 ? 'Target achieved (≥70%)' : 'Benchmark target: 70%'}
              </div>
            </div>

            {/* Readiness Index */}
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-1">
              <div className="text-xs text-slate-400 font-mono flex items-center justify-between">
                <span>Readiness Gauge</span>
                <Award className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-sky-300">
                {readinessIndex}%
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {readinessIndex >= 75
                  ? 'High exam readiness'
                  : readinessIndex >= 40
                  ? 'Flight progress steady'
                  : 'Early flight phase'}
              </div>
            </div>

            {/* Flashcards Status */}
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-1">
              <div className="text-xs text-slate-400 font-mono flex items-center justify-between">
                <span>Flashcards Requiring Review</span>
                <Layers className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-300">
                {cardsNeedPractice}
              </div>
              <div className="text-[11px] text-slate-400">
                {cardsMastered} mastered of {totalDeck} total
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommended Next Learning Activity Hero Card */}
      <div className="bg-gradient-to-r from-[#0F2848] to-[#0D3847] border border-sky-600/60 rounded-3xl p-6 sm:p-7 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-950 border border-sky-500/50 text-sky-300 text-xs font-mono font-semibold">
              <Sparkles className="w-3 h-3 text-sky-400" />
              <span>Recommended Next Learning Activity</span>
              <span className="text-slate-400">•</span>
              <span className="text-teal-300">{recommendation.badge}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {recommendation.title}
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              {recommendation.description}
            </p>
          </div>

          <div className="shrink-0 w-full sm:w-auto">
            <button
              onClick={() => {
                if (recommendation.type === 'concept-coach' && recommendation.targetConceptKey) {
                  onOpenCoach(
                    recommendation.targetConceptKey,
                    recommendation.title.replace('Coach Review: ', '')
                  );
                } else if (recommendation.type === 'flashcard-drill') {
                  onNavigate('flashcards');
                } else if (recommendation.type === 'quiz-sprint') {
                  onStartQuizMode('sprint');
                } else if (recommendation.type === 'domain-drill') {
                  onStartQuizMode('topic', recommendation.targetDomain);
                } else {
                  onNavigate('quiz');
                }
              }}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-sky-400 to-teal-400 text-slate-950 font-bold text-sm hover:brightness-110 shadow-lg shadow-sky-950/50 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <span>{recommendation.actionText}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Daily Learning Goal Tracker */}
      <DailyLearningGoal
        progress={progress}
        onStartQuizMode={onStartQuizMode}
      />

      {/* Weekly Study Summary Line Chart (Recharts) */}
      <WeeklyStudySummary
        progress={progress}
        onStartQuizMode={onStartQuizMode}
      />

      {/* Flight Log: Chronological history of last 10 quiz sessions */}
      <FlightLog
        progress={progress}
        onStartQuizMode={onStartQuizMode}
        onOpenCoach={onOpenCoach}
        onOpenFlashcard={onOpenFlashcard}
        onSeedSampleData={onSeedSampleData}
      />

      {/* Grid: Domain Performance Breakdown & Concepts Recently Missed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Domain Performance */}
        <div className="bg-[#0B1A2F] border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-sky-400" />
              <h3 className="text-base font-bold text-white">Performance by Exam Domain</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">AZ-900 Syllabus</span>
          </div>

          <div className="space-y-4">
            {(Object.keys(DOMAINS) as ExamDomain[]).map((dKey) => {
              const domain = DOMAINS[dKey];
              const stats = progress.domainStats[dKey] || { attempted: 0, correct: 0 };
              const domAccuracy =
                stats.attempted > 0 ? Math.round((stats.correct / stats.attempted) * 100) : 0;

              return (
                <div
                  key={dKey}
                  className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-200">{domain.name}</span>
                      <span className="text-slate-400 font-mono ml-2">({domain.weight})</span>
                    </div>
                    <span
                      className={`font-mono font-bold ${
                        stats.attempted === 0
                          ? 'text-slate-500'
                          : domAccuracy >= 70
                          ? 'text-teal-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {stats.attempted > 0 ? `${domAccuracy}%` : 'Unattempted'}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${domAccuracy}%`,
                        backgroundColor: domain.color,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                    <span>
                      {stats.correct}/{stats.attempted} answered correctly
                    </span>
                    <button
                      onClick={() => onStartQuizMode('topic', dKey)}
                      className="text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1"
                    >
                      <span>Practice Domain</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Concepts Recently Missed */}
        <div className="bg-[#0B1A2F] border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h3 className="text-base font-bold text-white">Concepts Recently Missed</h3>
              </div>
              <span className="text-xs text-amber-400 font-mono">
                {missedList.length} Flagged
              </span>
            </div>

            {missedList.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-slate-900/50 border border-slate-800 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-teal-400 mx-auto" />
                <div className="text-sm font-semibold text-white">All Systems Nominal</div>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  No missed concepts currently in your flight record! Take a practice quiz to test
                  your retention.
                </p>
                <button
                  onClick={() => onStartQuizMode('sprint')}
                  className="mt-2 px-4 py-2 rounded-xl bg-sky-500 text-slate-950 font-semibold text-xs hover:bg-sky-400"
                >
                  Start Practice Sprint
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {missedList.slice(0, 5).map((item) => (
                  <div
                    key={item.conceptKey}
                    className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-100">{item.conceptTitle}</div>
                      <div className="text-[11px] text-slate-400">
                        Topic: {item.topic} • Flagged {item.frequency}x
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onOpenCoach(item.conceptKey, item.conceptTitle)}
                        className="px-2.5 py-1.5 rounded-lg bg-sky-950 border border-sky-700 text-sky-300 text-xs font-medium flex items-center gap-1 hover:bg-sky-900"
                      >
                        <Sparkles className="w-3 h-3 text-sky-400" />
                        <span>AI Coach</span>
                      </button>
                      <button
                        onClick={() => onOpenFlashcard(item.conceptKey)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 hover:bg-slate-700"
                      >
                        <Layers className="w-3 h-3 text-slate-400" />
                        <span>Flashcard</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Action footer */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Missed concepts feed directly into AI tutoring.</span>
            <button
              onClick={() => onNavigate('coach')}
              className="text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1"
            >
              <span>Concept Coach Hub</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Mission Actions Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-300 font-mono uppercase tracking-wider">
          Quick Launch Pad
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => onStartQuizMode('sprint')}
            className="p-4 rounded-2xl bg-[#0F223D]/80 hover:bg-[#132A4B] border border-slate-700 hover:border-sky-500 text-left transition-all space-y-1.5 group shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400">
                <Zap className="w-4 h-4" />
              </span>
              <span className="text-[10px] text-sky-400 font-mono">5 Questions</span>
            </div>
            <div className="font-semibold text-sm text-white group-hover:text-sky-300">
              Launch Flight Sprint
            </div>
            <p className="text-slate-400 text-xs">Fast general AZ-900 quiz sprint.</p>
          </button>

          <button
            onClick={() => onNavigate('flashcards')}
            className="p-4 rounded-2xl bg-[#0F223D]/80 hover:bg-[#132A4B] border border-slate-700 hover:border-teal-500 text-left transition-all space-y-1.5 group shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400">
                <Layers className="w-4 h-4" />
              </span>
              <span className="text-[10px] text-teal-400 font-mono">{totalDeck} Cards</span>
            </div>
            <div className="font-semibold text-sm text-white group-hover:text-teal-300">
              Active Recall Flashcards
            </div>
            <p className="text-slate-400 text-xs">Drill terms, analogies, and distinctions.</p>
          </button>

          <button
            onClick={() => onNavigate('coach')}
            className="p-4 rounded-2xl bg-[#0F223D]/80 hover:bg-[#132A4B] border border-slate-700 hover:border-sky-400 text-left transition-all space-y-1.5 group shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400">
                <Sparkles className="w-4 h-4" />
              </span>
              <span className="text-[10px] text-sky-400 font-mono">Gemini 3.8</span>
            </div>
            <div className="font-semibold text-sm text-white group-hover:text-sky-300">
              Open Concept Coach
            </div>
            <p className="text-slate-400 text-xs">Patient, beginner-friendly cloud AI tutor.</p>
          </button>
        </div>
      </div>

      {/* Storage and Demo Controls Strip */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-sky-400 shrink-0" />
          <span>
            Telemetry stored locally in browser. Clear or seed sample session for testing:
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onSeedSampleData}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            Load Sample Telemetry
          </button>
          <button
            onClick={onResetProgress}
            className="px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 transition-colors"
          >
            Reset Progress
          </button>
        </div>
      </div>
    </div>
  );
};
