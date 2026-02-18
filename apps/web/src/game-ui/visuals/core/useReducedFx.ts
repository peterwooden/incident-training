import { useEffect, useMemo, useState } from "react";
import type { FxProfile } from "@incident/shared";

const STORAGE_KEY = "incident-rpg-fx-profile";

function detectReducedMotionPreference(): FxProfile {
  if (typeof window === "undefined") {
    return "cinematic";
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "reduced" : "cinematic";
}

function loadStoredFxProfile(): FxProfile {
  if (typeof window === "undefined") {
    return "cinematic";
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "cinematic" || stored === "reduced") {
    return stored;
  }
  return detectReducedMotionPreference();
}

export function useReducedFx() {
  const [fxProfile, setFxProfile] = useState<FxProfile>(() => loadStoredFxProfile());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    localStorage.setItem(STORAGE_KEY, fxProfile);
  }, [fxProfile]);

  const controls = useMemo(
    () => ({
      fxProfile,
      setFxProfile,
      toggleFxProfile: () => setFxProfile((prev) => (prev === "cinematic" ? "reduced" : "cinematic")),
      isReducedFx: fxProfile === "reduced",
    }),
    [fxProfile],
  );

  return controls;
}
