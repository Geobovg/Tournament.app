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
  handSign?: Point;
  trophy?: Point;
  heart?: Point;
  helmet?: boolean;
  goalieGear?: boolean;
  skates?: boolean;
};

/** All poses live in a 150 x 250 box with the ground at y = 240. */
export const poses: Record<PoseName, Pose> = {
  threeFingers: {
    head: [72, 38],
    headRadius: 15,
    neck: [72, 58],
    hip: [72, 134],
    backArm: [[50, 92], [40, 118]],
    frontArm: [[96, 84], [104, 46]],
    backLeg: [[62, 186], [56, 238]],
    frontLeg: [[86, 186], [94, 238]],
    handSign: [104, 46],
    ball: { at: [32, 226], r: 13 },
  },
  armsCrossed: {
    head: [75, 38],
    headRadius: 15,
    neck: [75, 58],
    hip: [75, 134],
    backArm: [[50, 88], [92, 92]],
    frontArm: [[100, 92], [58, 108]],
    backLeg: [[62, 186], [54, 238]],
    frontLeg: [[88, 186], [96, 238]],
  },
  heartHands: {
    head: [75, 38],
    headRadius: 15,
    neck: [75, 58],
    hip: [75, 134],
    backArm: [[50, 94], [66, 108]],
    frontArm: [[100, 94], [84, 108]],
    backLeg: [[63, 186], [57, 238]],
    frontLeg: [[87, 186], [93, 238]],
    heart: [75, 98],
  },
  trophyKiss: {
    head: [82, 58],
    headRadius: 15,
    neck: [78, 76],
    hip: [66, 138],
    backArm: [[80, 106], [98, 102]],
    frontArm: [[96, 102], [110, 106]],
    backLeg: [[58, 188], [52, 238]],
    frontLeg: [[80, 188], [88, 238]],
    trophy: [108, 76],
  },
  vikingStance: {
    head: [75, 42],
    headRadius: 15,
    neck: [75, 62],
    hip: [75, 136],
    backArm: [[44, 96], [62, 120]],
    frontArm: [[106, 96], [88, 120]],
    backLeg: [[63, 188], [57, 238]],
    frontLeg: [[87, 188], [93, 238]],
    helmet: true,
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
