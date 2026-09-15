import type { FigureSpec } from "@/lib/theme";
import { poses, type Point, type Pose } from "./poses";

const BODY = "#0a0f15";
const STICK = "#c9b48a";

function luminance(hex: string) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function Limb({
  from,
  to,
  width,
  color,
}: {
  from: Point;
  to: Point;
  width: number;
  color: string;
}) {
  return (
    <line
      x1={from[0]}
      y1={from[1]}
      x2={to[0]}
      y2={to[1]}
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
    />
  );
}

function shoulders(pose: Pose, half: number): [Point, Point] {
  const dx = pose.hip[0] - pose.neck[0];
  const dy = pose.hip[1] - pose.neck[1];
  const length = Math.hypot(dx, dy) || 1;
  const px = (-dy / length) * half;
  const py = (dx / length) * half;
  return [
    [pose.neck[0] + px, pose.neck[1] + py],
    [pose.neck[0] - px, pose.neck[1] - py],
  ];
}

function Arm({
  shoulder,
  arm,
  jersey,
}: {
  shoulder: Point;
  arm: [Point, Point];
  jersey: string;
}) {
  return (
    <>
      <Limb from={shoulder} to={arm[0]} width={13} color={jersey} />
      <Limb from={arm[0]} to={arm[1]} width={10} color={BODY} />
    </>
  );
}

function Leg({
  hip,
  leg,
  shorts,
  socks,
  skates,
}: {
  hip: Point;
  leg: [Point, Point];
  shorts: string;
  socks: string;
  skates?: boolean;
}) {
  const [knee, foot] = leg;
  const dx = foot[0] - knee[0];
  const dy = foot[1] - knee[1];
  const length = Math.hypot(dx, dy) || 1;
  const toe: Point = [foot[0] - (dy / length) * 12, foot[1] + (dx / length) * 12];

  return (
    <>
      <Limb from={hip} to={knee} width={16} color={shorts} />
      <Limb from={knee} to={foot} width={12} color={socks} />
      <Limb from={foot} to={toe} width={8} color={BODY} />
      {skates ? (
        <Limb
          from={[foot[0] - 11, foot[1] + 8]}
          to={[foot[0] + 11, foot[1] + 8]}
          width={3}
          color="#cfd8e3"
        />
      ) : null}
    </>
  );
}

function Ball({ at, r }: { at: Point; r: number }) {
  return (
    <g>
      <circle cx={at[0]} cy={at[1]} r={r} fill="#f5f6f7" stroke="#0a0f15" strokeWidth={1.5} />
      <circle cx={at[0]} cy={at[1]} r={r * 0.34} fill="#0a0f15" />
      <circle cx={at[0] - r * 0.6} cy={at[1] - r * 0.5} r={r * 0.2} fill="#0a0f15" />
      <circle cx={at[0] + r * 0.65} cy={at[1] + r * 0.4} r={r * 0.2} fill="#0a0f15" />
    </g>
  );
}

function ThreeFingers({ at }: { at: Point }) {
  return (
    <g stroke={BODY} strokeWidth={6} strokeLinecap="round">
      <circle cx={at[0]} cy={at[1]} r={6} fill={BODY} stroke="none" />
      <line x1={at[0] - 3} y1={at[1] - 2} x2={at[0] - 15} y2={at[1] - 20} />
      <line x1={at[0]} y1={at[1] - 2} x2={at[0] + 1} y2={at[1] - 25} />
      <line x1={at[0] + 3} y1={at[1] - 2} x2={at[0] + 16} y2={at[1] - 17} />
    </g>
  );
}

function Trophy({ at }: { at: Point }) {
  const [x, y] = at;
  return (
    <g>
      <path
        d={`M${x - 16} ${y - 17} H${x + 16} V${y - 8} C${x + 16} ${y + 8} ${x + 8} ${y + 15} ${x} ${y + 15} C${x - 8} ${y + 15} ${x - 16} ${y + 8} ${x - 16} ${y - 8} Z`}
        fill="#e8c04b"
      />
      <path
        d={`M${x - 16} ${y - 12} C${x - 27} ${y - 12} ${x - 27} ${y + 4} ${x - 17} ${y + 4}`}
        fill="none"
        stroke="#e8c04b"
        strokeWidth={4}
      />
      <path
        d={`M${x + 16} ${y - 12} C${x + 27} ${y - 12} ${x + 27} ${y + 4} ${x + 17} ${y + 4}`}
        fill="none"
        stroke="#e8c04b"
        strokeWidth={4}
      />
      <rect x={x - 4} y={y + 14} width={8} height={12} fill="#c99f33" />
      <rect x={x - 13} y={y + 25} width={26} height={8} rx={2} fill="#c99f33" />
      <rect x={x - 12} y={y - 17} width={24} height={4} fill="#f4d97d" />
    </g>
  );
}

function Heart({ at }: { at: Point }) {
  const [x, y] = at;
  return (
    <path
      d={`M${x} ${y - 4} C${x} ${y - 14} ${x - 15} ${y - 14} ${x - 15} ${y - 2} C${x - 15} ${y + 8} ${x} ${y + 16} ${x} ${y + 16} C${x} ${y + 16} ${x + 15} ${y + 8} ${x + 15} ${y - 2} C${x + 15} ${y - 14} ${x} ${y - 14} ${x} ${y - 4} Z`}
      fill="#f6f7f8"
      stroke={BODY}
      strokeWidth={2}
    />
  );
}

