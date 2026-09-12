import { describe, it, expect } from "vitest";
import { canTransition, assertTransition, isTerminal, actionsFor } from "./stateMachine";

describe("deputation state machine", () => {
  it("allows valid forward transitions", () => {
    expect(canTransition("REQUESTED", "ACCEPTED")).toBe(true);
    expect(canTransition("ACTIVE", "COMPLETED")).toBe(true);
    expect(canTransition("COMPLETED", "RETURNED")).toBe(true);
  });

  it("rejects invalid transitions", () => {
    expect(canTransition("REQUESTED", "ACTIVE")).toBe(false);
    expect(canTransition("RETURNED", "ACTIVE")).toBe(false);
    expect(() => assertTransition("REQUESTED", "RETURNED")).toThrow();
  });

  it("marks terminal states", () => {
    expect(isTerminal("RETURNED")).toBe(true);
    expect(isTerminal("CANCELLED")).toBe(true);
    expect(isTerminal("ACTIVE")).toBe(false);
  });

  it("scopes actions by actor", () => {
    const home = actionsFor("REQUESTED", "HOME_HOTEL").map((a) => a.to);
    expect(home).toContain("ACCEPTED");
    const demand = actionsFor("REQUESTED", "DEMAND_HOTEL").map((a) => a.to);
    expect(demand).not.toContain("ACCEPTED"); // only the home hotel can accept
    expect(demand).toContain("CANCELLED");
  });
});
