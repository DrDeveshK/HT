import { describe, it, expect } from "vitest";
import { aggregateWorker, aggregateHotel, overallFromDims, type RatingLike } from "./reputation";

const wr = (over: Partial<RatingLike> = {}): RatingLike => ({
  score: 5,
  scoresJson: JSON.stringify({ skill: 5, punctuality: 5 }),
  wouldRehire: true,
  status: "VISIBLE",
  raterRole: "HOST_HOTEL",
  ...over,
});

describe("aggregateWorker", () => {
  it("means overall + per-dimension and computes rehire rate", () => {
    const a = aggregateWorker([
      wr({ score: 4, scoresJson: JSON.stringify({ skill: 4, punctuality: 2 }), wouldRehire: true }),
      wr({ score: 2, scoresJson: JSON.stringify({ skill: 2, punctuality: 4 }), wouldRehire: false }),
    ]);
    expect(a.overall).toBe(3);
    expect(a.dims.skill).toBe(3);
    expect(a.dims.punctuality).toBe(3);
    expect(a.rehireRate).toBe(0.5);
    expect(a.count).toBe(2);
  });

  it("ignores HIDDEN ratings", () => {
    const a = aggregateWorker([
      wr({ score: 5 }),
      wr({ score: 1, status: "HIDDEN" }),
    ]);
    expect(a.overall).toBe(5);
    expect(a.count).toBe(1);
  });

  it("returns zeros for no ratings", () => {
    const a = aggregateWorker([]);
    expect(a).toEqual({ overall: 0, dims: {}, rehireRate: 0, count: 0 });
  });
});

describe("aggregateHotel", () => {
  it("counts only worker-authored VISIBLE reviews", () => {
    const a = aggregateHotel([
      wr({ raterRole: "WORKER", score: 4, scoresJson: JSON.stringify({ timelyPay: 4 }) }),
      wr({ raterRole: "WORKER", score: 2, scoresJson: JSON.stringify({ timelyPay: 2 }) }),
      wr({ raterRole: "HOME_HOTEL", score: 5 }), // hotel↔hotel, excluded
      wr({ raterRole: "WORKER", score: 1, status: "HIDDEN" }), // hidden, excluded
    ]);
    expect(a.overall).toBe(3);
    expect(a.dims.timelyPay).toBe(3);
    expect(a.count).toBe(2);
  });
});

describe("overallFromDims", () => {
  it("averages the dimension values", () => {
    expect(overallFromDims({ a: 4, b: 2 })).toBe(3);
    expect(overallFromDims({})).toBe(0);
  });
});