function VikingHelmet({ at, radius }: { at: Point; radius: number }) {
  const [x, y] = at;
  const r = radius + 3;
  return (
    <g>
      <path d={`M${x - r} ${y - 2} A ${r} ${r} 0 0 1 ${x + r} ${y - 2} Z`} fill="#b9a06a" />
      <rect x={x - r} y={y - 5} width={r * 2} height={6} rx={2} fill="#8d7746" />
      <g fill="none" stroke="#efe7d2" strokeWidth={7} strokeLinecap="round">
        <path d={`M${x - r + 3} ${y - 8} Q${x - r - 14} ${y - 12} ${x - r - 13} ${y - 30}`} />
        <path d={`M${x + r - 3} ${y - 8} Q${x + r + 14} ${y - 12} ${x + r + 13} ${y - 30}`} />
      </g>
    </g>
  );
}

function Stick({ grip, blade }: { grip: Point; blade: Point }) {
  const dx = blade[0] - grip[0];
  const dy = blade[1] - grip[1];
  const length = Math.hypot(dx, dy) || 1;
  const toe: Point = [blade[0] + (dx / length) * 16, blade[1] + (dy / length) * 4];
  return (
    <>
      <Limb from={grip} to={blade} width={5} color={STICK} />
      <Limb from={blade} to={toe} width={8} color="#12181f" />
    </>
  );
}

export function Figure({ spec }: { spec: FigureSpec }) {
  const pose = poses[spec.pose];
  const { jersey, shorts, socks, number } = spec.kit;
  const [backShoulder, frontShoulder] = shoulders(pose, 15);
  const numberColor = luminance(jersey) > 0.55 ? "#101820" : "#f5f6f7";
  const torsoAngle =
    (Math.atan2(pose.hip[1] - pose.neck[1], pose.hip[0] - pose.neck[0]) * 180) /
      Math.PI -
    90;

  return (
    <g>
      {pose.stick && pose.stick[1][1] < pose.neck[1] ? (
        <Stick grip={pose.stick[0]} blade={pose.stick[1]} />
      ) : null}

      <g opacity={0.72}>
        <Leg hip={pose.hip} leg={pose.backLeg} shorts={shorts} socks={socks} skates={pose.skates} />
        <Arm shoulder={backShoulder} arm={pose.backArm} jersey={jersey} />
      </g>

      <Limb from={pose.neck} to={pose.hip} width={30} color={jersey} />
      <Limb from={backShoulder} to={frontShoulder} width={17} color={jersey} />
      <Limb
        from={[pose.hip[0], pose.hip[1] - 6]}
        to={[pose.hip[0], pose.hip[1] + 2]}
        width={28}
        color={shorts}
      />
      <text
        x={(pose.neck[0] + pose.hip[0]) / 2}
        y={(pose.neck[1] + pose.hip[1]) / 2 + 6}
        transform={`rotate(${torsoAngle} ${(pose.neck[0] + pose.hip[0]) / 2} ${(pose.neck[1] + pose.hip[1]) / 2})`}
        textAnchor="middle"
        fontSize={19}
        fontWeight={800}
        fill={numberColor}
      >
        {number}
      </text>

      <circle cx={pose.head[0]} cy={pose.head[1]} r={pose.headRadius} fill={BODY} />
      {pose.helmet ? <VikingHelmet at={pose.head} radius={pose.headRadius} /> : null}
      {pose.goalieGear ? (
        <circle
          cx={pose.head[0]}
          cy={pose.head[1]}
          r={pose.headRadius}
          fill="none"
          stroke={jersey}
          strokeWidth={4}
        />
      ) : null}

      <Leg hip={pose.hip} leg={pose.frontLeg} shorts={shorts} socks={socks} skates={pose.skates} />
      <Arm shoulder={frontShoulder} arm={pose.frontArm} jersey={jersey} />

      {pose.goalieGear ? (
        <>
          <circle cx={pose.frontArm[1][0]} cy={pose.frontArm[1][1]} r={14} fill={shorts} stroke={BODY} strokeWidth={2} />
          <rect
            x={pose.backArm[1][0] - 12}
            y={pose.backArm[1][1] - 12}
            width={22}
            height={24}
            rx={4}
            fill={shorts}
            stroke={BODY}
            strokeWidth={2}
          />
        </>
      ) : null}

      {pose.stick && pose.stick[1][1] >= pose.neck[1] ? (
        <Stick grip={pose.stick[0]} blade={pose.stick[1]} />
      ) : null}
      {pose.handSign ? <ThreeFingers at={pose.handSign} /> : null}
      {pose.heart ? <Heart at={pose.heart} /> : null}
      {pose.trophy ? <Trophy at={pose.trophy} /> : null}
      {pose.ball ? <Ball at={pose.ball.at} r={pose.ball.r} /> : null}
      {pose.puck ? (
        <ellipse cx={pose.puck[0]} cy={pose.puck[1]} rx={9} ry={4} fill="#0a0f15" />
      ) : null}
    </g>
  );
}
