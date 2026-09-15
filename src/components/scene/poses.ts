import type { PoseName } from "@/lib/theme";

export type Point = [number, number];

export type Pose = {
  head: Point;
  headRadius: number;
  neck: Point;
  hip: Point;
  backArm: [Point, Point];
  frontArm: [Point, Point];
  backLeg: [Point, Point];
  frontLeg: [Point, Point];
  ball?: { at: Point; r: number };
  puck?: Point;
  stick?: [Point, Point];
  goalieGear?: boolean;
  skates?: boolean;
};

/** All poses live in a 150 x 250 box with the ground at y = 240. */
export const poses: Record<PoseName, Pose> = {
  keeper: {
    head: [96, 72],
    headRadius: 15,
    neck: [88, 88],
    hip: [54, 140],
    backArm: [[102, 74], [126, 54]],
    frontArm: [[108, 88], [134, 70]],
    backLeg: [[32, 168], [12, 192]],
    frontLeg: [[38, 182], [16, 212]],
    ball: { at: [136, 46], r: 11 },
  },
  dribble: {
    head: [86, 44],
    headRadius: 15,
    neck: [80, 62],
    hip: [66, 136],
    backArm: [[58, 94], [46, 72]],
    frontArm: [[96, 98], [106, 124]],
    backLeg: [[50, 182], [34, 214]],
    frontLeg: [[88, 178], [108, 206]],
    ball: { at: [124, 228], r: 13 },
  },
  shoot: {
    head: [60, 40],
    headRadius: 15,
    neck: [64, 58],
    hip: [68, 132],
    backArm: [[40, 90], [24, 72]],
    frontArm: [[88, 86], [102, 64]],
    backLeg: [[58, 184], [52, 238]],
    frontLeg: [[96, 150], [124, 166]],
    ball: { at: [136, 152], r: 12 },
  },
  celebrate: {
    head: [75, 38],
    headRadius: 15,
    neck: [75, 58],
    hip: [75, 134],
    backArm: [[50, 98], [34, 58]],
    frontArm: [[100, 98], [116, 58]],
    backLeg: [[60, 186], [50, 238]],
    frontLeg: [[92, 186], [102, 238]],
  },
  stand: {
    head: [70, 36],
    headRadius: 15,
    neck: [70, 56],
    hip: [70, 132],
    backArm: [[50, 90], [44, 120]],
    frontArm: [[92, 88], [102, 116]],
    backLeg: [[62, 184], [58, 238]],
    frontLeg: [[86, 180], [98, 216]],
    ball: { at: [106, 226], r: 14 },
  },
  defend: {
    head: [75, 38],
    headRadius: 15,
    neck: [75, 58],
    hip: [75, 134],
    backArm: [[50, 94], [28, 106]],
    frontArm: [[100, 94], [122, 106]],
    backLeg: [[54, 186], [42, 238]],
    frontLeg: [[96, 186], [108, 238]],
  },
  goalie: {
    head: [75, 52],
    headRadius: 16,
    neck: [75, 72],
    hip: [75, 128],
    backArm: [[50, 98], [32, 80]],
    frontArm: [[100, 98], [118, 80]],
    backLeg: [[50, 172], [16, 210]],
    frontLeg: [[100, 172], [134, 210]],
    goalieGear: true,
    skates: true,
  },
  skate: {
    head: [96, 56],
    headRadius: 15,
    neck: [90, 72],
    hip: [64, 128],
    backArm: [[78, 98], [92, 116]],
    frontArm: [[98, 92], [106, 114]],
    backLeg: [[46, 168], [26, 206]],
    frontLeg: [[80, 172], [96, 214]],
    stick: [[106, 114], [138, 206]],
    skates: true,
  },
  slapshot: {
    head: [72, 52],
    headRadius: 15,
    neck: [74, 70],
    hip: [74, 132],
    backArm: [[54, 86], [40, 64]],
    frontArm: [[88, 78], [96, 52]],
    backLeg: [[56, 182], [42, 234]],
    frontLeg: [[98, 178], [114, 228]],
    stick: [[96, 52], [34, 14]],
    puck: [126, 236],
    skates: true,
  },
  celebrateStick: {
    head: [75, 38],
    headRadius: 15,
    neck: [75, 58],
    hip: [75, 134],
    backArm: [[50, 98], [34, 58]],
    frontArm: [[100, 98], [116, 58]],
    backLeg: [[60, 186], [50, 238]],
    frontLeg: [[92, 186], [102, 238]],
    stick: [[116, 58], [146, 20]],
    skates: true,
  },
  standStick: {
    head: [75, 36],
    headRadius: 15,
    neck: [75, 56],
    hip: [75, 132],
    backArm: [[52, 90], [46, 116]],
    frontArm: [[98, 88], [106, 112]],
    backLeg: [[64, 184], [58, 238]],
    frontLeg: [[88, 184], [98, 238]],
    stick: [[106, 112], [132, 228]],
    skates: true,
  },
  defendStick: {
    head: [80, 50],
    headRadius: 15,
    neck: [78, 68],
    hip: [70, 128],
    backArm: [[56, 94], [50, 118]],
    frontArm: [[96, 92], [106, 114]],
    backLeg: [[50, 178], [36, 228]],
    frontLeg: [[96, 176], [112, 226]],
    stick: [[50, 118], [128, 214]],
    skates: true,
  },
};
