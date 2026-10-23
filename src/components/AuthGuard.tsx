import React from 'react';
import { User } from 'firebase/auth';
import { Cloud, Lock, Sparkles, ShieldCheck, ArrowRight, UserCheck, Smartphone, Laptop } from 'lucide-react';

interface AuthGuardProps {
  currentUser: User | null;
  onSignIn: () => void;
  children: React.ReactNode;
  viewTitle?: string;
  description?: string;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  currentUser,
  onSignIn,
  children,
  viewTitle = 'Sign In to Track',
  description = 'Sign in with your Google account to track your flight telemetry, quiz scores, and study streak across all your devices.',
}) => {
  if (currentUser) {
    return <>{children}</>;
  }

  return (
    <div className="max-w-2xl mx-auto my-12 p-8 sm:p-10 rounded-3xl bg-gradient-to-b from-[#0F2442] to-[#0A1628] border border-sky-600/40 shadow-2xl text-center space-y-6">
      {/* Visual Aviation / Cloud Synchronization Icon Illustration */}
      <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
        {/* Animated glow circle */}
        <div className="absolute inset-0 rounded-full bg-sky-500/20 blur-xl animate-pulse" />
        
        <div className="relative z-10 w-20 h-20 rounded-2xl bg-gradient-to-br from-[#123159] to-[#0D203D] border border-sky-500/50 flex items-center justify-center text-sky-400 shadow-xl">
          <Cloud className="w-10 h-10 text-sky-400" />
        </div>

        <div className="absolute -top-1 -right-1 z-20 w-8 h-8 rounded-full bg-teal-500/20 border border-teal-400/60 flex items-center justify-center text-teal-300">
          <Lock className="w-4 h-4" />
        </div>
      </div>

      <div className="space-y-2 max-w-lg mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-800 text-amber-300 text-xs font-mono">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Pilot Authentication Required</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Sign In to Access Operations
        </h2>
        <p className="text-slate-300 text-sm leading-relaxed">
          {description}
        </p>
      </div>

      {/* Cloud Sync Benefit Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-2">
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center gap-2 text-sky-400">
            <Smartphone className="w-4 h-4" />
            <Laptop className="w-4 h-4" />
          </div>
          <div className="text-xs font-bold text-white">Cross-Device Sync</div>
          <div className="text-[11px] text-slate-400">
            Access your readiness stats on phone, laptop, or tablet.
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center gap-2 text-teal-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-xs font-bold text-white">Saved Progress</div>
          <div className="text-[11px] text-slate-400">
            Your quiz results and flashcard mastery stay permanently preserved.
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center gap-2 text-amber-400">
            <UserCheck className="w-4 h-4" />
          </div>
          <div className="text-xs font-bold text-white">Personalized AI</div>
          <div className="text-[11px] text-slate-400">
            Gemini Concept Coach personalizes drills to your missed topics.
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={onSignIn}
          className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-sky-400 to-teal-400 hover:brightness-110 active:scale-[0.99] text-slate-950 font-bold text-sm shadow-lg shadow-sky-950/60 flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <span>Log In with Google First</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="text-[11px] text-slate-400 font-mono">
        Free & instant • Powered by Google Firebase Firestore Authentication
      </div>
    </div>
  );
};
