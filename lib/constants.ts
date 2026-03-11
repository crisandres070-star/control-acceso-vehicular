export const ACCESS_DECISIONS = ["YES", "NO"] as const;

export type AccessDecision = (typeof ACCESS_DECISIONS)[number];
