import type { FigureSpec } from "@/lib/theme";
import { inkOn } from "./ink";
import { poses, type Point, type Pose } from "./poses";

const BODY = "#0a0f15";
const STICK = "#c9b48a";

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
  const midX = (pose.neck[0] + pose.hip[0]) / 2;
  const midY = (pose.neck[1] + pose.hip[1]) / 2;
  const torsoAngle =
    (Math.atan2(pose.hip[1] - pose.neck[1], pose.hip[0] - pose.neck[0]) * 180) /
      Math.PI -
    90;

  return (
    <g>
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
        x={midX}
        y={midY + 6}
        transform={`rotate(${torsoAngle} ${midX} ${midY})`}
        textAnchor="middle"
        fontSize={19}
        fontWeight={800}
        fill={inkOn(jersey)}
      >
        {number}
      </text>

      <circle cx={pose.head[0]} cy={pose.head[1]} r={pose.headRadius} fill={BODY} />

      <Leg hip={pose.hip} leg={pose.frontLeg} shorts={shorts} socks={socks} skates={pose.skates} />
      <Arm shoulder={frontShoulder} arm={pose.frontArm} jersey={jersey} />

      {pose.stick ? <Stick grip={pose.stick[0]} blade={pose.stick[1]} /> : null}
    </g>
  );
}
