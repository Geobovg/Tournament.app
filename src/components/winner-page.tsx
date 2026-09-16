import Link from "next/link";
import { tournamentThemes } from "@/lib/theme";
import type { TournamentType } from "@/lib/tournament/types";
import { ThemeBackdrop } from "./tournament-theme";
import { WinnerAudio } from "./winner-audio";

const QUOTES = [
  { by: "José Mourinho", text: "Absolute cinema!" },
  {
    by: "Pep Guardiola",
    text: "Take the ball, pass the ball, take the ball, pass the ball, beautiful!",
  },
  {
    by: "Gennaro Gattuso",
    text: "Sometimes maybe got, sometimes maybe shit, this was got!",
  },
  { by: "Martin (15)", text: "Det er klart det er stort." },
];

/** Trekkes per forespørsel, utenfor render, så React-reglene holdes rene. */
async function randomQuote() {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

const CONFETTI_COLORS = [
  "#ffd447",
  "#ff5a7a",
  "#4ad1ff",
  "#5ce08a",
  "#ffffff",
  "#ff9f43",
  "#c084fc",
];

function Confetti() {
  const pieces = Array.from({ length: 70 }, (_, index) => ({
    left: (index * 33 + (index % 5) * 7) % 100,
    delay: ((index * 17) % 60) / 10,
    duration: 5 + ((index * 11) % 45) / 10,
    width: 6 + (index % 4) * 2,
    height: 9 + (index % 3) * 4,
    drift: ((index % 9) - 4) * 14,
    spin: 540 + (index % 6) * 180,
    color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
    round: index % 6 === 0,
  }));

  return (
    <div aria-hidden className="confetti">
      {pieces.map((piece, index) => (
        <span
          key={index}
          className="confetti__piece"
          style={
            {
              left: `${piece.left}%`,
              width: `${piece.width}px`,
              height: `${piece.height}px`,
              background: piece.color,
              borderRadius: piece.round ? "9999px" : "1px",
              animationDelay: `${piece.delay}s`,
              animationDuration: `${piece.duration}s`,
              "--drift": `${piece.drift}px`,
              "--spin": `${piece.spin}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

function Trophy() {
  return (
    <svg viewBox="0 0 200 250" className="winner-trophy" role="img" aria-label="Pokal">
      <defs>
        <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff3b8" />
          <stop offset="35%" stopColor="#f2c744" />
          <stop offset="70%" stopColor="#d99b24" />
          <stop offset="100%" stopColor="#8a5d10" />
        </linearGradient>
        <linearGradient id="goldDark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d9a52c" />
          <stop offset="100%" stopColor="#8a5d10" />
        </linearGradient>
        <radialGradient id="shine">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="100" cy="236" rx="74" ry="10" fill="rgba(0,0,0,0.35)" />

      <path
        d="M52 18 H148 V70 C148 106 128 132 100 138 C72 132 52 106 52 70 Z"
        fill="url(#gold)"
        stroke="#7d5310"
        strokeWidth="2"
      />
      <path d="M58 24 H142 V34 H58 Z" fill="#fff6cf" opacity="0.55" />
      <ellipse cx="78" cy="58" rx="12" ry="30" fill="url(#shine)" />

      <path
        d="M52 30 C24 30 18 48 22 62 C27 80 44 90 58 92"
        fill="none"
        stroke="url(#goldDark)"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path
        d="M148 30 C176 30 182 48 178 62 C173 80 156 90 142 92"
        fill="none"
        stroke="url(#goldDark)"
        strokeWidth="9"
        strokeLinecap="round"
      />

      <rect x="92" y="136" width="16" height="30" fill="url(#goldDark)" />
      <path d="M74 166 H126 L118 186 H82 Z" fill="url(#gold)" stroke="#7d5310" strokeWidth="2" />
      <rect x="56" y="186" width="88" height="20" rx="4" fill="url(#gold)" stroke="#7d5310" strokeWidth="2" />
      <rect x="44" y="206" width="112" height="24" rx="5" fill="url(#goldDark)" stroke="#7d5310" strokeWidth="2" />

      <g fill="#fff3b8">
        <path d="M100 46 l5 11 12 1 -9 8 3 12 -11 -6 -11 6 3 -12 -9 -8 12 -1 Z" />
      </g>
    </svg>
  );
}

export async function WinnerPage({
  type,
  tournamentName,
  winnerName,
  tournamentId,
}: {
  type: TournamentType;
  tournamentName: string;
  winnerName: string;
  tournamentId: string;
}) {
  const quote = await randomQuote();
  const theme = tournamentThemes[type];

  return (
    <div data-theme={type} className="winner-page">
      <ThemeBackdrop />
      <Confetti />
      <WinnerAudio />

      <div className="theme-fade grid justify-items-center gap-6 text-center">
        <p className="winner-kicker">
          {theme.emoji} {tournamentName} · ferdig
        </p>

        <Trophy />

        <div className="grid gap-3">
          <h1 className="winner-name">{winnerName}</h1>
          <p className="winner-line">
            {winnerName} vinner {tournamentName}!
          </p>
          <p className="winner-prize">Premie: Gratis ting i kiosken.</p>
        </div>

        <div className="winner-medals" aria-hidden>
          <span>🏆</span>
          <span>🥇</span>
          <span>🎉</span>
          <span>🥈</span>
          <span>🏅</span>
        </div>

        <figure className="winner-quote">
          <blockquote>«{quote.text}»</blockquote>
          <figcaption>— {quote.by}</figcaption>
        </figure>

        <div className="flex flex-wrap justify-center gap-3">
          <Link href={`/tournaments/${tournamentId}/stats`} className="winner-link">
            Se statistikk
          </Link>
          <Link href="/" className="winner-link">
            Alle turneringer
          </Link>
        </div>
      </div>
    </div>
  );
}
