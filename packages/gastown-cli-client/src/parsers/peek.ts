import type { PeekResult } from "../types";

export function parsePeek(stdout: string): PeekResult {
	return { output: stdout.replace(/\r\n/g, "\n").replace(/\s+$/u, "") };
}
