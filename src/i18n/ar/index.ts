import { auth } from "./auth";
import { career } from "./career";
import { common } from "./common";
import { dbErrors } from "./db-errors";
import { fantasy } from "./fantasy";
import { femmer } from "./femmer";
import { friends } from "./friends";
import { market } from "./market";
import { match } from "./match";
import { profile } from "./profile";
import { sbc } from "./sbc";
import { seasons } from "./seasons";
import { tournaments } from "./tournaments";
import type { Dictionary } from "../en";

export const ar: Dictionary = { common, auth, profile, friends, tournaments, career, market, match, seasons, sbc, fantasy, femmer, dbErrors };
