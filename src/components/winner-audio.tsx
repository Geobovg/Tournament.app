"use client";

import { useEffect, useRef, useState } from "react";

const TRACK = "/audio/Ooh%20La%20La.mp3";

export function WinnerAudio() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [needsTap, setNeedsTap] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    let cancelled = false;
    audio.volume = 0.45;

    audio.play().catch(() => {
      // Nettleseren krever et klikk når siden ikke ble åpnet rett etter en handling.
      if (!cancelled) setNeedsTap(true);
    });

    return () => {
      // Å fjerne et <audio>-element fra DOM-en stopper den IKKE av seg selv –
      // uten denne pausen fortsetter låten å spille i bakgrunnen etter man har
      // navigert bort fra vinnersiden.
      cancelled = true;
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

  useEffect(() => {
    if (!needsTap) return;
    let cancelled = false;

    const start = () => {
      if (cancelled) return;
      audioRef.current?.play().then(
        () => {
          if (!cancelled) setNeedsTap(false);
        },
        () => {},
      );
    };

    window.addEventListener("pointerdown", start, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("pointerdown", start);
    };
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
