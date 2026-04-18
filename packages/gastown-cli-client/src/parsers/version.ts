const VERSION_LINE_RE = /^\s*gt\s+version\s+(\S+)/im;

export function parseVersion(stdout: string): string | null {
	const match = stdout.match(VERSION_LINE_RE);
	return match?.[1] ?? null;
}
