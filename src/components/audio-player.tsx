"use client";

import { useEffect, useRef, useState } from "react";
import type { Track } from "@/lib/audio";

const PREFERENCE_KEY = "futebol_music";
const VOLUME = 0.4;

function pickOther(current: number, total: number): number {
  if (total < 2) return 0;
  return (current + 1 + Math.floor(Math.random() * (total - 1))) % total;
}

export function AudioPlayer({ tracks }: { tracks: Track[] }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const untouched = useRef(true);
  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (tracks.length === 0) return;
    if (localStorage.getItem(PREFERENCE_KEY) !== "on") return;
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = VOLUME;
    audio
      .play()
      .then(() => {
        untouched.current = false;
        setPlaying(true);
      })
      .catch(() => {
        // Nettleseren krever et klikk før lyd kan starte på en ny sideinnlasting.
      });
  }, [tracks.length]);

  if (tracks.length === 0) return null;

  const track = tracks[index];

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = VOLUME;

    if (playing) {
      audio.pause();
      setPlaying(false);
      localStorage.setItem(PREFERENCE_KEY, "off");
      return;
    }

    localStorage.setItem(PREFERENCE_KEY, "on");
    setPlaying(true);

    const next = untouched.current ? pickOther(index, tracks.length) : index;
    untouched.current = false;
    if (next === index) {
      void audio.play().catch(() => setPlaying(false));
    } else {
      setIndex(next);
    }
  }

  return (
    <div className="audio-fab">
      <audio
        ref={audioRef}
        src={track.src}
        preload="none"
        autoPlay={playing}
        onEnded={() => setIndex(pickOther(index, tracks.length))}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Skru av musikken" : "Spill turneringsmusikk"}
        className="text-lg leading-none"
      >
        {playing ? "🔊" : "🎵"}
      </button>
      <span className="audio-fab__title">
        {playing ? track.title : "Turneringsmusikk"}
      </span>
    </div>
  );
}
