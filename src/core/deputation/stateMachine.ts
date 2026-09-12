import type { DeputationState } from "@/lib/constants";

/** Allowed forward transitions for a deputation lifecycle. */
export const DEPUTATION_TRANSITIONS: Record<DeputationState, DeputationState[]> = {
  REQUESTED: ["NEGOTIATING", "ACCEPTED", "CANCELLED"],
  NEGOTIATING: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["AGREED", "CANCELLED"],
  AGREED: ["IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT: ["ACTIVE", "CANCELLED"],
  ACTIVE: ["COMPLETED", "CANCELLED"],
  COMPLETED: ["RETURNED"],
  RETURNED: [],
  CANCELLED: [],
};

export function canTransition(from: DeputationState, to: DeputationState): boolean {
  return DEPUTATION_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: DeputationState, to: DeputationState): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid deputation transition: ${from} → ${to}`);
  }
}

export function isTerminal(state: DeputationState): boolean {
  return DEPUTATION_TRANSITIONS[state].length === 0;
}

export type Actor = "HOME_HOTEL" | "DEMAND_HOTEL" | "WORKER" | "PLATFORM";

export interface TransitionAction {
  to: DeputationState;
  label: string;
  by: Actor[];
}

/** Actions surfaced in the UI, keyed by current state, with who may perform them. */
export const DEPUTATION_ACTIONS: Partial<Record<DeputationState, TransitionAction[]>> = {
  REQUESTED: [
    { to: "ACCEPTED", label: "Accept request", by: ["HOME_HOTEL"] },
    { to: "CANCELLED", label: "Decline", by: ["HOME_HOTEL", "DEMAND_HOTEL"] },
  ],
  NEGOTIATING: [
    // Accepting a wage happens via the offer panel (acceptOffer); this is the bail-out.
    { to: "CANCELLED", label: "Cancel negotiation", by: ["HOME_HOTEL", "DEMAND_HOTEL"] },
  ],
  ACCEPTED: [
    { to: "AGREED", label: "Sign agreement", by: ["HOME_HOTEL", "DEMAND_HOTEL"] },
    { to: "CANCELLED", label: "Cancel", by: ["HOME_HOTEL", "DEMAND_HOTEL"] },
  ],
  AGREED: [
    { to: "IN_TRANSIT", label: "Mark travelling", by: ["HOME_HOTEL", "PLATFORM"] },
    { to: "CANCELLED", label: "Cancel", by: ["HOME_HOTEL", "DEMAND_HOTEL"] },
  ],
  IN_TRANSIT: [
    { to: "ACTIVE", label: "Mark arrived / active", by: ["DEMAND_HOTEL"] },
    { to: "CANCELLED", label: "Cancel", by: ["DEMAND_HOTEL"] },
  ],
  ACTIVE: [{ to: "COMPLETED", label: "Complete deputation", by: ["DEMAND_HOTEL"] }],
  COMPLETED: [{ to: "RETURNED", label: "Confirm return home", by: ["HOME_HOTEL"] }],
};

/** Actions available to a given actor from a given state. */
export function actionsFor(state: DeputationState, actor: Actor): TransitionAction[] {
  return (DEPUTATION_ACTIONS[state] ?? []).filter((a) => a.by.includes(actor));
}
