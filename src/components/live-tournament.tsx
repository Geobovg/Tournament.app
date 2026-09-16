"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Keeps paired players in sync without exposing the database directly to browsers. */
export function LiveTournament() {
  const router = useRouter();
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = window.setInterval(refresh, 3_000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [router]);
  return null;
}
