import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  Activity,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Zap,
  Award,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import { UserProgressData } from '../types';

interface WeeklyStudySummaryProps {
  progress: UserProgressData;
  onStartQuizMode?: (mode: 'sprint' | 'full' | 'topic' | 'missed-drill') => void;
}

interface DayTrendPoint {
  dateKey: string;
  displayDay: string;
  fullDate: string;
  questions: number;
  accuracy: number | null;
  correctCount: number;
  quizzesCount: number;
  passedThreshold: boolean;
}

export const WeeklyStudySummary: React.FC<WeeklyStudySummaryProps> = ({
  progress,
  onStartQuizMode,
}) => {
  const [timeRange, setTimeRange] = useState<'7d' | '14d'>('7d');
  const [activeMetric, setActiveMetric] = useState<'both' | 'questions' | 'accuracy'>('both');

  const daysCount = timeRange === '7d' ? 7 : 14;

  // Aggregate user quizzes by day
  const trendData = useMemo<DayTrendPoint[]>(() => {
    const points: DayTrendPoint[] = [];
    const recentQuizzes = progress?.recentQuizzes || [];
    const today = new Date();

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];

      // Format for X-axis: e.g. "Mon" or "10/22"
      const weekdayStr = d.toLocaleDateString(undefined, { weekday: 'short' });
      const monthDayStr = d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
      const displayDay = daysCount <= 7 ? weekdayStr : `${weekdayStr} ${monthDayStr}`;
      const fullDate = d.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

      // Filter quizzes completed on this date
      const matchingQuizzes = recentQuizzes.filter((q) => {
        if (!q.timestamp) return false;
        return q.timestamp.startsWith(dateKey);
      });

      const dayQuestions = matchingQuizzes.reduce((acc, q) => acc + (q.totalQuestions || 0), 0);
      const dayCorrect = matchingQuizzes.reduce((acc, q) => acc + (q.correctCount || 0), 0);
      const dayAccuracy =
        dayQuestions > 0 ? Math.round((dayCorrect / dayQuestions) * 100) : null;

      points.push({
        dateKey,
        displayDay,
        fullDate,
        questions: dayQuestions,
        accuracy: dayAccuracy,
        correctCount: dayCorrect,
        quizzesCount: matchingQuizzes.length,
        passedThreshold: dayAccuracy !== null && dayAccuracy >= 70,
      });
    }

    return points;
  }, [progress?.recentQuizzes, daysCount]);

  // Aggregate stats across the selected period
  const totalPeriodQuestions = useMemo(
    () => trendData.reduce((acc, p) => acc + p.questions, 0),
    [trendData]
  );

  const totalPeriodCorrect = useMemo(
    () => trendData.reduce((acc, p) => acc + p.correctCount, 0),
    [trendData]
  );

  const averagePeriodAccuracy = useMemo(() => {
    return totalPeriodQuestions > 0
      ? Math.round((totalPeriodCorrect / totalPeriodQuestions) * 100)
      : 0;
  }, [totalPeriodQuestions, totalPeriodCorrect]);

  const peakDay = useMemo(() => {
    let peak = trendData[0];
    for (const p of trendData) {
      if (p.questions > (peak?.questions || 0)) {
        peak = p;
      }
    }
    return peak && peak.questions > 0 ? peak : null;
  }, [trendData]);

  const activeDaysCount = useMemo(
    () => trendData.filter((p) => p.questions > 0).length,
    [trendData]
  );

  const daysAboveBenchmark = useMemo(
    () => trendData.filter((p) => p.passedThreshold).length,
    [trendData]
  );

  // Custom Dark Aviation Tooltip for Recharts
  const renderCustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const point = payload[0]?.payload as DayTrendPoint;
    if (!point) return null;

    return (
      <div className="bg-[#0B1728] border border-slate-700/90 rounded-xl p-3.5 shadow-2xl space-y-2 min-w-[200px] text-xs font-sans">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
          <span className="font-semibold text-white">{point.fullDate}</span>
          <span className="text-[11px] font-mono text-slate-400">
            {point.quizzesCount} {point.quizzesCount === 1 ? 'session' : 'sessions'}
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
              <span className="text-slate-300">Questions Answered:</span>
            </div>
            <span className="font-mono font-bold text-sky-300">{point.questions}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-400 inline-block" />
              <span className="text-slate-300">Practice Accuracy:</span>
            </div>
            <span
              className={`font-mono font-bold ${
                point.accuracy === null
                  ? 'text-slate-500'
                  : point.accuracy >= 70
                  ? 'text-teal-400'
                  : 'text-amber-400'
              }`}
            >
              {point.accuracy !== null ? `${point.accuracy}%` : 'No data'}
            </span>
          </div>

          {point.questions > 0 && (
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
              <span>Correct Score:</span>
              <span className="font-mono text-slate-300">
                {point.correctCount} / {point.questions} correct
              </span>
            </div>
          )}

          {point.accuracy !== null && (
            <div className="pt-1">
              <span
                className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-mono ${
                  point.accuracy >= 70
                    ? 'bg-teal-950 text-teal-300 border border-teal-700/60'
                    : 'bg-amber-950 text-amber-300 border border-amber-700/60'
                }`}
              >
                {point.accuracy >= 70 ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-teal-400" />
                    <span>Meeting AZ-900 Target (≥70%)</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3 text-amber-400" />
                    <span>Below 70% Benchmark</span>
                  </>
                )}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#0B1A2F] border border-slate-700/80 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-sky-400" />
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Weekly Study Summary
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-sky-950 border border-sky-800 text-sky-400 font-mono">
              Activity & Accuracy Trends
            </span>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm">
            Telemetry trendline mapping your questions answered and quiz accuracy against the AZ-900 70% passing benchmark.
          </p>
        </div>

        {/* View toggles */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          {/* Timeframe pill toggle */}
          <div className="inline-flex p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setTimeRange('7d')}
              className={`px-3 py-1 rounded-lg transition-all ${
                timeRange === '7d'
                  ? 'bg-sky-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setTimeRange('14d')}
              className={`px-3 py-1 rounded-lg transition-all ${
                timeRange === '14d'
                  ? 'bg-sky-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              14 Days
            </button>
          </div>

          {/* Metric selector pill */}
          <div className="inline-flex p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setActiveMetric('both')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeMetric === 'both'
                  ? 'bg-slate-700 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Show both questions and accuracy lines"
            >
              Dual
            </button>
            <button
              onClick={() => setActiveMetric('questions')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeMetric === 'questions'
                  ? 'bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Show questions volume line"
            >
              Questions
            </button>
            <button
              onClick={() => setActiveMetric('accuracy')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeMetric === 'accuracy'
                  ? 'bg-teal-500/20 text-teal-300 font-semibold border border-teal-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Show accuracy % line"
            >
              Accuracy %
            </button>
          </div>
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total Questions in Period */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span>Questions in Period</span>
            <span className="w-2 h-2 rounded-full bg-sky-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white">
            {totalPeriodQuestions}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {activeDaysCount} active study {activeDaysCount === 1 ? 'day' : 'days'}
          </div>
        </div>

        {/* Avg Accuracy in Period */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span>Average Accuracy</span>
            <span className="w-2 h-2 rounded-full bg-teal-400" />
          </div>
          <div
            className={`text-xl sm:text-2xl font-bold font-mono ${
              totalPeriodQuestions === 0
                ? 'text-slate-500'
                : averagePeriodAccuracy >= 70
                ? 'text-teal-400'
                : 'text-amber-400'
            }`}
          >
            {totalPeriodQuestions > 0 ? `${averagePeriodAccuracy}%` : '—'}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {averagePeriodAccuracy >= 70 ? 'Target achieved (≥70%)' : 'Passing goal: 70%'}
          </div>
        </div>

        {/* Peak Activity Day */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span>Peak Activity Day</span>
            <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-base sm:text-lg font-bold text-indigo-300 truncate font-mono">
            {peakDay ? peakDay.displayDay : 'No activity'}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {peakDay ? `${peakDay.questions} questions drilled` : 'Take a quiz to set peak'}
          </div>
        </div>

        {/* Benchmark Consistency */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span>Passing Target Days</span>
            <Award className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-teal-300">
            {daysAboveBenchmark}
            <span className="text-xs font-normal text-slate-400 ml-1">/ {Math.max(1, activeDaysCount)} active</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Days scoring ≥70%
          </div>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#071322] border border-slate-800/90 space-y-4">
        {/* Chart Legend / Guide */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-300 pb-2 border-b border-slate-800/60">
          <div className="flex items-center gap-4">
            {(activeMetric === 'both' || activeMetric === 'questions') && (
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-sky-400 rounded-full" />
                <span className="text-sky-300">Questions Answered (Left Axis)</span>
              </div>
            )}
            {(activeMetric === 'both' || activeMetric === 'accuracy') && (
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-teal-400 rounded-full" />
                <span className="text-teal-300">Accuracy % (Right Axis)</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <span className="w-3 border-t-2 border-dashed border-emerald-500/70" />
            <span>70% Passing Threshold</span>
          </div>
        </div>

        {/* Recharts Container */}
        <div className="w-full h-64 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={trendData}
              margin={{ top: 12, right: 18, left: -10, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1e293b"
                vertical={false}
              />

              <XAxis
                dataKey="displayDay"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                tickLine={{ stroke: '#334155' }}
              />

              {/* Left Y Axis: Questions Count */}
              {(activeMetric === 'both' || activeMetric === 'questions') && (
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  stroke="#38bdf8"
                  allowDecimals={false}
                  tick={{ fill: '#7dd3fc', fontSize: 11, fontFamily: 'monospace' }}
                  tickLine={{ stroke: '#38bdf8' }}
                  domain={[0, (dataMax: number) => Math.max(dataMax + 2, 8)]}
                  unit=" Q"
                />
              )}

              {/* Right Y Axis: Accuracy % */}
              {(activeMetric === 'both' || activeMetric === 'accuracy') && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#2dd4bf"
                  tick={{ fill: '#5eead4', fontSize: 11, fontFamily: 'monospace' }}
                  tickLine={{ stroke: '#2dd4bf' }}
                  domain={[0, 100]}
                  unit="%"
                />
              )}

              {/* 70% Reference Line for Exam Readiness */}
              {(activeMetric === 'both' || activeMetric === 'accuracy') && (
                <ReferenceLine
                  yAxisId="right"
                  y={70}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: '70% Target',
                    position: 'insideTopRight',
                    fill: '#34d399',
                    fontSize: 10,
                    fontFamily: 'monospace',
                  }}
                />
              )}

              <Tooltip content={renderCustomTooltip} />

              {/* Line: Questions */}
              {(activeMetric === 'both' || activeMetric === 'questions') && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="questions"
                  name="Questions"
                  stroke="#38bdf8"
                  strokeWidth={3}
                  dot={{ fill: '#0f172a', stroke: '#38bdf8', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#38bdf8', stroke: '#ffffff', strokeWidth: 2 }}
                />
              )}

              {/* Line: Accuracy % */}
              {(activeMetric === 'both' || activeMetric === 'accuracy') && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="accuracy"
                  name="Accuracy %"
                  stroke="#2dd4bf"
                  strokeWidth={3}
                  connectNulls={true}
                  dot={{ fill: '#0f172a', stroke: '#2dd4bf', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#2dd4bf', stroke: '#ffffff', strokeWidth: 2 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Bottom Context Banner / Action Prompt */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <Calendar className="w-3.5 h-3.5 text-sky-400" />
            <span>
              {totalPeriodQuestions === 0
                ? 'No quiz sessions recorded for this window yet. Complete a quiz to plot real data.'
                : `Recorded across ${trendData.length} days of Azure practice flight telemetry.`}
            </span>
          </div>

          {onStartQuizMode && (
            <button
              onClick={() => onStartQuizMode('sprint')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/40 font-semibold transition-colors text-xs self-start sm:self-auto"
            >
              <Zap className="w-3.5 h-3.5 text-sky-400" />
              <span>Launch 5-Question Sprint</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
