import React from 'react';
import { AlertCircle, ShieldCheck, HardDrive, Cloud } from 'lucide-react';

interface DisclaimerBannerProps {
  variant?: 'footer' | 'inline' | 'compact';
  isCloudSynced?: boolean;
}

export const DisclaimerBanner: React.FC<DisclaimerBannerProps> = ({ variant = 'footer', isCloudSynced }) => {
  if (variant === 'compact') {
    return (
      <div className="bg-slate-900/90 border border-slate-800 text-slate-400 text-xs py-2 px-3 rounded-lg flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <span>Independent, unofficial study tool. Not affiliated with or endorsed by Microsoft.</span>
        </span>
        <span className="text-[10px] text-slate-500 hidden sm:inline">Original AZ-900 prep material</span>
      </div>
    );
  }

  return (
    <footer className="mt-12 border-t border-slate-800 bg-[#070F1E] text-slate-400 text-xs py-6 px-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-3xl">
          <div className="flex items-center gap-2 text-slate-300 font-semibold text-sm">
            <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
            <span>Official Study Disclaimer</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Azure Exam Flight Deck is an independent, unofficial study tool. It is not affiliated with or endorsed by Microsoft. Practice questions are original learning materials and are not actual exam questions.
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg text-slate-400 text-[11px] space-y-1 shrink-0 w-full md:w-auto">
          {isCloudSynced ? (
            <>
              <div className="flex items-center gap-1.5 text-teal-400 font-medium">
                <Cloud className="w-3.5 h-3.5" />
                <span>Cloud Firestore Synced</span>
              </div>
              <p className="text-slate-400">
                Study progress is securely synchronized to your account in Firebase Firestore.
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 text-sky-400 font-medium">
                <HardDrive className="w-3.5 h-3.5" />
                <span>Local Browser Telemetry</span>
              </div>
              <p className="text-slate-400">
                Study progress is stored in local browser memory.
                <br />
                Sign in with Google to synchronize telemetry across devices.
              </p>
            </>
          )}
        </div>
      </div>
    </footer>
  );
};
