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

// Den engelske ordboken er fasiten: alle andre språk må ha nøyaktig de samme nøklene.
export const en = { common, auth, profile, friends, tournaments, career, market, match, seasons, dbErrors };

export type Dictionary = typeof en;
