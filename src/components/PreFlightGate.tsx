import React, { useState } from 'react';
import {
  ShieldAlert,
  Lock,
  Compass,
  ArrowRight,
  Sparkles,
  Cloud,
  CheckCircle2,
  Cpu,
  BarChart3,
  BookOpen,
  Radio,
  Layers,
  AlertTriangle,
  Flame,
} from 'lucide-react';

interface PreFlightGateProps {
  onSignIn: () => Promise<void>;
  authError?: string | null;
  onClearError?: () => void;
}

export const PreFlightGate: React.FC<PreFlightGateProps> = ({
  onSignIn,
  authError,
  onClearError,
}) => {
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignInClick = async () => {
    setIsSigningIn(true);
    if (onClearError) onClearError();
    try {
      await onSignIn();
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-[82vh] flex flex-col justify-center items-center py-8 px-4 sm:px-6">
      <div className="max-w-4xl w-full space-y-8">
        {/* Status Callout Banner: Separate Operation Enforced */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-xs font-mono font-bold tracking-wider uppercase text-amber-300">
                Mandatory Authorization Barrier • Operation Gate
              </div>
              <div className="text-xs text-amber-200/90 font-medium">
                Flight Deck operations require pilot authentication. Sign in with Google to initialize your session.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono bg-amber-950/70 border border-amber-800/80 px-3 py-1.5 rounded-lg shrink-0">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>ACCESS: LOCKED</span>
          </div>
        </div>

        {/* Main Flight Clearance Card */}
        <div className="relative rounded-3xl bg-gradient-to-b from-[#0F223D] via-[#0B1A30] to-[#071324] border border-sky-500/30 shadow-2xl p-6 sm:p-10 overflow-hidden">
          {/* Subtle radar background ring */}
          <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-sky-500/5 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-teal-500/5 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row gap-8 lg:gap-12 items-center">
            {/* Left Column: Mission Emblem & Action */}
            <div className="w-full lg:w-1/2 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-950/80 border border-sky-700/60 text-sky-300 text-xs font-mono">
                <Lock className="w-3.5 h-3.5 text-sky-400" />
                <span>PILOT IDENTIFICATION REQUIRED</span>
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                  ByteBridge <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-teal-300 to-emerald-400">
                    Flight Operations
                  </span>
                </h1>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Before operating the ByteBridge flight deck, taking practice exams, or recording telemetry,
                  you must authenticate. All test attempts, domain mastery, and study streaks will be securely
                  bound to your account in Cloud Firestore.
                </p>
              </div>

              {/* Error feedback if any */}
              {authError && (
                <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="leading-snug">{authError}</span>
                </div>
              )}

              {/* Primary Google Sign-In Action */}
              <div className="space-y-3 pt-2">
                <button
                  onClick={handleSignInClick}
                  disabled={isSigningIn}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-sky-400 via-teal-400 to-emerald-400 hover:brightness-110 active:scale-[0.99] text-slate-950 font-bold text-sm shadow-xl shadow-sky-950/70 flex items-center justify-center gap-3 transition-all disabled:opacity-60 cursor-pointer"
                >
                  {isSigningIn ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Authenticating with Google...</span>
                    </div>
                  ) : (
                    <>
                      <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-xs">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                          />
                        </svg>
                      </div>
                      <span className="tracking-wide">Log In with Google to Enter</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 font-mono">
                  <Cloud className="w-3.5 h-3.5 text-sky-400" />
                  <span>Persistent Telemetry • Cloud Firestore DB Ready</span>
                </div>
              </div>
            </div>

            {/* Right Column: Two-Phase Operational Architecture */}
            <div className="w-full lg:w-1/2 space-y-4">
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 pb-2 border-b border-slate-800">
                  <span>TWO-PHASE ARCHITECTURE</span>
                  <span className="text-sky-400">SEPARATE OPERATIONS</span>
                </div>

                {/* Phase 1 */}
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-amber-200">
                      Phase 1: Pilot Identification & Security Clearance
                    </div>
                    <div className="text-[11px] text-slate-300">
                      Sign in with Google to establish your cloud session and link Firestore storage.
                    </div>
                  </div>
                </div>

                {/* Phase 2 */}
                <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-800/50 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-300 flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-sky-200">
                      Phase 2: Flight Deck Operational Suite (Unlocked upon login)
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Full access to live simulation, concept coach, Recharts telemetry, and flashcard drills.
                    </div>
                  </div>
                </div>
              </div>

              {/* What Unlocks After Login Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-[#0B1728] border border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-sky-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold text-white">AZ-900 Exam Engine</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-snug">
                    Sprint, Full & Topic Drills across 3 core Microsoft domains.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#0B1728] border border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-teal-400">
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold text-white">Live Telemetry & Trends</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-snug">
                    Weekly Study Summary line chart and Knowledge Checkpoints.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#0B1728] border border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-400">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold text-white">AI Concept Coach</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-snug">
                    Gemini multimodal explanations and targeted remediation.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#0B1728] border border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <Radio className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold text-white">Voice Cockpit</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-snug">
                    Real-time bidirectional Gemini Live oral examination.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security & Cloud Firestore Notice */}
        <div className="text-center text-xs text-slate-500 font-mono">
          ByteBridge • Unofficial AI Study Companion • Firestore Database ID: ai-studio-azureexamflightd-a0b90a0e-0720-45b7-8ce1-cedd0b51c65d
        </div>
      </div>
    </div>
  );
};
