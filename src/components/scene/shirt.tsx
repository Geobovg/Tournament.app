import type { ShirtSpec } from "@/lib/theme";
import { inkOn } from "./ink";

/** Drakten er tegnet bakfra i en 120 x 140-boks, med halsen øverst. */
const BODY = "M34 10 C42 25 78 25 86 10 L90 40 L93 128 L27 128 L30 40 Z";
const LEFT_SLEEVE = "M34 10 L19 15 L5 47 L26 57 L32 34 Z";
const RIGHT_SLEEVE = "M86 10 L101 15 L115 47 L94 57 L88 34 Z";
const COLLAR = "M34 10 C42 25 78 25 86 10";

export function Shirt({ spec, uid }: { spec: ShirtSpec; uid: string }) {
  const clipId = `shirt-${uid}`;
  const ink = inkOn(spec.body);
  const sleeve = spec.sleeve ?? spec.body;

  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <path d={BODY} />
        </clipPath>
      </defs>

      <g stroke="rgba(0,0,0,0.3)" strokeWidth={1.5} strokeLinejoin="round">
        <path d={LEFT_SLEEVE} fill={sleeve} />
        <path d={RIGHT_SLEEVE} fill={sleeve} />
        <path d={BODY} fill={spec.body} />
      </g>

      {spec.stripe ? (
        <g clipPath={`url(#${clipId})`}>
          {[0, 1, 2, 3].map((index) => (
            <rect key={index} x={26 + index * 17} y={0} width={9} height={140} fill={spec.stripe} />
          ))}
        </g>
      ) : null}

      <path d={COLLAR} fill="none" stroke={spec.collar ?? ink} strokeWidth={5} opacity={0.85} />

      <text
        x={60}
        y={60}
        textAnchor="middle"
        fontSize={13}
        fontWeight={700}
        textLength={Math.min(56, spec.name.length * 9)}
        lengthAdjust="spacingAndGlyphs"
        fill={ink}
      >
        {spec.name.toUpperCase()}
      </text>
      <text x={60} y={112} textAnchor="middle" fontSize={46} fontWeight={800} fill={ink}>
        {spec.number}
      </text>
    </g>
  );
}
