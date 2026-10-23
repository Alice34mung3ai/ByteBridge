import React, { useState } from 'react';
import { Globe, Search, ExternalLink, Sparkles, Loader2, BookOpen, AlertCircle } from 'lucide-react';

interface SearchGroundingViewProps {
  initialConcept?: string;
}

export const SearchGroundingView: React.FC<SearchGroundingViewProps> = ({ initialConcept }) => {
  const [query, setQuery] = useState<string>(initialConcept || 'Microsoft Entra ID latest AZ-900 exam changes');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [resultText, setResultText] = useState<string | null>(null);
  const [sources, setSources] = useState<{ title: string; uri: string }[]>([]);
  const [searchQueries, setSearchQueries] = useState<string[]>([]);

  const handleSearch = async (targetQuery?: string) => {
    const q = targetQuery || query;
    if (!q.trim() || isLoading) return;

    setIsLoading(true);
    setResultText(null);
    setSources([]);

    try {
      const response = await fetch('/api/coach/search-grounded', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        setResultText(data.text || '');
        setSources(data.sources || []);
        setSearchQueries(data.searchQueries || []);
      }
    } catch (e) {
      console.error('Search grounding error:', e);
      setResultText('Unable to fetch live search grounding at this moment.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#0F223D]/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-950 border border-sky-800 text-sky-400 text-xs font-mono">
            <Globe className="w-3.5 h-3.5" />
            <span>Search Grounding • Gemini 3.8 Flash (googleSearch)</span>
          </div>
          <h3 className="text-base font-bold text-white">Live Azure Documentation & Exam Grounding</h3>
          <p className="text-xs text-slate-400">
            Real-time web search grounding to verify the latest service renames, regional expansions, and syllabus updates.
          </p>
        </div>
      </div>

      {/* Query Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch();
        }}
        className="flex items-center gap-2"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search live Azure facts, e.g. 'Azure Storage Cold tier vs Archive' or 'Entra ID P1 vs P2'..."
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 placeholder-slate-500"
        />
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 disabled:opacity-40 hover:brightness-110 shrink-0"
        >
          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          <span>Verify Live</span>
        </button>
      </form>

      {/* Pre-flight fast query tags */}
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
        <span className="font-mono">Quick fact checks:</span>
        {[
          'Azure Active Directory to Entra ID rebranding',
          'Current Azure Region count and Availability Zones',
          'Azure Blob Storage Cold access tier requirements',
          'Sovereign Cloud regions for US Government',
        ].map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => {
              setQuery(tag);
              handleSearch(tag);
            }}
            className="px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Grounded Results Output */}
      {isLoading && (
        <div className="p-8 text-center space-y-2 rounded-xl bg-slate-900/50 border border-slate-800">
          <Loader2 className="w-6 h-6 text-sky-400 animate-spin mx-auto" />
          <div className="text-xs text-slate-300 font-medium">Searching live Google data for latest Azure documentation...</div>
        </div>
      )}

      {resultText && (
        <div className="space-y-4 animate-fadeIn">
          <div className="p-5 rounded-xl bg-slate-900/80 border border-sky-900/60 text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line shadow-inner">
            {resultText}
          </div>

          {/* Sources and Citations */}
          {sources.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="text-xs text-slate-400 font-mono font-semibold flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-teal-400" />
                <span>Grounded Web Sources:</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {sources.map((src, idx) => (
                  <a
                    key={idx}
                    href={src.uri}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sky-300 text-xs transition-colors"
                  >
                    <ExternalLink className="w-3 h-3 text-sky-400" />
                    <span className="truncate max-w-xs">{src.title}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
