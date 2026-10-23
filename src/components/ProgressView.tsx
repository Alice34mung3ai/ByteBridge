import React from 'react';
import {
  BarChart3,
  TrendingUp,
  Award,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Layers,
  Download,
  Calendar,
  Clock,
  Target,
  ArrowRight,
  Crosshair,
  Zap,
  Lightbulb,
  ShieldAlert,
} from 'lucide-react';
import { UserProgressData, ExamDomain } from '../types';
import { DOMAINS, QUIZ_QUESTIONS } from '../data/az900Data';
import { getKnowledgeCheckpoints } from '../utils/storage';

interface ProgressViewProps {
  progress: UserProgressData;
  onOpenCoach: (conceptKey: string, conceptTitle: string) => void;
  onOpenFlashcard: (conceptKey: string) => void;
  onStartQuizMode: (
    mode: 'sprint' | 'full' | 'topic' | 'missed-drill' | 'checkpoint-drill',
    domain?: ExamDomain,
    conceptKey?: string,
    conceptTitle?: string
  ) => void;
}

export const ProgressView: React.FC<ProgressViewProps> = ({
  progress,
  onOpenCoach,
  onOpenFlashcard,
  onStartQuizMode,
}) => {
  const totalAttempted = progress.questionsAttempted;
  const totalCorrect = progress.questionsCorrect;
  const overallAccuracy =
    totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

  // Extract 3 least mastered concepts via flight telemetry
  const { checkpoints, hasQuizHistory, totalConceptsTested } = getKnowledgeCheckpoints(progress);

  // Extract all unique topics from question bank
  const topicsList = Array.from(new Set(QUIZ_QUESTIONS.map((q) => q.topic))).map((topic) => {
    const matchingQ = QUIZ_QUESTIONS.find((q) => q.topic === topic);
    const domain = matchingQ ? matchingQ.domain : 'cloud-concepts';
    const stats = progress.topicStats[topic] || { attempted: 0, correct: 0 };
    const topicAcc =
      stats.attempted > 0 ? Math.round((stats.correct / stats.attempted) * 100) : 0;

    let status: 'mastered' | 'developing' | 'needs-work' | 'untested' = 'untested';
    if (stats.attempted > 0) {
      if (topicAcc >= 80) status = 'mastered';
      else if (topicAcc >= 50) status = 'developing';
      else status = 'needs-work';
    }

    return {
      topic,
      domain,
      attempted: stats.attempted,
      correct: stats.correct,
      accuracy: topicAcc,
      status,
    };
  });

  // Sort topics: tested first, then by accuracy ascending (weakest first)
  topicsList.sort((a, b) => {
    if (a.attempted === 0 && b.attempted > 0) return 1;
    if (a.attempted > 0 && b.attempted === 0) return -1;
    return a.accuracy - b.accuracy;
  });

  const exportTelemetry = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(progress, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `azure-flight-deck-telemetry-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const missedItems = Object.values(progress.missedConcepts).sort(
    (a, b) => b.frequency - a.frequency
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-2">
      {/* Header */}
      <div className="bg-[#0F223D]/90 border border-slate-700/80 p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-950 border border-indigo-800 text-indigo-300 text-xs font-mono">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Flight Log & Performance Telemetry</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Detailed Practice Analytics
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm">
            Audited topic-level scores, quiz history logs, and weakness analysis.
          </p>
        </div>

        <button
          onClick={exportTelemetry}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-2 self-start sm:self-auto transition-colors"
        >
          <Download className="w-4 h-4 text-sky-400" />
          <span>Export JSON Telemetry</span>
        </button>
      </div>

      {/* Top 3 High-Level Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0B1A2F] border border-slate-700/80 p-5 rounded-2xl space-y-1 shadow-lg">
          <div className="text-xs text-slate-400 font-mono">Total Questions Attempted</div>
          <div className="text-3xl font-extrabold font-mono text-white">{totalAttempted}</div>
          <div className="text-xs text-slate-400">{totalCorrect} correct submissions</div>
        </div>

        <div className="bg-[#0B1A2F] border border-slate-700/80 p-5 rounded-2xl space-y-1 shadow-lg">
          <div className="text-xs text-slate-400 font-mono">Overall Practice Accuracy</div>
          <div
            className={`text-3xl font-extrabold font-mono ${
              totalAttempted === 0
                ? 'text-slate-500'
                : overallAccuracy >= 70
                ? 'text-teal-400'
                : 'text-amber-400'
            }`}
          >
            {totalAttempted > 0 ? `${overallAccuracy}%` : '—'}
          </div>
          <div className="text-xs text-slate-400 font-mono">AZ-900 Passing Benchmark: 70%</div>
        </div>

        <div className="bg-[#0B1A2F] border border-slate-700/80 p-5 rounded-2xl space-y-1 shadow-lg">
          <div className="text-xs text-slate-400 font-mono">Completed Quiz Sessions</div>
          <div className="text-3xl font-extrabold font-mono text-sky-300">
            {progress.recentQuizzes.length}
          </div>
          <div className="text-xs text-slate-400">
            {progress.recentQuizzes.filter((q) => q.passed).length} passing runs
          </div>
        </div>
      </div>

      {/* Knowledge Checkpoints: 3 Least Mastered Concepts */}
      <div className="bg-[#0B1A2F] border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-950/80 border border-rose-800/80 text-rose-300 text-xs font-mono font-semibold">
              <Crosshair className="w-3.5 h-3.5 text-rose-400" />
              <span>Diagnostic Remediation Engine</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex flex-wrap items-center gap-2">
              <span>Knowledge Checkpoints</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono font-normal border border-slate-700">
                3 Least Mastered Concepts
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-3xl">
              Identified automatically from your quiz history and error telemetry. Target these 3 priority checkpoints to eliminate knowledge gaps and secure your AZ-900 pass.
            </p>
          </div>

          {hasQuizHistory && (
            <button
              onClick={() => onStartQuizMode('missed-drill')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500/20 to-amber-500/20 hover:from-rose-500/30 hover:to-amber-500/30 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center gap-2 self-start sm:self-auto transition-all shadow-md"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Drill All Flagged Weaknesses</span>
            </button>
          )}
        </div>

        {!hasQuizHistory && (
          <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-200">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
              <span>
                <strong>Telemetry Calibration Needed:</strong> Take a quiz or Flight Sprint to calibrate your personalized checkpoints from live response accuracy. Below are the top 3 high-frequency AZ-900 baseline stumbling blocks to start drilling.
              </span>
            </div>
            <button
              onClick={() => onStartQuizMode('sprint')}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 transition-colors shadow"
            >
              Launch Calibration Sprint
            </button>
          </div>
        )}

        {/* 3 Checkpoint Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {checkpoints.map((cp) => {
            const domainMeta = DOMAINS[cp.domain];
            const isRank1 = cp.rank === 1;
            const isRank2 = cp.rank === 2;

            return (
              <div
                key={cp.conceptKey}
                className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 transition-all duration-200 shadow-lg ${
                  isRank1
                    ? 'bg-gradient-to-b from-[#1F1224] via-[#0F1E36] to-[#0A1628] border-rose-600/60 shadow-rose-950/20'
                    : isRank2
                    ? 'bg-gradient-to-b from-[#211A12] via-[#0F1E36] to-[#0A1628] border-amber-600/60 shadow-amber-950/20'
                    : 'bg-gradient-to-b from-[#111C2E] via-[#0F1E36] to-[#0A1628] border-sky-600/60 shadow-sky-950/20'
                }`}
              >
                {/* Top: Rank, Domain, and Concept Info */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                        isRank1
                          ? 'bg-rose-950 text-rose-300 border-rose-800'
                          : isRank2
                          ? 'bg-amber-950 text-amber-300 border-amber-800'
                          : 'bg-sky-950 text-sky-300 border-sky-800'
                      }`}
                    >
                      {cp.isCalibrated
                        ? `Checkpoint #${cp.rank} • ${isRank1 ? 'Critical Gap' : isRank2 ? 'Needs Reinforcement' : 'Borderline'}`
                        : `Baseline Focus #${cp.rank}`}
                    </span>

                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-medium"
                      style={{
                        backgroundColor: `${domainMeta?.color}20`,
                        color: domainMeta?.color,
                      }}
                    >
                      {domainMeta?.name.split(' ')[0]}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight leading-snug">
                      {cp.conceptTitle}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Topic: {cp.topic}
                    </p>
                  </div>

                  {/* Accuracy & Attempts Telemetry Gauge */}
                  <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400">Concept Mastery</span>
                      <span
                        className={`font-bold ${
                          !cp.isCalibrated
                            ? 'text-slate-500'
                            : cp.accuracy < 40
                            ? 'text-rose-400'
                            : cp.accuracy < 70
                            ? 'text-amber-400'
                            : 'text-teal-400'
                        }`}
                      >
                        {cp.isCalibrated ? `${cp.accuracy}%` : 'Uncalibrated'}
                      </span>
                    </div>

                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          !cp.isCalibrated
                            ? 'bg-slate-600'
                            : cp.accuracy < 40
                            ? 'bg-rose-500'
                            : cp.accuracy < 70
                            ? 'bg-amber-500'
                            : 'bg-teal-400'
                        }`}
                        style={{ width: `${cp.isCalibrated ? Math.max(8, cp.accuracy) : 10}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>
                        {cp.isCalibrated
                          ? `${cp.correctCount} correct / ${cp.totalAttempts} attempted`
                          : '0 quiz submissions'}
                      </span>
                      {cp.isCalibrated && cp.missedCount > 0 && (
                        <span className="text-rose-400 font-semibold">
                          {cp.missedCount} miss{cp.missedCount > 1 ? 'es' : ''} logged
                        </span>
                      )}
                    </div>
                  </div>

                  {/* High-Yield Exam Rule or Trap */}
                  {(cp.keyDistinction || cp.commonConfusion || cp.summary) && (
                    <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-300 leading-relaxed">
                      <div className="text-slate-400 font-semibold mb-0.5 flex items-center gap-1 font-mono text-[10px]">
                        <Lightbulb className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>Core Exam Rule / Distinction</span>
                      </div>
                      <p className="line-clamp-3">
                        {cp.keyDistinction || cp.commonConfusion || cp.summary}
                      </p>
                    </div>
                  )}
                </div>

                {/* Suggested Specific Practice Sessions */}
                <div className="pt-3 border-t border-slate-800/80 space-y-2">
                  <div className="text-[11px] font-semibold text-slate-300 font-mono">
                    Suggested Practice Sessions
                  </div>

                  <div className="space-y-1.5">
                    {/* Practice Session 1: Targeted Concept Drill */}
                    <button
                      onClick={() =>
                        onStartQuizMode('checkpoint-drill', cp.domain, cp.conceptKey, cp.conceptTitle)
                      }
                      className="w-full py-2 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center justify-between transition-colors shadow-md group"
                    >
                      <div className="flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5" />
                        <span>Drill This Concept</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-900/80 bg-sky-300 px-1.5 py-0.5 rounded font-semibold">
                        5 Qs
                      </span>
                    </button>

                    {/* Practice Session 2 & 3: AI Coach & Flashcard */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => onOpenCoach(cp.conceptKey, cp.conceptTitle)}
                        className="py-1.5 px-2.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Sparkles className="w-3 h-3 text-sky-400" />
                        <span>AI Coach</span>
                      </button>

                      <button
                        onClick={() => onOpenFlashcard(cp.conceptKey)}
                        className="py-1.5 px-2.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Layers className="w-3 h-3 text-amber-400" />
                        <span>Flashcard</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Topic-Level Performance Table */}
      <div className="bg-[#0B1A2F] border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white">Topic-Level Performance Breakdown</h3>
            <p className="text-xs text-slate-400">
              Evaluates your accuracy across specific curriculum objectives.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {topicsList.filter((t) => t.attempted > 0).length} of {topicsList.length} Topics
            Attempted
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Topic</th>
                <th className="py-2.5 px-3">Domain</th>
                <th className="py-2.5 px-3">Attempted</th>
                <th className="py-2.5 px-3">Accuracy</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {topicsList.map((t) => (
                <tr key={t.topic} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-3 font-semibold text-slate-200">{t.topic}</td>
                  <td className="py-3 px-3">
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-medium"
                      style={{
                        backgroundColor: `${DOMAINS[t.domain]?.color}25`,
                        color: DOMAINS[t.domain]?.color,
                      }}
                    >
                      {DOMAINS[t.domain]?.name.split(' ')[0]}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-300">
                    {t.attempted > 0 ? `${t.correct}/${t.attempted}` : '0'}
                  </td>
                  <td className="py-3 px-3 font-mono">
                    {t.attempted > 0 ? (
                      <span
                        className={
                          t.accuracy >= 70 ? 'text-teal-400 font-bold' : 'text-amber-400 font-bold'
                        }
                      >
                        {t.accuracy}%
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {t.status === 'mastered' && (
                      <span className="px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800 text-[10px] font-semibold">
                        Proficient
                      </span>
                    )}
                    {t.status === 'developing' && (
                      <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 text-[10px] font-semibold">
                        Developing
                      </span>
                    )}
                    {t.status === 'needs-work' && (
                      <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-semibold">
                        Needs Work
                      </span>
                    )}
                    {t.status === 'untested' && (
                      <span className="text-slate-500 font-mono text-[10px]">Untested</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => onStartQuizMode('topic', t.domain)}
                      className="text-sky-400 hover:text-sky-300 font-medium inline-flex items-center gap-1"
                    >
                      <span>Drill</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Missed Concepts Registry */}
      <div className="bg-[#0B1A2F] border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-base font-bold text-white">Missed Concepts Registry</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">{missedItems.length} Concepts Flagged</span>
        </div>

        {missedItems.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-900/50 rounded-xl border border-slate-800">
            No concepts currently flagged. As you take quizzes, missed questions will automatically be cataloged here.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {missedItems.map((item) => (
              <div
                key={item.conceptKey}
                className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200">{item.conceptTitle}</span>
                    <span className="text-amber-400 font-mono font-semibold">
                      Missed {item.frequency}x
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Topic: {item.topic}</p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                  <button
                    onClick={() => onOpenCoach(item.conceptKey, item.conceptTitle)}
                    className="flex-1 py-1.5 rounded-lg bg-sky-950 border border-sky-700 text-sky-300 text-xs font-medium flex items-center justify-center gap-1 hover:bg-sky-900"
                  >
                    <Sparkles className="w-3 h-3 text-sky-400" />
                    <span>Explain with Coach</span>
                  </button>
                  <button
                    onClick={() => onOpenFlashcard(item.conceptKey)}
                    className="flex-1 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium flex items-center justify-center gap-1 hover:bg-slate-700"
                  >
                    <Layers className="w-3 h-3 text-slate-400" />
                    <span>Drill Card</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Quiz Sessions Flight Log */}
      <div className="bg-[#0B1A2F] border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-400" />
            <h3 className="text-base font-bold text-white">Recent Quiz Flight History</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {progress.recentQuizzes.length} Sessions Logged
          </span>
        </div>

        {progress.recentQuizzes.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-900/50 rounded-xl border border-slate-800">
            No quiz sessions completed yet. Launch a Flight Sprint to record your first session!
          </div>
        ) : (
          <div className="space-y-2.5">
            {progress.recentQuizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200 capitalize">
                      {quiz.mode} Quiz
                    </span>
                    {quiz.topicFilter && (
                      <span className="text-slate-400 font-mono">({quiz.topicFilter})</span>
                    )}
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                        quiz.passed
                          ? 'bg-teal-950 text-teal-300 border border-teal-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}
                    >
                      {quiz.passed ? 'PASSED' : 'RETRY'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {new Date(quiz.timestamp).toLocaleDateString()} at{' '}
                    {new Date(quiz.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-bold font-mono text-white text-sm">
                      {quiz.scorePercent}%
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {quiz.correctCount}/{quiz.totalQuestions} Correct
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
