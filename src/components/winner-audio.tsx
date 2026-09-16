"use client";

import { useEffect, useRef, useState } from "react";

const TRACK = "/audio/Ooh%20La%20La.mp3";

export function WinnerAudio() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [needsTap, setNeedsTap] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.45;
    audio.play().catch(() => {
      // Nettleseren krever et klikk når siden ikke ble åpnet rett etter en handling.
      setNeedsTap(true);
    });
  }, []);

  useEffect(() => {
    if (!needsTap) return;
    const start = () => {
      audioRef.current?.play().then(
        () => setNeedsTap(false),
        () => {},
      );
    };
    window.addEventListener("pointerdown", start, { once: true });
    return () => window.removeEventListener("pointerdown", start);
  }, [needsTap]);

  return (
    <>
      <audio ref={audioRef} src={TRACK} loop preload="auto" />
      {needsTap ? (
        <p className="winner-sound-hint">🔈 Trykk hvor som helst for lyd</p>
      ) : null}
    </>
  );
}
