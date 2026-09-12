// Pure reputation aggregation (framework-free, unit-tested).
// Turns a set of Rating records into portable reputation for a worker or a hotel.
// Only VISIBLE ratings count (moderation hides abusive ones).

export interface RatingLike {
  score: number; // overall 1-5
  scoresJson: string; // per-dimension map, JSON text
  wouldRehire: boolean;
  status: string; // VISIBLE | HIDDEN
  raterRole: string; // HOST_HOTEL | HOME_HOTEL | WORKER
}

export interface Aggregate {
  overall: number; // mean overall score, 1 dp (0 if none)
  dims: Record<string, number>; // mean per dimension, 1 dp
  count: number;
}

export interface WorkerAggregate extends Aggregate {
  rehireRate: number; // 0-1, 2 dp
}

const round = (n: number, dp: number) => Math.round(n * 10 ** dp) / 10 ** dp;
const mean = (ns: number[]) => (ns.length ? ns.reduce((s, n) => s + n, 0) / ns.length : 0);
const visible = (rs: RatingLike[]) => rs.filter((r) => r.status === "VISIBLE");

function parseScores(json: string): Record<string, number> {
  try {
    const o = JSON.parse(json);
    return o && typeof o === "object" && !Array.isArray(o) ? (o as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function aggregateDims(ratings: RatingLike[]): Record<string, number> {
  const acc: Record<string, number[]> = {};
  for (const r of ratings) {
    for (const [k, v] of Object.entries(parseScores(r.scoresJson))) {
      if (typeof v === "number" && v > 0) (acc[k] ??= []).push(v);
    }
  }
  const out: Record<string, number> = {};
  for (const [k, arr] of Object.entries(acc)) out[k] = round(mean(arr), 1);
  return out;
}

/** Worker reputation from host→worker ratings. */
export function aggregateWorker(ratings: RatingLike[]): WorkerAggregate {
  const v = visible(ratings);
  return {
    overall: round(mean(v.map((r) => r.score)), 1),
    dims: aggregateDims(v),
    rehireRate: v.length ? round(v.filter((r) => r.wouldRehire).length / v.length, 2) : 0,
    count: v.length,
  };
}

/** Hotel reverse-reputation from worker→hotel ratings only. */
export function aggregateHotel(ratings: RatingLike[]): Aggregate {
  const v = visible(ratings).filter((r) => r.raterRole === "WORKER");
  return {
    overall: round(mean(v.map((r) => r.score)), 1),
    dims: aggregateDims(v),
    count: v.length,
  };
}

/** Display helper: overall from a stored dimension-average map. */
export function overallFromDims(dims: Record<string, number>): number {
  const vals = Object.values(dims).filter((n) => typeof n === "number");
  return round(mean(vals), 1);
}
