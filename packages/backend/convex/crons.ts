import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
const crons = cronJobs();
crons.daily(
  "daily challenge",
  { hourUTC: 0, minuteUTC: 0 },
  internal.challenges.createToday,
  {},
);
crons.interval("challenge rewards", { minutes: 5 }, internal.rewards.tick, {});
export default crons;
