// Auth
export const AUTH_PROVIDERS = ["github", "google"] as const;
export type AuthProvider = (typeof AUTH_PROVIDERS)[number];

// Deep link protocol schemes (used for desktop OAuth callbacks)
export const PROTOCOL_SCHEMES = {
	DEV: "superset-dev",
	PROD: "superset",
} as const;

// Company
// TODO: spectralset.dev is a placeholder — replace with the final provisioned
// domain once external DNS/hosting is set up. Tracked in the rebrand epic.
const MARKETING_URL =
	process.env.NEXT_PUBLIC_MARKETING_URL || "https://spectralset.dev";

export const COMPANY = {
	NAME: "SpectralSet",
	DOMAIN: "spectralset.dev",
	EMAIL_DOMAIN: "@spectralset.dev",
	GITHUB_URL: "https://github.com/Spectralgo/spectralSet",
	DOCS_URL: process.env.NEXT_PUBLIC_DOCS_URL || "https://docs.spectralset.dev",
	MARKETING_URL,
	TERMS_URL: `${MARKETING_URL}/terms`,
	PRIVACY_URL: `${MARKETING_URL}/privacy`,
	CHANGELOG_URL: `${MARKETING_URL}/changelog`,
	PRICING_URL: `${MARKETING_URL}/pricing`,
	X_URL: "https://x.com/spectralset",
	MAIL_TO: "mailto:founders@spectralset.dev",
	REPORT_ISSUE_URL: "https://github.com/Spectralgo/spectralSet/issues/new",
	// TODO: External provisioning deferred — replace with real Discord invite.
	DISCORD_URL: "https://discord.gg/TBD",
} as const;

// Theme
export const THEME_STORAGE_KEY = "superset-theme";

// Download URLs
export const DOWNLOAD_URL_MAC_ARM64 = `${COMPANY.GITHUB_URL}/releases/latest/download/Superset-arm64.dmg`;

// Auth token configuration
export const TOKEN_CONFIG = {
	/** Access token lifetime in seconds (1 hour) */
	ACCESS_TOKEN_EXPIRY: 60 * 60,
	/** Refresh token lifetime in seconds (30 days) */
	REFRESH_TOKEN_EXPIRY: 30 * 24 * 60 * 60,
	/** Refresh access token when this many seconds remain (5 minutes) */
	REFRESH_THRESHOLD: 5 * 60,
} as const;

// Workspace teardown
export const TEARDOWN_TIMEOUT_MS = 60_000;

// PostHog
export const POSTHOG_COOKIE_NAME = "superset";

export const FEATURE_FLAGS = {
	/** Gates access to experimental Electric SQL tasks feature. */
	ELECTRIC_TASKS_ACCESS: "electric-tasks-access",
	/** Gates access to the experimental mobile-first agents UI on web. */
	WEB_AGENTS_UI_ACCESS: "web-agents-ui-access",
	/** Gates access to GitHub integration (currently buggy, internal only). */
	GITHUB_INTEGRATION_ACCESS: "github-integration-access",
	/** Gates access to Slack integration (internal only). */
	SLACK_INTEGRATION_ACCESS: "slack-integration-access",
	/** Gates access to Cloud features (environment variables, sandboxes). */
	CLOUD_ACCESS: "cloud-access",
	/** When enabled, blocks remote agent execution on the desktop (e.g., for enterprise orgs). */
	DISABLE_REMOTE_AGENT: "disable-remote-agent",
	/** Gates access to V2 Cloud features (host-service, cloud sprites). */
	V2_CLOUD: "v2-cloud",
} as const;
