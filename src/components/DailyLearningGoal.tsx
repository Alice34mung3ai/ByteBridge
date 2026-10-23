import React, { useState, useEffect, useMemo } from 'react';
import { Target, CheckCircle2, Flame, Award, ArrowRight, Zap, Edit2 } from 'lucide-react';
import { UserProgressData } from '../types';

interface DailyLearningGoalProps {
  progress: UserProgressData;
  onStartQuizMode?: (mode: 'sprint' | 'full' | 'topic' | 'missed-drill') => void;
}

const STORAGE_GOAL_KEY = 'az900_daily_learning_goal_target';

export const DailyLearningGoal: React.FC<DailyLearningGoalProps> = ({
  progress,
  onStartQuizMode,
}) => {
  const [dailyTarget, setDailyTarget] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_GOAL_KEY);
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val > 0 && val <= 100) return val;
      }
    } catch (e) {}
    return 10;
  });

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [customInputValue, setCustomInputValue] = useState<string>('10');

  // Save target changes to localStorage
  const handleSetTarget = (target: number) => {
    const clamped = Math.max(3, Math.min(50, target));
    setDailyTarget(clamped);
    setIsEditing(false);
    try {
      localStorage.setItem(STORAGE_GOAL_KEY, clamped.toString());
    } catch (e) {}
  };

  // Compute questions completed today from recentQuizzes
  const todayDateStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const todayQuestionsCount = useMemo(() => {
    const quizzes = progress?.recentQuizzes || [];
    const todayQuizzes = quizzes.filter((q) => {
      if (!q.timestamp) return false;
      return q.timestamp.startsWith(todayDateStr);
    });

    return todayQuizzes.reduce((sum, q) => sum + (q.totalQuestions || 0), 0);
  }, [progress?.recentQuizzes, todayDateStr]);

  const percentage = Math.min(100, Math.round((todayQuestionsCount / dailyTarget) * 100));
  const isGoalReached = todayQuestionsCount >= dailyTarget;
  const remaining = Math.max(0, dailyTarget - todayQuestionsCount);

  return (
    <div className="bg-[#0B1A2F] border border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">Daily Learning Goal</h3>
              {isGoalReached ? (
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-teal-950 border border-teal-600/70 text-teal-300 font-mono">
                  <CheckCircle2 className="w-3 h-3 text-teal-400" />
                  <span>Target Achieved</span>
                </span>
              ) : (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                  {remaining} remaining today
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Set your questions-per-day target to maintain certification momentum.
            </p>
          </div>
        </div>

        {/* Target configuration selector */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto font-mono text-xs">
          {!isEditing ? (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-xs">Target:</span>
              <span className="px-2.5 py-1 rounded-lg bg-sky-950/70 border border-sky-800 text-sky-300 font-bold">
                {dailyTarget} Qs/day
              </span>
              <button
                onClick={() => {
                  setCustomInputValue(dailyTarget.toString());
                  setIsEditing(true);
                }}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                title="Change Daily Target"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-700">
              {[5, 10, 15, 20].map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleSetTarget(preset)}
                  className={`px-2 py-1 rounded-lg transition-all ${
                    dailyTarget === preset
                      ? 'bg-sky-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {preset}
                </button>
              ))}
              <button
                onClick={() => setIsEditing(false)}
                className="px-2 py-1 text-slate-500 hover:text-slate-300 text-[11px]"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar & Numerical Metrics */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-300">
            Progress: <strong className="text-white font-bold">{todayQuestionsCount}</strong> / {dailyTarget} questions answered
          </span>
          <span className={`font-bold ${isGoalReached ? 'text-teal-400' : 'text-sky-400'}`}>
            {percentage}%
          </span>
        </div>

        {/* Visual Progress Track */}
        <div className="w-full bg-slate-800/90 h-3 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isGoalReached
                ? 'bg-gradient-to-r from-teal-400 to-emerald-400 shadow-sm shadow-teal-500/50'
                : 'bg-gradient-to-r from-sky-500 to-teal-400'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Goal Status Message and CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs pt-1">
        <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
          {isGoalReached ? (
            <span className="text-teal-300 flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-teal-400" />
              Daily target achieved! Outstanding dedication.
            </span>
          ) : (
            <span>
              {remaining} more questions needed to complete today's mission.
            </span>
          )}
        </div>

        {!isGoalReached && onStartQuizMode && (
          <button
            onClick={() => onStartQuizMode('sprint')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-colors shadow-md shadow-sky-950/40 self-start sm:self-auto"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Practice 5 Qs Now</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
