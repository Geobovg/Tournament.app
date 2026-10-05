"use client";

import { useEffect } from "react";

// iOS (særlig som hjemskjerm-app) glemmer av og til å flytte faste elementer tilbake når tastaturet
// lukkes eller appen hentes fram igjen, så fanelinjen og musikkknappen blir hengende midt på skjermen.
// En rulling på én piksel fram og tilbake tvinger Safari til å regne ut posisjonene på nytt.
function repairFixedPositions() {
  const { scrollX, scrollY } = window;
  window.scrollTo(scrollX, scrollY + 1);
  window.scrollTo(scrollX, scrollY);
}

/** Retter opp faste elementer som iOS lar ligge igjen der tastaturet var. Viser ingenting selv. */
export function FixedPositionRepair() {
  useEffect(() => {
    const viewport = window.visualViewport;
    let lastHeight = viewport?.height ?? window.innerHeight;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Tastaturanimasjonen må bli ferdig før posisjonene kan rettes.
    const repairSoon = () => { clearTimeout(timer); timer = setTimeout(repairFixedPositions, 120); };
    // Tastaturet er åpent mens den synlige delen er mye lavere enn vinduet; da skjules fanelinjen.
    const updateKeyboard = () => {
      const height = viewport?.height ?? window.innerHeight;
      document.documentElement.toggleAttribute("data-keyboard-open", height < window.innerHeight * 0.8);
      if (height > lastHeight) repairSoon();
      lastHeight = height;
    };
    const onVisible = () => { if (document.visibilityState === "visible") repairSoon(); };
    viewport?.addEventListener("resize", updateKeyboard);
    window.addEventListener("focusout", repairSoon);
    window.addEventListener("orientationchange", repairSoon);
    window.addEventListener("pageshow", repairSoon);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      viewport?.removeEventListener("resize", updateKeyboard);
      window.removeEventListener("focusout", repairSoon);
      window.removeEventListener("orientationchange", repairSoon);
      window.removeEventListener("pageshow", repairSoon);
      document.removeEventListener("visibilitychange", onVisible);
      document.documentElement.removeAttribute("data-keyboard-open");
    };
  }, []);
  return null;
}
