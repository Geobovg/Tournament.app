import { auth } from "./auth";
import { career } from "./career";
import { common } from "./common";
import { dbErrors } from "./db-errors";
import { friends } from "./friends";
import { market } from "./market";
import { match } from "./match";
import { profile } from "./profile";
import { seasons } from "./seasons";
import { tournaments } from "./tournaments";
import type { Dictionary } from "../en";

export const sv: Dictionary = { common, auth, profile, friends, tournaments, career, market, match, seasons, dbErrors };
