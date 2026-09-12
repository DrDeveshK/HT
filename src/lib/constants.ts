// Shared string-union "enums" (SQLite has no native enums) + labels + helpers.

export const USER_ROLES = ["HOTELIER_ADMIN", "WORKER", "PLATFORM_ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const HOTEL_TIERS = ["BUDGET", "MID", "UPSCALE"] as const;
export type HotelTier = (typeof HOTEL_TIERS)[number];

export const ROLE_CATEGORIES = [
  "HOUSEKEEPING",
  "FNB",
  "FRONT_OFFICE",
  "KITCHEN",
  "MAINTENANCE",
  "WELLNESS",
  "SECURITY",
  "OTHER",
] as const;
export type RoleCategory = (typeof ROLE_CATEGORIES)[number];

export const SEASON_STATES = ["PEAK", "SHOULDER", "OFF"] as const;
export type SeasonState = (typeof SEASON_STATES)[number];

export const DECLARATION_TYPES = ["SURPLUS", "DEMAND"] as const;
export type DeclarationType = (typeof DECLARATION_TYPES)[number];

export const DEPUTATION_STATES = [
  "REQUESTED",
  "NEGOTIATING",
  "ACCEPTED",
  "AGREED",
  "IN_TRANSIT",
  "ACTIVE",
  "COMPLETED",
  "RETURNED",
  "CANCELLED",
] as const;
export type DeputationState = (typeof DEPUTATION_STATES)[number];

// ---- Offers / negotiation (M4) ----
export const OFFER_STATUSES = ["PROPOSED", "COUNTERED", "ACCEPTED", "REJECTED", "WITHDRAWN"] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

export const OFFER_PARTIES = ["DEMAND_HOTEL", "HOME_HOTEL", "WORKER"] as const;
export type OfferParty = (typeof OFFER_PARTIES)[number];

export const SUBSCRIPTION_PLANS = ["FREE", "STARTER", "GROWTH", "ENTERPRISE"] as const;
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number];

// ---- Ratings & reputation (M3) ----
export const RATER_ROLES = ["HOST_HOTEL", "HOME_HOTEL", "WORKER"] as const;
export type RaterRole = (typeof RATER_ROLES)[number];

export const RATING_STATUSES = ["VISIBLE", "HIDDEN"] as const;
export type RatingStatus = (typeof RATING_STATUSES)[number];

export type RatingDimension = { key: string; label: string };

// Host hotel rates a deputed worker on these.
export const WORKER_RATING_DIMENSIONS: readonly RatingDimension[] = [
  { key: "skill", label: "Skill" },
  { key: "punctuality", label: "Punctuality" },
  { key: "grooming", label: "Grooming" },
  { key: "guestHandling", label: "Guest handling" },
  { key: "teamwork", label: "Teamwork" },
  { key: "reliability", label: "Reliability" },
] as const;

// Worker rates the host / home hotel on these (reverse feedback).
export const HOTEL_RATING_DIMENSIONS: readonly RatingDimension[] = [
  { key: "fairTreatment", label: "Fair treatment" },
  { key: "timelyPay", label: "Timely pay" },
  { key: "accommodation", label: "Accommodation" },
  { key: "workConditions", label: "Work conditions" },
  { key: "respect", label: "Respect" },
] as const;

export function dimensionsFor(target: "WORKER" | "HOTEL"): readonly RatingDimension[] {
  return target === "WORKER" ? WORKER_RATING_DIMENSIONS : HOTEL_RATING_DIMENSIONS;
}

// ---- Plan pricing (paise / month) ----
export const PLAN_PRICING: Record<
  SubscriptionPlan,
  { pricePaise: number; label: string; blurb: string; features: string[] }
> = {
  FREE: {
    pricePaise: 0,
    label: "Free",
    blurb: "Browse the national map + list surplus staff.",
    features: ["National seasonal map", "List up to 1 surplus declaration", "Community support"],
  },
  STARTER: {
    pricePaise: 249900,
    label: "Starter",
    blurb: "For a single budget/mid property.",
    features: ["Unlimited declarations", "Matching + deputations", "Two-way ratings", "Email support"],
  },
  GROWTH: {
    pricePaise: 599900,
    label: "Growth",
    blurb: "For busy properties in strong corridors.",
    features: ["Everything in Starter", "Priority matching", "Corridor analytics", "Managed-payroll add-on"],
  },
  ENTERPRISE: {
    pricePaise: 1499900,
    label: "Enterprise",
    blurb: "For groups & chains redeploying at scale.",
    features: ["Everything in Growth", "Multi-property group console", "API access", "Dedicated success manager"],
  },
};

// ---- Season state styling ----
export const SEASON_STATE_STYLE: Record<
  SeasonState,
  { label: string; text: string; bg: string; dot: string; hex: string }
> = {
  PEAK: { label: "Peak", text: "text-red-700", bg: "bg-red-50", dot: "bg-red-500", hex: "#dc2626" },
  SHOULDER: { label: "Shoulder", text: "text-amber-700", bg: "bg-amber-50", dot: "bg-amber-500", hex: "#d97706" },
  OFF: { label: "Off", text: "text-sky-700", bg: "bg-sky-50", dot: "bg-sky-500", hex: "#0ea5e9" },
};

export const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// ---- Money helpers (integer paise) ----
export function formatINR(paise: number): string {
  const rupees = paise / 100;
  return "₹" + rupees.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function formatDate(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
