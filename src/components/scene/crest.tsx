import type { Crest } from "@/lib/theme";

const SHIELD = "M8 6 H92 V60 C92 86 74 100 50 108 C26 100 8 86 8 60 Z";

function shapePath(crest: Crest) {
  return crest.shape === "shield" ? (
    <path d={SHIELD} />
  ) : (
    <circle cx={50} cy={54} r={44} />
  );
}

function pattern(crest: Crest) {
  const [a, b, c] = crest.colors;

  switch (crest.pattern) {
    case "stripes":
      return (
        <>
          {[0, 1, 2, 3, 4].map((i) => (
            <rect
              key={i}
              x={i * 20}
              y={0}
              width={20}
              height={112}
              fill={i % 2 === 0 ? a : b}
            />
          ))}
        </>
      );
    case "halves":
      return (
        <>
          <rect width={50} height={112} fill={a} />
          <rect x={50} width={50} height={112} fill={b} />
        </>
      );
    case "bands":
      return (
        <>
          <rect width={100} height={112} fill={a} />
          <rect y={38} width={100} height={36} fill={b} />
        </>
      );
    case "ring":
      return (
        <>
          <rect width={100} height={112} fill={a} />
          <circle cx={50} cy={54} r={31} fill="none" stroke={b} strokeWidth={10} />
          <circle cx={50} cy={54} r={17} fill={c} />
        </>
      );
    case "diagonal":
      return (
        <>
          <rect width={100} height={112} fill={a} />
          <polygon points="100,0 100,112 0,112" fill={b} />
          <polygon points="100,0 100,26 0,112 0,86" fill={c} />
        </>
      );
    case "solid":
      return (
        <>
          <rect width={100} height={112} fill={a} />
          <rect x={10} y={10} width={80} height={92} fill="none" stroke={b} strokeWidth={5} />
        </>
      );
  }
}

export function CrestArt({ crest, uid }: { crest: Crest; uid: string }) {
  const clipId = `crest-${uid}`;
  if (crest.logoUrl) {
    return (
      <>
        <defs>
          <clipPath id={clipId}>{shapePath(crest)}</clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          <rect width={100} height={112} fill="#ffffff" />
          <image href={crest.logoUrl} x={4} y={10} width={92} height={92} preserveAspectRatio="xMidYMid meet" />
        </g>
        <g fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={3}>
          {shapePath(crest)}
        </g>
      </>
    );
  }
  return (
    <>
      <defs>
        <clipPath id={clipId}>{shapePath(crest)}</clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>{pattern(crest)}</g>
      <g fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={3}>
        {shapePath(crest)}
      </g>
      <text
        x={50}
        y={66}
        textAnchor="middle"
        fontSize={crest.initials.length > 3 ? 24 : 30}
        fontWeight={800}
        letterSpacing={1}
        fill="#ffffff"
        stroke="rgba(0,0,0,0.55)"
        strokeWidth={5}
        paintOrder="stroke"
      >
        {crest.initials}
      </text>
    </>
  );
}

export function CrestBadge({
  crest,
  uid,
  size = 64,
}: {
  crest: Crest;
  uid: string;
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 100 112"
      width={size}
      height={(size * 112) / 100}
      role="img"
      aria-label={crest.name}
    >
      <CrestArt crest={crest} uid={uid} />
    </svg>
  );
}
