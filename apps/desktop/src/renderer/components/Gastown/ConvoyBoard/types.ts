import type {
	ConvoyBead,
	ConvoyBeadStatus,
} from "@spectralset/gastown-cli-client";

export type ConvoyMode = "owned" | "auto";
export type ConvoyKind = "sprint" | "integration" | "epic";
export type BeadStatus = ConvoyBeadStatus;
export type { ConvoyBead };
