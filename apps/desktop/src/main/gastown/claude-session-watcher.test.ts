import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findClaudeSessionFile } from "./claude-session-watcher";

describe("findClaudeSessionFile", () => {
	let claudeProjectsDir: string;

	beforeEach(async () => {
		claudeProjectsDir = await mkdtemp(join(tmpdir(), "claude-projects-"));
	});

	afterEach(async () => {
		await rm(claudeProjectsDir, { recursive: true, force: true });
	});

	it("returns the most-recently-modified session for a project", async () => {
		const cloneDir = "/Users/test/repo";
		const projectHash = "-Users-test-repo";
		const dir = join(claudeProjectsDir, projectHash);
		await mkdir(dir, { recursive: true });
		const oldPath = join(dir, "old-uuid.jsonl");
		const newPath = join(dir, "new-uuid.jsonl");
		await writeFile(oldPath, "");
		await new Promise((r) => setTimeout(r, 20));
		await writeFile(newPath, "");

		const result = await findClaudeSessionFile({ cloneDir, claudeProjectsDir });

		expect(result).not.toBeNull();
		expect(result?.path).toBe(newPath);
		expect(result?.sessionUuid).toBe("new-uuid");
		expect(result?.projectHash).toBe(projectHash);
	});

	it("returns null when the project hash directory does not exist", async () => {
		const result = await findClaudeSessionFile({
			cloneDir: "/Users/missing/path",
			claudeProjectsDir,
		});
		expect(result).toBeNull();
	});

	it("returns null when the project directory is empty", async () => {
		const cloneDir = "/Users/empty/repo";
		const projectHash = "-Users-empty-repo";
		await mkdir(join(claudeProjectsDir, projectHash), { recursive: true });

		const result = await findClaudeSessionFile({ cloneDir, claudeProjectsDir });
		expect(result).toBeNull();
	});

	it("ignores non-jsonl files in the project directory", async () => {
		const cloneDir = "/Users/mixed/repo";
		const projectHash = "-Users-mixed-repo";
		const dir = join(claudeProjectsDir, projectHash);
		await mkdir(dir, { recursive: true });
		await writeFile(join(dir, "notes.txt"), "ignore me");

		const result = await findClaudeSessionFile({ cloneDir, claudeProjectsDir });
		expect(result).toBeNull();
	});
});
