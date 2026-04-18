import { chmodSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { SPECTRALSET_DIR_NAME } from "shared/constants";

const SPECTRALSET_HOME_DIR_ENV = "SPECTRALSET_HOME_DIR";

export const SPECTRALSET_HOME_DIR =
	process.env[SPECTRALSET_HOME_DIR_ENV] ||
	join(homedir(), SPECTRALSET_DIR_NAME);
process.env[SPECTRALSET_HOME_DIR_ENV] = SPECTRALSET_HOME_DIR;

export const SPECTRALSET_HOME_DIR_MODE = 0o700;
export const SPECTRALSET_SENSITIVE_FILE_MODE = 0o600;

export function ensureSupersetHomeDirExists(): void {
	if (!existsSync(SPECTRALSET_HOME_DIR)) {
		mkdirSync(SPECTRALSET_HOME_DIR, {
			recursive: true,
			mode: SPECTRALSET_HOME_DIR_MODE,
		});
	}

	// Best-effort repair if the directory already existed with weak permissions.
	try {
		chmodSync(SPECTRALSET_HOME_DIR, SPECTRALSET_HOME_DIR_MODE);
	} catch (error) {
		console.warn(
			"[app-environment] Failed to chmod Superset home dir (best-effort):",
			SPECTRALSET_HOME_DIR,
			error,
		);
	}
}

// For lowdb - use our own path instead of app.getPath("userData")
export const APP_STATE_PATH = join(SPECTRALSET_HOME_DIR, "app-state.json");

// Window geometry state (separate from UI state - main process only, sync I/O)
export const WINDOW_STATE_PATH = join(
	SPECTRALSET_HOME_DIR,
	"window-state.json",
);
