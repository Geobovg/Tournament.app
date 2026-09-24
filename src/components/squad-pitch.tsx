// Banen tegnes i ekte mål (68 x 105 m) og projiseres i perspektiv, slik som troppsbildet i FC.
// Samme projeksjon brukes til å plassere kortene, så linjer og spillere alltid henger sammen.

// To oppsett: bred bane på større skjermer og en høyere bane på mobil, så kortene får plass uten å overlappe.
// cardWidth er kortbredden i prosent av banebredden.
export const pitchLayouts = { wide: { height: 900, cardWidth: 12.5 }, tall: { height: 1500, cardWidth: 16 } };
export type PitchLayout = keyof typeof pitchLayouts;
const viewWidth = 1000;

const pitchWidth = 68;
const pitchLength = 105;
const nearDistance = 240;
const focal = (940 * nearDistance) / pitchWidth;

// u: meter fra venstre sidelinje, v: meter fra motstanderens mållinje (toppen av bildet).
function projector(layout: PitchLayout) {
  const nearY = pitchLayouts[layout].height - 30;
  const farY = 50;
  const depthScale = (nearY - farY) / (1 / nearDistance - 1 / (nearDistance + pitchLength));
  const horizonY = nearY - depthScale / nearDistance;
  return (u: number, v: number): [number, number] => {
    const z = nearDistance + (pitchLength - v);
    return [viewWidth / 2 + ((u - pitchWidth / 2) * focal) / z, horizonY + depthScale / z];
  };
}

// Formasjonene er gitt i prosent av banen. Litt ekstra bredde gir luft mellom kortene.
export function slotPoint(slot: { x: number; y: number }, layout: PitchLayout) {
  const [x, y] = projector(layout)(pitchWidth / 2 + ((slot.x - 50) / 100) * pitchWidth * 1.23, (slot.y / 100) * pitchLength);
  return { left: `${(x / viewWidth) * 100}%`, top: `${(y / pitchLayouts[layout].height) * 100}%` };
}

type Project = ReturnType<typeof projector>;
const toPoints = (project: Project, list: [number, number][]) => list.map(([u, v]) => project(u, v).map((n) => n.toFixed(1)).join(",")).join(" ");
const arc = (cu: number, cv: number, r: number, from: number, to: number, steps = 48) => Array.from({ length: steps + 1 }, (_, i) => { const a = from + ((to - from) * i) / steps; return [cu + r * Math.cos(a), cv + r * Math.sin(a)] as [number, number]; });
const rect = (u1: number, v1: number, u2: number, v2: number): [number, number][] => [[u1, v1], [u2, v1], [u2, v2], [u1, v2], [u1, v1]];

const boxWidth = 40.32;
const goalAreaWidth = 18.32;
const circleRadius = 9.15;
// Vinkelen der straffesparksbuen krysser 16-meterlinjen (5,5 m utenfor straffemerket).
const arcCut = Math.acos(5.5 / circleRadius);

function PitchEnd({ top, project }: { top: boolean; project: Project }) {
  const points = (list: [number, number][]) => toPoints(project, list);
  const line = (v: number) => (top ? v : pitchLength - v);
  const box = (width: number, depth: number) => rect((pitchWidth - width) / 2, line(0), (pitchWidth + width) / 2, line(depth));
  const spot = project(pitchWidth / 2, line(11));
  const arcPoints = top ? arc(pitchWidth / 2, 11, circleRadius, Math.PI / 2 - arcCut, Math.PI / 2 + arcCut) : arc(pitchWidth / 2, pitchLength - 11, circleRadius, -Math.PI / 2 - arcCut, -Math.PI / 2 + arcCut);
  const goalDepth = top ? -1.6 : pitchLength + 1.6;
  return <>
    <polyline points={points(box(boxWidth, 16.5))} />
    <polyline points={points(box(goalAreaWidth, 5.5))} />
    <polyline points={points(arcPoints)} />
    <circle cx={spot[0]} cy={spot[1]} r={3} fill="rgba(255,255,255,.55)" stroke="none" />
    <polyline points={points([[pitchWidth / 2 - 3.66, line(0)], [pitchWidth / 2 - 3.66, goalDepth], [pitchWidth / 2 + 3.66, goalDepth], [pitchWidth / 2 + 3.66, line(0)]])} />
  </>;
}

export function PitchMarkings({ layout, className = "" }: { layout: PitchLayout; className?: string }) {
  const project = projector(layout);
  const points = (list: [number, number][]) => toPoints(project, list);
  const height = pitchLayouts[layout].height;
  const stripes = 12;
  const centre = project(pitchWidth / 2, pitchLength / 2);
  return <svg viewBox={`0 0 ${viewWidth} ${height}`} className={`absolute inset-0 h-full w-full ${className}`} aria-hidden>
    <defs>
      <linearGradient id={`pitch-grass-${layout}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0d5a3c" /><stop offset="1" stopColor="#12744c" /></linearGradient>
      <radialGradient id={`pitch-light-${layout}`} cx=".5" cy=".55" r=".6"><stop offset="0" stopColor="rgba(255,255,255,.10)" /><stop offset="1" stopColor="rgba(0,0,0,.25)" /></radialGradient>
    </defs>
    <polygon points={points([[-4, -3], [pitchWidth + 4, -3], [pitchWidth + 4, pitchLength + 3], [-4, pitchLength + 3]])} fill={`url(#pitch-grass-${layout})`} />
    {Array.from({ length: stripes }, (_, i) => i % 2 ? null : <polygon key={i} points={points(rect(-4, (pitchLength / stripes) * i, pitchWidth + 4, (pitchLength / stripes) * (i + 1)))} fill="rgba(255,255,255,.045)" />)}
    <rect width={viewWidth} height={height} fill={`url(#pitch-light-${layout})`} />
    <g fill="none" stroke="rgba(255,255,255,.55)" strokeWidth={2.5} strokeLinejoin="round">
      <polyline points={points(rect(0, 0, pitchWidth, pitchLength))} />
      <polyline points={points([[0, pitchLength / 2], [pitchWidth, pitchLength / 2]])} />
      <polyline points={points(arc(pitchWidth / 2, pitchLength / 2, circleRadius, 0, Math.PI * 2, 72))} />
      <circle cx={centre[0]} cy={centre[1]} r={3.5} fill="rgba(255,255,255,.55)" stroke="none" />
      <PitchEnd top project={project} />
      <PitchEnd top={false} project={project} />
    </g>
  </svg>;
}
