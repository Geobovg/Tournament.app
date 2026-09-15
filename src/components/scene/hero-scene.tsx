import { tournamentThemes } from "@/lib/theme";
import type { TournamentType } from "@/lib/tournament/types";
import { CrestArt } from "./crest";
import { Figure } from "./figure";
import { Shirt } from "./shirt";

type Variant = "wide" | "narrow";

const LAYOUT = {
  wide: { w: 1200, h: 540, kitScale: 1, wallRows: [3, 7] },
  narrow: { w: 540, h: 520, kitScale: 0.72, wallRows: [3, 4] },
} as const;

const PALETTE = {
  fifa: {
    sky: ["#0d3d24", "#07200f"],
    light: "#d8ffe4",
    stand: "#08281a",
    grass: ["#2f9e4f", "#27843f"],
    line: "rgba(255,255,255,0.55)",
    boards: "#0b2d1c",
  },
  nhl: {
    sky: ["#11365c", "#061423"],
    light: "#e6f4ff",
    stand: "#0a2138",
    grass: ["#e8f3ff", "#d3e6f8"],
    line: "rgba(20,60,110,0.35)",
    boards: "#0d2a45",
  },
} as const;

function Floodlights({
  w,
  h,
  color,
  uid,
}: {
  w: number;
  h: number;
  color: string;
  uid: string;
}) {
  const rig = Math.max(34, w * 0.075);
  return (
    <>
      <defs>
        <radialGradient id={`glow-${uid}`}>
          <stop offset="0%" stopColor={color} stopOpacity={0.5} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </radialGradient>
      </defs>
      {[0.12, 0.37, 0.63, 0.88].map((at, index) => (
        <g key={index}>
          <ellipse cx={w * at} cy={h * 0.06} rx={w * 0.19} ry={h * 0.34} fill={`url(#glow-${uid})`} />
          <rect x={w * at - rig / 2} y={h * 0.028} width={rig} height={h * 0.023} rx={3} fill="#1a2733" />
          <rect
            x={w * at - rig / 2}
            y={h * 0.051}
            width={rig}
            height={h * 0.009}
            rx={2}
            fill={color}
            opacity={0.85}
          />
        </g>
      ))}
    </>
  );
}

function EmblemWall({
  type,
  w,
  rows,
  perRow,
  uid,
}: {
  type: TournamentType;
  w: number;
  rows: number;
  perRow: number;
  uid: string;
}) {
  const clubs = tournamentThemes[type].clubs.slice(0, rows * perRow);
  const size = w / (perRow * 1.5);

  return (
    <g opacity={0.14}>
      {clubs.map((crest, index) => {
        const row = Math.floor(index / perRow);
        const column = index % perRow;
        const offset = row % 2 === 0 ? 0 : w / (perRow * 2);
        const x = (w / perRow) * column + offset + (w / perRow - size) / 2;
        const y = 24 + row * size;
        return (
          <svg key={crest.name} x={x} y={y} width={size} height={(size * 112) / 100} viewBox="0 0 100 112">
            <CrestArt crest={crest} uid={`${uid}-wall-${index}`} />
          </svg>
        );
      })}
    </g>
  );
}

function Boards({
  type,
  w,
  top,
  height,
}: {
  type: TournamentType;
  w: number;
  top: number;
  height: number;
}) {
  const ads = tournamentThemes[type].boards;
  const panel = w / ads.length;
  const palette = PALETTE[type];

  return (
    <g>
      <rect x={0} y={top} width={w} height={height} fill={palette.boards} />
      <rect x={0} y={top} width={w} height={3} fill="rgba(255,255,255,0.25)" />
      <rect x={0} y={top + height - 3} width={w} height={3} fill="rgba(0,0,0,0.45)" />
      {ads.map((ad, index) => (
        <g key={ad.brand}>
          {index > 0 ? (
            <rect x={panel * index} y={top} width={2} height={height} fill="rgba(255,255,255,0.12)" />
          ) : null}
          <text
            x={panel * index + panel / 2}
            y={top + height * 0.45}
            textAnchor="middle"
            fontSize={height * 0.3}
            fontWeight={800}
            letterSpacing={1.4}
            fill="#ffffff"
            opacity={0.92}
          >
            {ad.brand.toUpperCase()}
          </text>
          <text
            x={panel * index + panel / 2}
            y={top + height * 0.78}
            textAnchor="middle"
            fontSize={height * 0.19}
            fill="#ffffff"
            opacity={0.6}
          >
            {ad.slogan}
          </text>
        </g>
      ))}
    </g>
  );
}

