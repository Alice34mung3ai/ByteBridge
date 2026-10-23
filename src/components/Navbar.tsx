import React, { useState } from 'react';
import {
  Compass,
  LayoutDashboard,
  CheckCircle2,
  Sparkles,
  Layers,
  BarChart3,
  Flame,
  Menu,
  X,
  Shield,
} from 'lucide-react';
import { UserProgressData } from '../types';

import { User } from 'firebase/auth';
import { Cloud, Radio, LogIn, LogOut, UserCheck } from 'lucide-react';

export type NavTab = 'dashboard' | 'quiz' | 'coach' | 'flashcards' | 'progress';

interface NavbarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  progress: UserProgressData;
  currentUser?: User | null;
  onSignIn?: () => void;
  onSignOut?: () => void;
  onOpenVoice?: () => void;
  isVoiceActive?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  progress,
  currentUser,
  onSignIn,
  onSignOut,
  onOpenVoice,
  isVoiceActive,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const attempted = progress?.questionsAttempted || 0;
  const correct = progress?.questionsCorrect || 0;
  const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : null;
  const missedCount = Object.keys(progress?.missedConcepts || {}).length;

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'dashboard',
      label: 'Flight Deck',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'quiz',
      label: 'Practice Quiz',
      icon: <CheckCircle2 className="w-4 h-4" />,
    },
    {
      id: 'coach',
      label: 'Concept Coach',
      icon: <Sparkles className="w-4 h-4 text-sky-400" />,
      badge: missedCount > 0 ? `${missedCount} Missed` : undefined,
    },
    {
      id: 'flashcards',
      label: 'Flashcards',
      icon: <Layers className="w-4 h-4" />,
    },
    {
      id: 'progress',
      label: 'Telemetry',
      icon: <BarChart3 className="w-4 h-4" />,
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#0B192C]/95 backdrop-blur border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Brand */}
          <div
            onClick={() => onSelectTab('dashboard')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0284C7] to-[#0D9488] p-0.5 shadow-md shadow-sky-900/40 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#0B192C] rounded-[10px] flex items-center justify-center">
                <Compass className="w-5 h-5 text-sky-400 group-hover:rotate-45 transition-transform duration-300" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-100 text-base sm:text-lg tracking-tight">
                  Azure Exam <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-teal-300">Flight Deck</span>
                </span>
                <span className="text-[10px] font-semibold bg-sky-950/80 text-sky-300 border border-sky-800/60 px-1.5 py-0.5 rounded">
                  AZ-900
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono hidden sm:block">
                ByteBridge • Unofficial AI Study Companion
              </p>
            </div>
          </div>

          {/* Desktop Navigation - Operational only when authenticated */}
          {currentUser ? (
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30 shadow-inner'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          ) : (
            <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0A1628] border border-amber-500/30 text-amber-300 text-xs font-mono">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>OPERATION 1 OF 2: PILOT AUTHENTICATION FIRST</span>
            </div>
          )}

          {/* Right side Actions: Live Voice + Auth + Telemetry */}
          <div className="hidden lg:flex items-center gap-2.5">
            {/* Live Voice Button */}
            {onOpenVoice && (
              <button
                onClick={onOpenVoice}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all shadow-md active:scale-95 ${
                  isVoiceActive
                    ? 'bg-rose-950/80 border-rose-500 text-rose-300 animate-pulse'
                    : 'bg-gradient-to-r from-sky-950 to-teal-950 hover:from-sky-900 hover:to-teal-900 border-sky-700/70 text-sky-300'
                }`}
              >
                <Radio className="w-3.5 h-3.5 text-sky-400" />
                <span>Live Voice</span>
              </button>
            )}

            {/* Auth Button / User Profile */}
            {currentUser ? (
              <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 py-1 px-2.5 rounded-xl text-xs">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User'}
                    className="w-5 h-5 rounded-full object-cover border border-teal-500/50"
                  />
                ) : (
                  <UserCheck className="w-4 h-4 text-teal-400" />
                )}
                <div className="flex flex-col text-left">
                  <span className="text-[11px] font-bold text-slate-200 truncate max-w-[100px]">
                    {currentUser.displayName?.split(' ')[0] || 'Cadet'}
                  </span>
                  <span className="text-[9px] text-teal-400 flex items-center gap-0.5 font-mono">
                    <Cloud className="w-2.5 h-2.5" />
                    <span>Cloud Sync</span>
                  </span>
                </div>
                {onSignOut && (
                  <button
                    onClick={onSignOut}
                    title="Sign Out"
                    className="ml-1 p-1 hover:text-rose-400 text-slate-500 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : onSignIn ? (
              <button
                onClick={onSignIn}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 transition-colors shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5 text-teal-400" />
                <span>Google Sign-In</span>
              </button>
            ) : null}

            {accuracy !== null && (
              <div className="flex items-center gap-1.5 text-xs bg-slate-900/90 border border-slate-800 px-2.5 py-1.5 rounded-lg">
                <span className="text-slate-400 font-mono">Acc:</span>
                <span
                  className={`font-bold font-mono ${
                    accuracy >= 70 ? 'text-teal-400' : 'text-amber-400'
                  }`}
                >
                  {accuracy}%
                </span>
              </div>
            )}

            <div className="flex items-center gap-1 text-xs bg-amber-950/40 border border-amber-900/50 text-amber-300 px-2.5 py-1.5 rounded-lg font-mono">
              <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>{progress?.studyStreakDays || 1}d streak</span>
            </div>
          </div>

          {/* Mobile Actions and hamburger */}
          <div className="md:hidden flex items-center gap-2">
            {onOpenVoice && (
              <button
                onClick={onOpenVoice}
                className="p-2 rounded-lg bg-sky-950 text-sky-400 border border-sky-800"
                title="Live Voice"
              >
                <Radio className="w-4 h-4 animate-pulse" />
              </button>
            )}

            {currentUser ? (
              <span className="w-2.5 h-2.5 rounded-full bg-teal-400 ring-2 ring-teal-900" title="Cloud Synced" />
            ) : onSignIn ? (
              <button
                onClick={onSignIn}
                className="text-[11px] px-2 py-1 rounded bg-slate-900 border border-slate-700 text-teal-400 font-semibold"
              >
                Sign In
              </button>
            ) : null}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-[#0B192C] px-4 pt-3 pb-4 space-y-2">
          {currentUser && (
            <div className="p-3 bg-slate-900 rounded-xl flex items-center justify-between text-xs text-slate-200">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-teal-400" />
                <span>{currentUser.email}</span>
              </div>
              {onSignOut && (
                <button
                  onClick={onSignOut}
                  className="text-xs text-rose-400 hover:text-rose-300 font-medium"
                >
                  Sign Out
                </button>
              )}
            </div>
          )}
          {!currentUser ? (
            <div className="p-4 rounded-xl bg-slate-900/90 border border-amber-500/30 text-center space-y-3">
              <div className="text-xs text-amber-300 font-mono font-bold">
                PILOT AUTHENTICATION REQUIRED FIRST
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Exam simulation and flight deck telemetry are locked. One has to log in first with Google to begin operations.
              </p>
              {onSignIn && (
                <button
                  onClick={() => {
                    onSignIn();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-400 to-teal-400 text-slate-950 font-bold text-xs shadow-md"
                >
                  Log In with Google First
                </button>
              )}
            </div>
          ) : (
            navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium ${
                    isActive
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                      : 'text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] font-semibold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </header>
  );
};
