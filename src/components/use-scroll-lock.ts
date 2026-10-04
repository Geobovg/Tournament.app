"use client";

import { useEffect } from "react";

// Låser siden bak et fullskjermsvindu, så den ikke kan rulles opp eller ned mens vinduet er åpent.
export function useScrollLock(active = true) {
  useEffect(() => {
    if (!active) return;
    const { documentElement: html, body } = document;
    const previous = { htmlOverflow: html.style.overflow, bodyOverflow: body.style.overflow, overscroll: html.style.overscrollBehavior };
    html.style.overflow = "hidden"; body.style.overflow = "hidden"; html.style.overscrollBehavior = "none";
    return () => { html.style.overflow = previous.htmlOverflow; body.style.overflow = previous.bodyOverflow; html.style.overscrollBehavior = previous.overscroll; };
  }, [active]);
}
