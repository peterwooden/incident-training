import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AudioCue } from "@incident/shared";

const STORAGE_KEY = "incident-rpg-audio-settings";

interface AudioSettings {
  muted: boolean;
  volume: number;
}

const CUE_PROFILE: Record<AudioCue, { frequency: number; duration: number }> = {
  warning: { frequency: 660, duration: 0.12 },
  strike: { frequency: 220, duration: 0.18 },
  spread: { frequency: 320, duration: 0.1 },
  success: { frequency: 780, duration: 0.15 },
  fail: { frequency: 170, duration: 0.22 },
};

function loadSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { muted: false, volume: 0.45 };
    }
    const parsed = JSON.parse(raw) as AudioSettings;
    return {
      muted: Boolean(parsed.muted),
      volume: Math.max(0, Math.min(1, Number(parsed.volume) || 0.45)),
    };
  } catch {
    return { muted: false, volume: 0.45 };
  }
}

export function useAudioBus() {
  const [settings, setSettings] = useState<AudioSettings>(() => loadSettings());
  const contextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const ensureContext = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") {
      return null;
    }
    if (!contextRef.current) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) {
        return null;
      }
      contextRef.current = new Ctx();
    }
    return contextRef.current;
  }, []);

  const triggerCue = useCallback(
    (cue?: AudioCue) => {
      if (!cue || settings.muted) {
        return;
      }

      const context = ensureContext();
      if (!context) {
        return;
      }

      const profile = CUE_PROFILE[cue];
      const now = context.currentTime;

      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = "triangle";
      oscillator.frequency.value = profile.frequency;

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, settings.volume), now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + profile.duration);

      oscillator.connect(gain);
      gain.connect(context.destination);

      oscillator.start(now);
      oscillator.stop(now + profile.duration + 0.01);
    },
    [ensureContext, settings.muted, settings.volume],
  );

  const controls = useMemo(
    () => ({
      settings,
      setMuted: (muted: boolean) => setSettings((prev) => ({ ...prev, muted })),
      setVolume: (volume: number) => setSettings((prev) => ({ ...prev, volume: Math.max(0, Math.min(1, volume)) })),
      triggerCue,
    }),
    [settings, triggerCue],
  );

  return controls;
}
