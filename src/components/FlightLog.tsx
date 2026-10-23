import React, { useState, useMemo } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Layers,
  Zap,
  Calendar,
  X,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  Activity,
  Filter,
  ArrowUpDown,
  BookOpen,
  RotateCcw,
} from 'lucide-react';
import { UserProgressData, QuizSessionResult, ExamDomain } from '../types';

interface FlightLogProps {
  progress: UserProgressData;
  onStartQuizMode: (mode: 'sprint' | 'full' | 'topic' | 'missed-drill', domain?: ExamDomain) => void;
  onOpenCoach: (conceptKey: string, conceptTitle: string) => void;
  onOpenFlashcard: (conceptKey: string) => void;
  onSeedSampleData?: () => void;
}

export const FlightLog: React.FC<FlightLogProps> = ({
  progress,
  onStartQuizMode,
  onOpenCoach,
  onOpenFlashcard,
  onSeedSampleData,
}) => {
  const [selectedSession, setSelectedSession] = useState<QuizSessionResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<'chronological' | 'reverse'>('reverse');
  const [modeFilter, setModeFilter] = useState<'all' | 'sprint' | 'full' | 'topic' | 'drill'>('all');

  // Grab the last 10 quiz sessions from progress
  const rawRecent = progress?.recentQuizzes || [];
  
  // Sort chronologically by timestamp
  const chronologicalLast10 = useMemo(() => {
    // Make copy and sort by timestamp ascending
    const sorted = [...rawRecent].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    // Take the last 10
    return sorted.slice(-10);
  }, [rawRecent]);

  // Display list based on user preference (reverse-chronological or chronological)
  const displaySessions = useMemo(() => {
    let list = [...chronologicalLast10];
    if (sortOrder === 'reverse') {
      list.reverse();
    }
    if (modeFilter !== 'all') {
      if (modeFilter === 'drill') {
        list = list.filter((s) => s.mode === 'missed-drill' || s.mode === 'checkpoint-drill');
      } else {
        list = list.filter((s) => s.mode === modeFilter);
      }
    }
    return list;
  }, [chronologicalLast10, sortOrder, modeFilter]);

  // Aggregate stats over the last 10 sessions for quick glance
  const stats = useMemo(() => {
    if (chronologicalLast10.length === 0) {
      return { total: 0, avgScore: 0, passCount: 0, passRate: 0, highestScore: 0 };
    }
    const total = chronologicalLast10.length;
    const totalScore = chronologicalLast10.reduce((acc, s) => acc + s.scorePercent, 0);
    const avgScore = Math.round(totalScore / total);
    const passCount = chronologicalLast10.filter((s) => s.passed).length;
    const passRate = Math.round((passCount / total) * 100);
    const highestScore = Math.max(...chronologicalLast10.map((s) => s.scorePercent));
    return { total, avgScore, passCount, passRate, highestScore };
  }, [chronologicalLast10]);

  // Helper to get chronological index (#1 = earliest of the 10, #10 = newest)
  const getChronologicalIndex = (session: QuizSessionResult) => {
    const idx = chronologicalLast10.findIndex((s) => s.id === session.id);
    return idx >= 0 ? idx + 1 : null;
  };

  const formatDateTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const isToday = new Date().toDateString() === date.toDateString();
      const dateLabel = isToday
        ? 'Today'
        : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const timeLabel = date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      });
      return { dateLabel, timeLabel, full: `${dateLabel} • ${timeLabel}` };
    } catch {
      return { dateLabel: isoString, timeLabel: '', full: isoString };
    }
  };

  const getModeLabel = (mode: string) => {
    switch (mode) {
      case 'sprint':
        return 'Flight Sprint (5Q)';
      case 'full':
        return 'Full Exam (10Q)';
      case 'topic':
        return 'Domain Drill';
      case 'missed-drill':
        return 'Remediation Drill';
      case 'checkpoint-drill':
        return 'Checkpoint Drill';
      default:
        return `${mode} Quiz`;
    }
  };

  const openFlightModal = (session: QuizSessionResult) => {
    setSelectedSession(session);
    setIsModalOpen(true);
  };

  return (
    <div className="bg-[#0B1A2F] border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-sky-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">Flight Log</h2>
            <span className="text-[11px] font-mono bg-sky-950 text-sky-300 border border-sky-800 px-2 py-0.5 rounded-full">
              Last 10 Sessions
            </span>
          </div>
          <p className="text-xs text-slate-300">
            Chronological flight records of your most recent quiz sessions for a quick glance at score trajectory.
          </p>
        </div>

        {/* Action button to open full log modal */}
        {chronologicalLast10.length > 0 && (
          <button
            onClick={() => {
              setSelectedSession(chronologicalLast10[chronologicalLast10.length - 1]);
              setIsModalOpen(true);
            }}
            className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-sky-950 hover:bg-sky-900 border border-sky-700/80 text-sky-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Expand Flight Debrief</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Quick Glance Telemetry Summary Cards */}
      {chronologicalLast10.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
            <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
              <span>Recorded Logs</span>
              <Activity className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {stats.total} <span className="text-xs text-slate-400 font-normal">/ 10 max</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Chronological window
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
            <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
              <span>Avg Flight Score</span>
              <Award className="w-3.5 h-3.5 text-teal-400" />
            </div>
            <div
              className={`text-xl font-bold font-mono ${
                stats.avgScore >= 70 ? 'text-teal-400' : 'text-amber-400'
              }`}
            >
              {stats.avgScore}%
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              {stats.avgScore >= 70 ? 'Passing benchmark met' : 'Target: ≥70% score'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
            <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
              <span>Pass Rate</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-bold font-mono text-emerald-400">
              {stats.passRate}%
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              {stats.passCount} of {stats.total} cleared
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
            <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
              <span>Top Score</span>
              <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-xl font-bold font-mono text-indigo-300">
              {stats.highestScore}%
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Peak performance
            </div>
          </div>
        </div>
      )}

      {/* Sorting & Filter Controls */}
      {chronologicalLast10.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800/80 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-mono text-[11px]">Chronology:</span>
            <div className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-slate-800">
              <button
                onClick={() => setSortOrder('reverse')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  sortOrder === 'reverse'
                    ? 'bg-sky-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Newest First
              </button>
              <button
                onClick={() => setSortOrder('chronological')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  sortOrder === 'chronological'
                    ? 'bg-sky-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Oldest First (#1 → #{stats.total})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <Filter className="w-3 h-3 text-slate-400" />
            {(['all', 'sprint', 'full', 'topic', 'drill'] as const).map((filterKey) => (
              <button
                key={filterKey}
                onClick={() => setModeFilter(filterKey)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider transition-colors ${
                  modeFilter === filterKey
                    ? 'bg-slate-800 text-sky-300 border border-sky-600/50'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {filterKey}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Log Sessions List */}
      {displaySessions.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-950/80 border border-sky-800 flex items-center justify-center text-sky-400 mx-auto">
            <Clock className="w-6 h-6 text-sky-400" />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-bold text-white">No Flight Logs Recorded Yet</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              Complete practice sprints or full exam drills to record your last 10 sessions here with full score telemetry.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => onStartQuizMode('sprint')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-400 to-teal-400 text-slate-950 font-bold text-xs hover:brightness-110 shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Launch First Flight Sprint (5Q)</span>
            </button>
            {onSeedSampleData && (
              <button
                onClick={onSeedSampleData}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold cursor-pointer"
              >
                Load Sample Flight Telemetry
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {displaySessions.map((session) => {
            const chronIdx = getChronologicalIndex(session);
            const { dateLabel, timeLabel } = formatDateTime(session.timestamp);
            const isPassing = session.passed;
            const missedCount = session.missedConceptKeys?.length || 0;

            return (
              <div
                key={session.id}
                onClick={() => openFlightModal(session)}
                className="group p-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-sky-500/50 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm hover:shadow-md"
              >
                {/* Left side: Index, Date, Mode */}
                <div className="flex items-center gap-3">
                  {/* Flight sequence badge */}
                  <div className="w-9 h-9 rounded-xl bg-slate-800/80 group-hover:bg-sky-950/70 border border-slate-700 group-hover:border-sky-700 text-slate-300 group-hover:text-sky-300 font-mono font-bold text-xs flex items-center justify-center shrink-0 transition-colors">
                    #{chronIdx || '—'}
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200 text-xs sm:text-sm group-hover:text-white transition-colors">
                        {getModeLabel(session.mode)}
                      </span>
                      {session.topicFilter && (
                        <span className="text-[10px] text-slate-400 font-mono bg-slate-800/80 px-1.5 py-0.5 rounded">
                          {session.topicFilter}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <span>{dateLabel}</span>
                      <span>•</span>
                      <span>{timeLabel}</span>
                    </div>
                  </div>
                </div>

                {/* Right side: Score, Meter, Status & Debrief CTA */}
                <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/60">
                  {/* Score display */}
                  <div className="text-left md:text-right space-y-0.5">
                    <div className="flex items-center md:justify-end gap-2">
                      <span
                        className={`text-base font-extrabold font-mono ${
                          isPassing ? 'text-teal-400' : 'text-amber-400'
                        }`}
                      >
                        {session.scorePercent}%
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        ({session.correctCount}/{session.totalQuestions})
                      </span>
                    </div>

                    {/* Mini progress bar */}
                    <div className="w-24 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isPassing ? 'bg-teal-400' : 'bg-amber-400'
                        }`}
                        style={{ width: `${session.scorePercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Status Pill */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono tracking-wider uppercase ${
                        isPassing
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/70'
                          : 'bg-amber-950/80 text-amber-300 border border-amber-800/70'
                      }`}
                    >
                      {isPassing ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>PASSED</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                          <span>RETRY</span>
                        </>
                      )}
                    </span>

                    {/* Debrief Arrow */}
                    <div className="text-slate-500 group-hover:text-sky-400 transition-colors hidden sm:block">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Flight Log Debrief Modal */}
      {isModalOpen && selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-[#0B1A2F] border border-sky-600/50 rounded-3xl shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-sky-950 border border-sky-800 text-sky-300 text-xs font-mono">
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  <span>
                    Flight Log Entry #{getChronologicalIndex(selectedSession) || '—'}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  {getModeLabel(selectedSession.mode)} Debrief
                </h3>
                <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>{formatDateTime(selectedSession.timestamp).full}</span>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Close Flight Debrief"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Quick Score Metric Card */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs text-slate-400 font-mono">Recorded Score</div>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-3xl font-extrabold font-mono ${
                      selectedSession.passed ? 'text-teal-400' : 'text-amber-400'
                    }`}
                  >
                    {selectedSession.scorePercent}%
                  </span>
                  <span className="text-sm text-slate-400 font-mono">
                    ({selectedSession.correctCount}/{selectedSession.totalQuestions} questions correct)
                  </span>
                </div>
              </div>

              <div
                className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono tracking-wider uppercase flex items-center gap-1.5 ${
                  selectedSession.passed
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                }`}
              >
                {selectedSession.passed ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>FLIGHT CLEARED (≥70%)</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>RETRY NEEDED (&lt;70%)</span>
                  </>
                )}
              </div>
            </div>

            {/* Missed Concepts Section in this flight */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200 uppercase tracking-wider font-mono">
                  Concept Telemetry
                </span>
                <span className="text-slate-400 font-mono">
                  {selectedSession.missedConceptKeys?.length || 0} flagged for review
                </span>
              </div>

              {(!selectedSession.missedConceptKeys || selectedSession.missedConceptKeys.length === 0) ? (
                <div className="p-4 rounded-xl bg-teal-950/20 border border-teal-800/40 text-xs text-teal-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>Flawless Flight: Zero concepts flagged on this flight run!</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedSession.missedConceptKeys.map((conceptKey) => (
                    <div
                      key={conceptKey}
                      className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold text-slate-200 capitalize">
                          {conceptKey.replace(/-/g, ' ')}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Flagged in session telemetry
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setIsModalOpen(false);
                            onOpenCoach(conceptKey, conceptKey.replace(/-/g, ' '));
                          }}
                          className="px-2.5 py-1 rounded-lg bg-sky-950 border border-sky-700 text-sky-300 text-xs font-medium flex items-center gap-1 hover:bg-sky-900 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3 text-sky-400" />
                          <span>AI Coach</span>
                        </button>
                        <button
                          onClick={() => {
                            setIsModalOpen(false);
                            onOpenFlashcard(conceptKey);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 hover:bg-slate-700 cursor-pointer"
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

            {/* Question by Question Answer Log */}
            {selectedSession.answers && selectedSession.answers.length > 0 && (
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                  Recorded Question Ledger ({selectedSession.answers.length} items)
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedSession.answers.map((ans, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-3 ${
                        ans.isCorrect
                          ? 'bg-teal-950/20 border-teal-800/40 text-teal-200'
                          : 'bg-rose-950/20 border-rose-800/40 text-rose-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {ans.isCorrect ? (
                          <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                        )}
                        <span className="font-semibold text-slate-300 truncate">
                          Q{idx + 1}: {ans.topic}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 shrink-0">
                        {ans.domain}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions Footer */}
            <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  onStartQuizMode(selectedSession.mode as any);
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-400 to-teal-400 text-slate-950 font-bold text-xs hover:brightness-110 flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Re-launch This Quiz Mode</span>
              </button>

              <button
                onClick={() => setIsModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold cursor-pointer"
              >
                Close Debrief
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
