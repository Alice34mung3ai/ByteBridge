import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  BookOpen,
  Lightbulb,
  Cloud,
  Scale,
  HelpCircle,
  Send,
  RefreshCw,
  Search,
  CheckCircle,
  MessageSquare,
  AlertCircle,
  Flame,
  ArrowRight,
  Layers,
  Radio,
  Globe,
} from 'lucide-react';
import { CONCEPTS_CATALOG, DOMAINS } from '../data/az900Data';
import { UserProgressData } from '../types';
import { AudioTranscriber } from './AudioTranscriber';
import { SearchGroundingView } from './SearchGroundingView';

interface ConceptCoachProps {
  progress: UserProgressData;
  preselectedConceptKey?: string;
  preselectedConceptTitle?: string;
  questionContext?: string;
  onOpenFlashcard?: (conceptKey: string) => void;
  onOpenVoice?: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export const ConceptCoach: React.FC<ConceptCoachProps> = ({
  progress,
  preselectedConceptKey,
  preselectedConceptTitle,
  questionContext,
  onOpenFlashcard,
  onOpenVoice,
}) => {
  // Concept selection state
  const [selectedConceptKey, setSelectedConceptKey] = useState<string>(
    preselectedConceptKey || 'shared-responsibility'
  );
  const [customQuery, setCustomQuery] = useState<string>('');
  const [activeConceptTitle, setActiveConceptTitle] = useState<string>(
    preselectedConceptTitle || CONCEPTS_CATALOG['shared-responsibility']?.title || 'Shared Responsibility Model'
  );

  // Search Grounding toggle
  const [showSearchGrounding, setShowSearchGrounding] = useState<boolean>(false);

  // Coaching content state
  const [coachingText, setCoachingText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Interactive chat thread
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState<string>('');
  const [isSendingChat, setIsSendingChat] = useState<boolean>(false);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Missed concepts from user progress for quick pills
  const missedConceptsList = Object.values(progress.missedConcepts);

  // Fetch or re-generate coaching breakdown
  const fetchCoaching = async (
    conceptTitle: string,
    conceptKey?: string,
    context?: string,
    differentAnalogy: boolean = false
  ) => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/coach/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conceptTitle,
          conceptKey,
          userContext: context || (questionContext ? `Missed question: "${questionContext}"` : undefined),
          alternativeAnalogyRequested: differentAnalogy,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(`Expected JSON but server returned ${contentType || 'non-JSON'}`);
      }

      const data = await response.json();
      setCoachingText(data.fullText || '');

      // Initialize chat history with the coach's intro message
      setChatHistory([
        {
          id: `msg-${Date.now()}`,
          role: 'model',
          text: data.fullText || `Here is a foundational breakdown of ${conceptTitle}.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err: any) {
      console.warn('Concept Coach API fetch issue, falling back to local catalog:', err);
      // Fallback from catalog
      const localItem = conceptKey ? CONCEPTS_CATALOG[conceptKey] : null;
      if (localItem) {
        const fallbackText = `**Simple Definition**:
${localItem.summary}

**Everyday Analogy**:
${localItem.quickAnalogy}

**The Azure Connection**:
${localItem.azureExample}

**Common Pitfall / Comparison**:
${localItem.commonConfusion}
Key distinction: ${localItem.keyDistinction}

**Coach's Check Question**:
${localItem.sampleCheckQuestion}`;

        setCoachingText(fallbackText);
        setChatHistory([
          {
            id: `msg-${Date.now()}`,
            role: 'model',
            text: fallbackText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } else {
        setErrorMsg('Unable to connect to the Cloud Concept Coach service. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load or when preselected concept changes
  useEffect(() => {
    const targetKey = preselectedConceptKey || selectedConceptKey;
    const item = CONCEPTS_CATALOG[targetKey];
    const title = preselectedConceptTitle || (item ? item.title : 'Shared Responsibility Model');

    setSelectedConceptKey(targetKey);
    setActiveConceptTitle(title);
    fetchCoaching(title, targetKey, questionContext);
  }, [preselectedConceptKey, preselectedConceptTitle]);

  // Send interactive chat message
  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || userInput;
    if (!text.trim() || isSendingChat) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedHistory = [...chatHistory, userMsg];
    setChatHistory(updatedHistory);
    setUserInput('');
    setIsSendingChat(true);

    try {
      const response = await fetch('/api/coach/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conceptTitle: activeConceptTitle,
          conceptKey: selectedConceptKey,
          message: text.trim(),
          history: updatedHistory.map((m) => ({ role: m.role, text: m.text })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat error HTTP ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(`Expected JSON but server returned ${contentType || 'non-JSON'}`);
      }

      const data = await response.json();
      const modelMsg: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: data.reply || 'Let me help clarify this concept further.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChatHistory((prev) => [...prev, modelMsg]);
    } catch (e: any) {
      console.error('Error sending message to coach:', e);
      setChatHistory((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'model',
          text: `I had a temporary connection hiccup, but let's keep focusing on ${activeConceptTitle}. In the AZ-900 exam, the critical rule is understanding who manages each tier and where the boundaries of responsibility lie. Please try sending your thought again or choose a quick prompt below.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsSendingChat(false);
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const handleSelectConcept = (key: string) => {
    setSelectedConceptKey(key);
    const item = CONCEPTS_CATALOG[key];
    const title = item ? item.title : key;
    setActiveConceptTitle(title);
    fetchCoaching(title, key);
  };

  const handleCustomSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuery.trim()) return;
    setActiveConceptTitle(customQuery.trim());
    setSelectedConceptKey('');
    fetchCoaching(customQuery.trim(), undefined, 'Custom learner inquiry');
  };

  return (
    <div className="max-w-4xl mx-auto py-2 space-y-6">
      {/* Header */}
      <div className="bg-[#0F223D]/90 border border-slate-700/80 p-5 rounded-2xl shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-950 border border-sky-800 text-sky-400 text-xs font-mono">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Cloud Concept Coach • Powered by Gemini</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Patient Cloud Computing Tutor
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm">
              Ask anything or select a missed quiz concept. Get simple definitions, real-world
              analogies, and interactive practice without jargon.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {onOpenVoice && (
              <button
                onClick={onOpenVoice}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-950 to-teal-950 hover:from-sky-900 hover:to-teal-900 border border-sky-600/60 text-sky-300 text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors shadow-md active:scale-95"
              >
                <Radio className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                <span>Live Voice Cockpit</span>
              </button>
            )}

            <button
              onClick={() => setShowSearchGrounding(!showSearchGrounding)}
              className={`px-3.5 py-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 shrink-0 transition-all ${
                showSearchGrounding
                  ? 'bg-sky-500 text-slate-950 font-bold border-sky-400'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-teal-400" />
              <span>{showSearchGrounding ? 'Hide Search Grounding' : 'Live Search Grounding'}</span>
            </button>

            {onOpenFlashcard && selectedConceptKey && (
              <button
                onClick={() => onOpenFlashcard(selectedConceptKey)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors"
              >
                <Layers className="w-3.5 h-3.5 text-teal-400" />
                <span>Flashcard</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Search Grounding Panel when enabled */}
        {showSearchGrounding && (
          <div className="pt-2 border-t border-slate-800/80">
            <SearchGroundingView initialConcept={activeConceptTitle} />
          </div>
        )}

        {/* Missed Concepts Quick Bar (if any recorded in progress) */}
        {missedConceptsList.length > 0 && (
          <div className="pt-2 border-t border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Recently Missed in Your Quizzes:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {missedConceptsList.map((mc) => (
                <button
                  key={mc.conceptKey}
                  onClick={() => handleSelectConcept(mc.conceptKey)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${
                    selectedConceptKey === mc.conceptKey
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                      : 'bg-slate-900/80 border-slate-700/80 text-slate-300 hover:border-amber-500/50 hover:bg-slate-800'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>{mc.conceptTitle}</span>
                  <span className="text-[10px] bg-amber-950 text-amber-300 px-1 rounded font-mono">
                    {mc.frequency}x
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Concept Selector Dropdown & Custom Search */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {/* Dropdown from catalog */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Select AZ-900 Core Concept
            </label>
            <select
              value={selectedConceptKey}
              onChange={(e) => handleSelectConcept(e.target.value)}
              className="w-full bg-[#0B1A2F] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="" disabled>
                -- Choose from AZ-900 Curriculum --
              </option>
              {Object.values(CONCEPTS_CATALOG).map((c) => (
                <option key={c.key} value={c.key}>
                  [{DOMAINS[c.domain]?.name.split(' ')[0]}] {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Search Form with AudioTranscriber */}
          <form onSubmit={handleCustomSearch}>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Or Ask / Dictate Any Cloud Topic
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                placeholder="e.g. Sovereign Clouds, SLA 99.99%, ZRS..."
                className="flex-1 bg-[#0B1A2F] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 placeholder-slate-500"
              />
              <AudioTranscriber
                buttonLabel="Dictate"
                onTranscriptionComplete={(text) => {
                  setCustomQuery(text);
                  setActiveConceptTitle(text);
                  setSelectedConceptKey('');
                  fetchCoaching(text, undefined, 'Dictated voice prompt');
                }}
              />
              <button
                type="submit"
                disabled={!customQuery.trim()}
                className="px-3.5 py-2 rounded-xl bg-sky-500 text-slate-950 font-semibold text-xs disabled:opacity-40 hover:bg-sky-400 flex items-center gap-1 shrink-0"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Coach</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Main Coaching Workspace */}
      <div className="bg-[#0B192C] border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col min-h-[550px]">
        {/* Workspace Subheader */}
        <div className="bg-[#0F223D]/60 border-b border-slate-800 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span className="text-xs font-semibold text-slate-200 font-mono">
              Active Topic: {activeConceptTitle}
            </span>
          </div>

          <button
            onClick={() => fetchCoaching(activeConceptTitle, selectedConceptKey, undefined, true)}
            disabled={isLoading}
            className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1.5 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Try Different Analogy</span>
          </button>
        </div>

        {/* Chat / Content Thread */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 max-h-[600px]">
          {isLoading && chatHistory.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-sky-400 animate-spin mx-auto" />
              <div className="text-sm font-medium text-slate-200">
                Your Cloud Coach is preparing a beginner-friendly analogy...
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Consulting Azure architecture principles
              </p>
            </div>
          ) : (
            chatHistory.map((msg, index) => {
              const isModel = msg.role === 'model';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${isModel ? 'justify-start' : 'justify-end'}`}
                >
                  {isModel && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-teal-400 p-0.5 shrink-0 mt-1 shadow-md">
                      <div className="w-full h-full bg-[#0B1A2F] rounded-[10px] flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-sky-400" />
                      </div>
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-md ${
                      isModel
                        ? 'bg-[#0F223D] border border-slate-700/80 text-slate-200'
                        : 'bg-gradient-to-r from-sky-600 to-sky-700 text-white'
                    }`}
                  >
                    {isModel && index === 0 ? (
                      // Render structured concept breakdown on first coach response
                      <div className="space-y-4">
                        <div className="text-slate-100 whitespace-pre-line leading-relaxed font-normal">
                          {msg.text}
                        </div>
                      </div>
                    ) : (
                      // Standard conversational message
                      <div className="whitespace-pre-line">{msg.text}</div>
                    )}
                    <div className="text-[10px] text-slate-400 text-right mt-1 font-mono">
                      {msg.timestamp}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {isSendingChat && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-sky-900/60 border border-sky-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-sky-400 animate-spin" />
              </div>
              <div className="bg-[#0F223D] border border-slate-700/80 rounded-2xl p-3.5 text-xs text-slate-400 font-mono flex items-center gap-2">
                <span>The coach is evaluating your answer...</span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Quick Suggestion Response Pills */}
        <div className="bg-[#0A1626] border-t border-slate-800/80 px-4 py-2 flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-slate-400 font-mono">Quick replies:</span>
          <button
            onClick={() =>
              handleSendMessage("I am not sure of the answer. Can you give me a hint or break it down simpler?")
            }
            className="text-[11px] px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-teal-300 border border-teal-800/60"
          >
            "I'm not sure, give me a hint"
          </button>
          <button
            onClick={() =>
              handleSendMessage("I am still confused about how this works. Can you give me another everyday analogy?")
            }
            className="text-[11px] px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-sky-300 border border-sky-800/60"
          >
            "Give another analogy"
          </button>
          <button
            onClick={() => handleSendMessage("What is the most common exam trap for this topic?")}
            className="text-[11px] px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-amber-300 border border-amber-800/60"
          >
            "What's the exam trap?"
          </button>
        </div>

        {/* Chat Input Bar */}
        <div className="p-4 bg-[#0B1A2F] border-t border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Answer the coach's question or ask for clarification..."
              disabled={isSendingChat}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
            <AudioTranscriber
              buttonLabel="Speak"
              onTranscriptionComplete={(text) => {
                setUserInput(text);
              }}
            />
            <button
              type="submit"
              disabled={!userInput.trim() || isSendingChat}
              className="px-4 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-teal-400 text-slate-950 font-semibold text-sm disabled:opacity-40 hover:brightness-110 transition-all flex items-center gap-1.5 shrink-0"
            >
              <span>Reply</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
          <p className="text-[11px] text-slate-500 text-center mt-2">
            The Concept Coach will evaluate your response before revealing the answer.
          </p>
        </div>
      </div>
    </div>
  );
};
