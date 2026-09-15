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
  stick?: [Point, Point];
  skates?: boolean;
};

/** Forsvarsfigurene på kamp- og statistikkpanelet, i en 150 x 250-boks med bakken på y = 240. */
export const poses: Record<PoseName, Pose> = {
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
