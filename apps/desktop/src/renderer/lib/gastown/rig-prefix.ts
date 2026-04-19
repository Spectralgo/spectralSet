/**
 * Renderer-safe copy of getRigPrefix from gastown-cli-client.
 * Duplicated here to avoid pulling node:child_process into the
 * renderer bundle via the gastown-cli-client barrel.
 */
export function getRigPrefix(rigName: string): string {
	const match = rigName.match(/^([a-zA-Z])[a-z]*([A-Z])/);
	if (match?.[1] && match[2]) {
		return (match[1] + match[2]).toLowerCase();
	}
	return rigName.slice(0, 2).toLowerCase();
}
