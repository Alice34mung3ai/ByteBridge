import React, { useState, useEffect } from 'react';
import { Navbar, NavTab } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { QuizView } from './components/QuizView';
import { ConceptCoach } from './components/ConceptCoach';
import { FlashcardsView } from './components/FlashcardsView';
import { ProgressView } from './components/ProgressView';
import { DisclaimerBanner } from './components/DisclaimerBanner';
import { AuthGuard } from './components/AuthGuard';
import {
  loadProgress,
  recordQuizCompletion,
  updateFlashcardProgress,
  resetProgress,
  seedSampleProgress,
} from './utils/storage';
import { UserProgressData, ExamDomain, QuizSessionResult } from './types';
import { CONCEPTS_CATALOG } from './data/az900Data';

// React Error Boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Flight Deck Caught Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-xl mx-auto my-12 p-8 rounded-2xl bg-slate-900 border border-rose-500/50 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center font-bold text-xl">
            !
          </div>
          <h2 className="text-xl font-bold text-white">ByteBridge Telemetry Restart</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            A temporary display issue occurred. Click below to re-align telemetry without losing your study progress.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-400 to-teal-400 text-slate-950 font-bold text-xs hover:brightness-110 shadow-lg"
          >
            Refresh ByteBridge
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

import { User, onAuthStateChanged } from 'firebase/auth';
import {
  auth,
  signInWithGoogle,
  logOut,
  syncTelemetryToFirestore,
  loadTelemetryFromFirestore,
  testFirestoreConnection,
} from './lib/firebase';
import { VoiceCockpit } from './components/VoiceCockpit';
import { PreFlightGate } from './components/PreFlightGate';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [progress, setProgress] = useState<UserProgressData>(() => loadProgress());
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showVoiceCockpit, setShowVoiceCockpit] = useState<boolean>(false);

  // Inter-tab navigation state
  const [coachTarget, setCoachTarget] = useState<{
    conceptKey?: string;
    conceptTitle?: string;
    questionContext?: string;
  }>({});

  const [flashcardTargetKey, setFlashcardTargetKey] = useState<string | undefined>(undefined);
  const [quizLauncherConfig, setQuizLauncherConfig] = useState<{
    mode: 'sprint' | 'full' | 'topic' | 'missed-drill' | 'checkpoint-drill';
    domain?: ExamDomain;
    conceptKey?: string;
    conceptTitle?: string;
  }>({ mode: 'sprint' });

  // In-UI reset confirmation dialog state
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  // Notification / toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      if (user) {
        try {
          const cloudData = await loadTelemetryFromFirestore(user.uid);
          if (cloudData) {
            setProgress((prev) => {
              const merged: UserProgressData = {
                ...prev,
                questionsAttempted: Math.max(prev.questionsAttempted || 0, cloudData.questionsAttempted || 0),
                questionsCorrect: Math.max(prev.questionsCorrect || 0, cloudData.questionsCorrect || 0),
                studyStreakDays: Math.max(prev.studyStreakDays || 1, cloudData.studyStreakDays || 1),
                domainStats: {
                  ...prev.domainStats,
                  ...(cloudData.domainStats || {}),
                },
                topicStats: {
                  ...prev.topicStats,
                  ...(cloudData.topicStats || {}),
                },
                missedConcepts: {
                  ...prev.missedConcepts,
                  ...(cloudData.missedConcepts || {}),
                },
                flashcardStates: {
                  ...prev.flashcardStates,
                  ...(cloudData.flashcardStates || {}),
                },
              };
              return merged;
            });
            showToast(`Clearance Granted: Welcome Pilot ${user.displayName || 'Cadet'}.`);
          } else {
            // Push current local progress to Firestore
            await syncTelemetryToFirestore(user.uid, progress);
            showToast(`Pilot profile initialized. Telemetry active.`);
          }
        } catch (e: any) {
          console.warn('Telemetry cloud sync deferred (running with local progress):', e?.message || e);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setAuthError(null);
    try {
      const user = await signInWithGoogle();
      showToast(`Welcome aboard, ${user.displayName || 'Flight Pilot'}!`);
    } catch (err: any) {
      console.error('Sign-in error:', err);
      if (err.code === 'auth/popup-blocked') {
        setAuthError('Browser blocked the sign-in popup. Please allow popups for this site and click retry.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-in window was closed before completing. Click below to try again.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        setAuthError('Sign-in request was cancelled. Please try again.');
      } else {
        setAuthError(err.message || 'Authentication error. Please retry.');
      }
      showToast('Sign in required to operate.');
    }
  };

  const handleSignOut = async () => {
    try {
      await logOut();
      setActiveTab('dashboard');
      showToast('Signed out of Flight Deck. Operator session closed.');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  // Open a concept directly in the Gemini Concept Coach
  const handleOpenCoach = (
    conceptKey: string,
    conceptTitle?: string,
    questionContext?: string
  ) => {
    const title =
      conceptTitle || CONCEPTS_CATALOG[conceptKey]?.title || 'Cloud Architecture & Services';
    setCoachTarget({
      conceptKey,
      conceptTitle: title,
      questionContext,
    });
    setActiveTab('coach');
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {}
  };

  // Open a concept directly in Flashcards
  const handleOpenFlashcard = (conceptKey: string) => {
    setFlashcardTargetKey(conceptKey);
    setActiveTab('flashcards');
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {}
  };

  // Start a specific quiz mode from Dashboard or Progress
  const handleStartQuizMode = (
    mode: 'sprint' | 'full' | 'topic' | 'missed-drill' | 'checkpoint-drill',
    domain?: ExamDomain,
    conceptKey?: string,
    conceptTitle?: string
  ) => {
    setQuizLauncherConfig({ mode, domain, conceptKey, conceptTitle });
    setActiveTab('quiz');
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {}
  };

  // Record a completed quiz
  const handleQuizComplete = (result: QuizSessionResult) => {
    const updated = recordQuizCompletion(result);
    setProgress(updated);
    if (currentUser) {
      syncTelemetryToFirestore(currentUser.uid, updated);
    }
    if (result.passed) {
      showToast(`Quiz Passed! ${result.scorePercent}% recorded to flight telemetry.`);
    } else {
      showToast(`Quiz Completed (${result.scorePercent}%). Missed concepts flagged for review.`);
    }
  };

  // Update flashcard mastery
  const handleUpdateFlashcard = (cardId: string, status: 'know' | 'need-practice') => {
    const updated = updateFlashcardProgress(cardId, status);
    setProgress(updated);
    if (currentUser) {
      syncTelemetryToFirestore(currentUser.uid, updated);
    }
  };

  // Load sample demo telemetry
  const handleSeedSampleData = () => {
    const sample = seedSampleProgress();
    setProgress(sample);
    showToast('Loaded sample practice telemetry. Explore your dashboard!');
  };

  // Confirm reset progress
  const executeResetProgress = () => {
    const fresh = resetProgress();
    setProgress(fresh);
    setShowResetConfirm(false);
    showToast('Flight telemetry reset to zero.');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#070F1E] text-slate-100 flex flex-col items-center justify-center p-6 space-y-4">
        <div className="relative w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-sky-500/20 animate-ping" />
          <div className="w-16 h-16 rounded-full border-2 border-sky-500/30 border-t-sky-400 animate-spin flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-sky-950 flex items-center justify-center text-sky-400 font-bold text-xs">
              AZ
            </div>
          </div>
        </div>
        <div className="text-center space-y-1">
          <div className="text-xs font-mono font-bold tracking-widest text-sky-300 uppercase">
            INITIALIZING FLIGHT DECK AVIONICS
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Checking Pilot Credentials & Cloud Firestore Connection...
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#070F1E] text-slate-100 flex flex-col font-sans antialiased selection:bg-sky-500 selection:text-slate-950">
        {/* Reset Confirmation Dialog Modal */}
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
            <div className="max-w-md w-full bg-[#0F223D] border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
              <h3 className="text-lg font-bold text-white">Reset Study Progress?</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                This will erase your recorded quiz scores, practice accuracy, and flashcard review counts on this device. This cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={executeResetProgress}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
                >
                  Confirm Reset
                </button>
              </div>
            </div>
          </div>
        )}
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 border border-sky-500/60 text-sky-200 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-medium flex items-center gap-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-teal-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        progress={progress}
        currentUser={currentUser}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onOpenVoice={currentUser ? () => setShowVoiceCockpit(true) : undefined}
        isVoiceActive={showVoiceCockpit}
      />

      {/* Main Content View Container - Cleanly separated operations */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!currentUser ? (
          /* Operation 1: Pilot Identification & Clearance Gateway */
          <PreFlightGate
            onSignIn={handleSignIn}
            authError={authError}
            onClearError={() => setAuthError(null)}
          />
        ) : (
          /* Operation 2: Full Flight Deck Operations Suite */
          <>
            {activeTab === 'dashboard' && (
              <Dashboard
                progress={progress}
                onNavigate={(tab) => {
                  setActiveTab(tab);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onStartQuizMode={handleStartQuizMode}
                onOpenCoach={handleOpenCoach}
                onOpenFlashcard={handleOpenFlashcard}
                onSeedSampleData={handleSeedSampleData}
                onResetProgress={() => setShowResetConfirm(true)}
              />
            )}

            {activeTab === 'quiz' && (
              <QuizView
                progress={progress}
                onQuizComplete={handleQuizComplete}
                onOpenCoach={handleOpenCoach}
                onOpenFlashcard={handleOpenFlashcard}
                initialMode={quizLauncherConfig.mode}
                initialDomain={quizLauncherConfig.domain}
                initialConceptKey={quizLauncherConfig.conceptKey}
                initialConceptTitle={quizLauncherConfig.conceptTitle}
              />
            )}

            {activeTab === 'coach' && (
              <ConceptCoach
                progress={progress}
                preselectedConceptKey={coachTarget.conceptKey}
                preselectedConceptTitle={coachTarget.conceptTitle}
                questionContext={coachTarget.questionContext}
                onOpenFlashcard={handleOpenFlashcard}
                onOpenVoice={() => setShowVoiceCockpit(true)}
              />
            )}

            {activeTab === 'flashcards' && (
              <FlashcardsView
                progress={progress}
                onUpdateFlashcard={handleUpdateFlashcard}
                onOpenCoach={handleOpenCoach}
                initialConceptKey={flashcardTargetKey}
              />
            )}

            {activeTab === 'progress' && (
              <ProgressView
                progress={progress}
                onOpenCoach={handleOpenCoach}
                onOpenFlashcard={handleOpenFlashcard}
                onStartQuizMode={handleStartQuizMode}
              />
            )}
          </>
        )}
      </main>

      {/* Real-time Voice Cockpit Gemini Live Modal (Only for Authenticated Operators) */}
      {showVoiceCockpit && currentUser && (
        <VoiceCockpit onClose={() => setShowVoiceCockpit(false)} />
      )}

      {/* Official Required Disclaimer & Cloud/Local Sync Footer */}
      <DisclaimerBanner variant="footer" isCloudSynced={!!currentUser} />
    </div>
    </ErrorBoundary>
  );
}
