import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Info } from 'lucide-react';

// Simulation of AdMob Banner
export const BannerAd: React.FC = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 h-14 bg-gray-100 border-t border-gray-200 flex items-center justify-center z-40">
      <div className="bg-gray-300 w-[320px] h-[50px] flex items-center justify-center text-[10px] text-gray-600 font-mono">
        BANNER AD (320x50) - TEST MODE
      </div>
    </div>
  );
};

// Simulation of AdMob Interstitial
export const useInterstitialAd = () => {
  const [show, setShow] = useState(false);
  const [actionCount, setActionCount] = useState(0);

  const triggerAction = useCallback(() => {
    setActionCount(prev => {
      const next = prev + 1;
      if (next >= 3) {
        setShow(true);
        return 0;
      }
      return next;
    });
  }, []);

  const InterstitialAd: React.FC = () => {
    if (!show) return null;
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-6"
      >
        <button 
          onClick={() => setShow(false)}
          className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full"
        >
          <X size={24} />
        </button>
        <div className="bg-white w-full max-w-sm aspect-[9/16] rounded-lg flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-2 left-2 bg-black/20 text-[10px] px-2 py-0.5 rounded text-white">Ad</div>
          <div className="text-gray-400 mb-4">
            <Play size={64} fill="currentColor" />
          </div>
          <h3 className="text-xl font-bold text-gray-800">Interstitial Ad</h3>
          <p className="text-gray-500 text-center px-8 mt-2">This is a simulated full-screen interstitial ad.</p>
          <button 
            onClick={() => setShow(false)}
            className="mt-8 bg-blue-600 text-white px-8 py-2 rounded-full font-medium"
          >
            Learn More
          </button>
        </div>
      </motion.div>
    );
  };

  return { triggerAction, InterstitialAd };
};

// Simulation of AdMob App Open Ad
export const useAppOpenAd = () => {
  const [show, setShow] = useState(false);
  const AD_UNIT_ID = 'ca-app-pub-1716530640183973/8613328709';

  useEffect(() => {
    // Trigger the ad to show shortly after the app loads
    const timer = setTimeout(() => {
      setShow(true);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const AppOpenAd: React.FC = () => {
    if (!show) return null;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        className="fixed inset-0 bg-white z-[200] flex flex-col items-center justify-center p-6"
      >
        <div className="absolute top-4 right-4">
          <button
            onClick={() => setShow(false)}
            className="bg-slate-100 text-slate-600 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 hover:bg-slate-200 transition-colors"
          >
            Continue to App <X size={16} />
          </button>
        </div>
        <div className="flex flex-col items-center text-center max-w-sm">
          <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
            <span className="font-black text-2xl">Ad</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">App Open Ad</h2>
          <p className="text-slate-500 mb-8">This is a simulated App Open ad that appears when you launch or return to the app.</p>
          <div className="bg-slate-50 p-4 rounded-xl w-full border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ad Unit ID</p>
            <p className="text-xs font-mono text-slate-700 break-all">{AD_UNIT_ID}</p>
          </div>
        </div>
      </motion.div>
    );
  };

  return { AppOpenAd };
};
export const useRewardedAd = () => {
  const [show, setShow] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [onReward, setOnReward] = useState<(() => void) | null>(null);

  // User's AdMob Rewarded Ad Unit ID
  const AD_UNIT_ID = 'ca-app-pub-1716530640183973/8383265974';

  const showRewarded = (callback: () => void) => {
    setOnReward(() => callback);
    setShow(true);
  };

  useEffect(() => {
    let interval: any;
    if (isWatching) {
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsWatching(false);
            setShow(false);
            if (onReward) onReward();
            setProgress(0);
            return 100;
          }
          return prev + 2;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isWatching, onReward]);

  const RewardedAd: React.FC = () => {
    if (!show) return null;
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-6"
      >
        {!isWatching ? (
          <div className="bg-white p-8 rounded-2xl max-w-xs w-full text-center">
            <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Play size={32} fill="currentColor" />
            </div>
            <h3 className="text-xl font-bold mb-2">Watch Ad?</h3>
            <p className="text-gray-600 mb-6 text-sm">Watch a short video to unlock the Premium Report feature.</p>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => setIsWatching(true)}
                className="bg-blue-600 text-white py-3 rounded-xl font-bold"
              >
                Watch Video
              </button>
              <button 
                onClick={() => setShow(false)}
                className="text-gray-500 py-2 text-sm"
              >
                Maybe Later
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-sm">
            <div className="bg-white/10 h-2 w-full rounded-full overflow-hidden mb-4">
              <motion.div 
                className="bg-yellow-400 h-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-white text-center font-mono text-sm mb-2">REWARDED AD PLAYING... {Math.round(progress)}%</p>
            <p className="text-gray-500 text-center font-mono text-[10px]">Ad Unit: {AD_UNIT_ID}</p>
          </div>
        )}
      </motion.div>
    );
  };

  return { showRewarded, RewardedAd };
};
