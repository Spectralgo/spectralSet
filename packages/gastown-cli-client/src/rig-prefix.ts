/**
 * Computes the Gas Town bead-prefix used for a rig's tmux session names
 * from the rig name. Mirrors the convention used by `gt` when it creates
 * sessions like `ss-jasper`, `sc-witness`, `gm-refinery`:
 *
 *   camelCase rig  → first letter + first uppercase letter, lowercased
 *   spectralSet    → "ss"
 *   spectralChat   → "sc"
 *   spectralNotify → "sn"
 *   spectralPaper  → "sp"
 *   spectralTranscript → "st"
 *
 *   flat rig (no inner capitals) → first two letters lowercased
 *   gmux → "gm"
 *
 * The authoritative source is each rig's `.repo.git/config`
 * `[beads] issue-prefix`, but those files live on disk and the common
 * cases are all deterministic from the name. If a rig's prefix ever
 * diverges from this heuristic, fall back to reading the config file
 * explicitly.
 */
export function getRigPrefix(rigName: string): string {
	const match = rigName.match(/^([a-zA-Z])[a-z]*([A-Z])/);
	if (match?.[1] && match[2]) {
		return (match[1] + match[2]).toLowerCase();
	}
	return rigName.slice(0, 2).toLowerCase();
}
