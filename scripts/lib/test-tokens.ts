// Fixed private host links for local testing (spec section 12). Only the seed
// uses them; real links are always random (lib/events/host-token.ts).
export const TEST_HOST_TOKENS = {
  live: "test-live-host-link".padEnd(43, "0"), // Community Drum Circle
  needsChanges: "test-needs-changes-link".padEnd(43, "0"), // Pottery for Beginners
} as const;

export const TEST_TOKEN_EVENTS = { live: "drum", needsChanges: "pottery" } as const;
