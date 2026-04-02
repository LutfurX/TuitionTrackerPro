import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Info } from 'lucide-react';
import { AdMob, BannerAdPosition, BannerAdSize, BannerAdPluginEvents, AdMobBannerSize } from '@capacitor-community/admob';

// --- AD UNIT IDs ---
// Replace these with your REAL IDs from AdMob Console
const AD_UNIT_IDS = {
  BANNER: 'ca-app-pub-3940256099942544/6300978111', // Test Banner
  INTERSTITIAL: 'ca-app-pub-3940256099942544/1033173712', // Test Interstitial
  REWARDED: 'ca-app-pub-3940256099942544/5224354917', // Test Rewarded
  APP_OPEN: 'ca-app-pub-3940256099942544/3419835294', // Test App Open
};

// Real AdMob Banner
export const BannerAd: React.FC = () => {
  useEffect(() => {
    const showBanner = async () => {
      try {
        await AdMob.showBanner({
          adId: AD_UNIT_IDS.BANNER,
          adSize: BannerAdSize.BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
          margin: 0,
          isTesting: true // Set to false for production
        });
      } catch (e) {
        console.error('Banner Error:', e);
      }
    };

    showBanner();

    return () => {
      AdMob.removeBanner();
    };
  }, []);

  return null; // Banner is managed by the native plugin, doesn't need React UI
};

// Real AdMob Interstitial
export const useInterstitialAd = () => {
  const [actionCount, setActionCount] = useState(0);

  useEffect(() => {
    AdMob.prepareInterstitial({
      adId: AD_UNIT_IDS.INTERSTITIAL,
      isTesting: true
    });
  }, []);

  const triggerAction = useCallback(async () => {
    setActionCount(prev => {
      const next = prev + 1;
      if (next >= 3) {
        AdMob.showInterstitial();
        // Prepare next one
        AdMob.prepareInterstitial({
          adId: AD_UNIT_IDS.INTERSTITIAL,
          isTesting: true
        });
        return 0;
      }
      return next;
    });
  }, []);

  const InterstitialAd: React.FC = () => null; // Managed by native

  return { triggerAction, InterstitialAd };
};

// Real AdMob App Open Ad
export const useAppOpenAd = () => {
  useEffect(() => {
    const showAppOpen = async () => {
      try {
        // App Open is usually shown on app launch
        // In Capacitor, you might need to handle this in app state changes
      } catch (e) {
        console.error('App Open Error:', e);
      }
    };
    showAppOpen();
  }, []);

  const AppOpenAd: React.FC = () => null;
  return { AppOpenAd };
};

// Real AdMob Rewarded Ad
export const useRewardedAd = () => {
  const [onReward, setOnReward] = useState<(() => void) | null>(null);

  useEffect(() => {
    AdMob.prepareRewardVideoAd({
      adId: AD_UNIT_IDS.REWARDED,
      isTesting: true
    });

    const rewardListener = AdMob.addListener('onRewardedVideoAdReward', (info) => {
      if (onReward) onReward();
    });

    return () => {
      rewardListener.remove();
    };
  }, [onReward]);

  const showRewarded = async (callback: () => void) => {
    setOnReward(() => callback);
    try {
      await AdMob.showRewardVideoAd();
      // Prepare next one
      AdMob.prepareRewardVideoAd({
        adId: AD_UNIT_IDS.REWARDED,
        isTesting: true
      });
    } catch (e) {
      console.error('Rewarded Error:', e);
    }
  };

  const RewardedAd: React.FC = () => null;

  return { showRewarded, RewardedAd };
};