/** Draktene ligger med ryggen opp på gresset, i to rader med litt perspektiv. */
function KitRack({
  type,
  w,
  top,
  depth,
  kitScale,
}: {
  type: TournamentType;
  w: number;
  top: number;
  depth: number;
  kitScale: number;
}) {
  const kits = tournamentThemes[type].kits;
  const rows = [
    { items: kits.slice(0, 4), at: 0.26, scale: 0.88, x: [0.13, 0.38, 0.63, 0.88], tilt: [-7, 5, -4, 8] },
    { items: kits.slice(4, 8), at: 0.7, scale: 1.05, x: [0.22, 0.46, 0.7, 0.93], tilt: [6, -6, 4, -8] },
  ];

  return (
    <g>
      {rows.map((row, rowIndex) =>
        row.items.map((kit, index) => {
          const sx = kitScale * row.scale;
          const sy = sx * 0.62;
          const cx = w * row.x[index];
          const cy = top + depth * row.at;
          return (
            <g key={kit.name}>
              <ellipse
                cx={cx}
                cy={cy + 34 * sy}
                rx={58 * sx}
                ry={13 * sy}
                fill="rgba(0,0,0,0.3)"
              />
              <g
                transform={`translate(${cx} ${cy}) rotate(${row.tilt[index]}) scale(${sx} ${sy}) translate(-60 -70)`}
              >
                <Shirt spec={kit} uid={`${type}-${rowIndex}-${index}`} />
              </g>
            </g>
          );
        }),
      )}
    </g>
  );
}

function Ground({
  type,
  w,
  h,
  top,
  uid,
}: {
  type: TournamentType;
  w: number;
  h: number;
  top: number;
  uid: string;
}) {
  const palette = PALETTE[type];
  const depth = h - top;
  const bands = [0, 0.07, 0.16, 0.27, 0.41, 0.58, 0.78, 1];

  return (
    <g>
      <defs>
        <linearGradient id={`ground-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(0,0,0,0.35)" />
          <stop offset="45%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.3)" />
        </linearGradient>
      </defs>
      {bands.slice(0, -1).map((start, index) => (
        <rect
          key={start}
          x={0}
          y={top + depth * start}
          width={w}
          height={depth * (bands[index + 1] - start) + 1}
          fill={palette.grass[index % 2]}
        />
      ))}

      {type === "fifa" ? (
        <g fill="none" stroke={palette.line} strokeWidth={4}>
          <line x1={0} y1={top + depth * 0.18} x2={w} y2={top + depth * 0.18} />
          <ellipse cx={w / 2} cy={h + depth * 0.05} rx={w * 0.3} ry={depth * 0.55} />
        </g>
      ) : (
        <g>
          <rect x={0} y={top + depth * 0.14} width={w} height={depth * 0.035} fill="#2f6fe4" opacity={0.85} />
          <rect x={0} y={top + depth * 0.62} width={w} height={depth * 0.04} fill="#e03a4e" opacity={0.9} />
          <ellipse
            cx={w / 2}
            cy={h + depth * 0.08}
            rx={w * 0.28}
            ry={depth * 0.5}
            fill="none"
            stroke="#2f6fe4"
            strokeWidth={4}
            opacity={0.6}
          />
        </g>
      )}
      <rect x={0} y={top} width={w} height={depth} fill={`url(#ground-${uid})`} />
    </g>
  );
}

export function HeroScene({
  type,
  variant,
}: {
  type: TournamentType;
  variant: Variant;
}) {
  const { w, h, kitScale, wallRows } = LAYOUT[variant];
  const palette = PALETTE[type];
  const uid = `${type}-${variant}`;
  const boardsHeight = h * 0.125;
  const boardsTop = h * 0.54;
  const groundTop = boardsTop + boardsHeight;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="hero-scene__svg"
      role="img"
      aria-label={
        type === "fifa"
          ? "Fotballspillere på en flomlyst bane"
          : "Ishockeyspillere på isen i en opplyst arena"
      }
    >
      <defs>
        <linearGradient id={`sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.sky[0]} />
          <stop offset="100%" stopColor={palette.sky[1]} />
        </linearGradient>
      </defs>

      <rect width={w} height={h} fill={`url(#sky-${uid})`} />
      <Floodlights w={w} h={h} color={palette.light} uid={uid} />
      <EmblemWall type={type} w={w} rows={wallRows[0]} perRow={wallRows[1]} uid={uid} />
      <rect x={0} y={boardsTop - h * 0.06} width={w} height={h * 0.06} fill={palette.stand} opacity={0.9} />

      <Boards type={type} w={w} top={boardsTop} height={boardsHeight} />
      <Ground type={type} w={w} h={h} top={groundTop} uid={uid} />
      <KitRack
        type={type}
        w={w}
        top={groundTop}
        depth={h - groundTop}
        kitScale={kitScale}
      />
    </svg>
  );
}

export function PanelScene({ type }: { type: TournamentType }) {
  const palette = PALETTE[type];
  const uid = `${type}-panel`;
  const w = 1000;
  const h = 170;
  const scale = 0.62;
  const feet = h - 6;
  const centre = w * 0.78;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMax slice"
      className="hero-scene__svg"
      aria-hidden
    >
      <defs>
        <linearGradient id={`sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.sky[0]} />
          <stop offset="100%" stopColor={palette.sky[1]} />
        </linearGradient>
      </defs>
      <rect width={w} height={h} fill={`url(#sky-${uid})`} />
      <Floodlights w={w} h={h} color={palette.light} uid={uid} />
      <Ground type={type} w={w} h={h} top={h * 0.46} uid={uid} />
      <ellipse cx={centre} cy={feet + 4} rx={44} ry={7} fill="rgba(0,0,0,0.38)" />
      <g transform={`translate(${centre - 75 * scale} ${feet - 240 * scale}) scale(${scale})`}>
        <Figure spec={tournamentThemes[type].defender} />
      </g>
    </svg>
  );
}
