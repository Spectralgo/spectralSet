export interface FAQItem {
	question: string;
	answer: string;
}

export const FAQ_ITEMS: FAQItem[] = [
	{
		question: "I already use an IDE like Cursor, is this for me?",
		answer:
			"SpectralSet is designed to work with your existing tool, we natively support deep-linking to IDEs like Cursor so you can open your workspaces and files in your IDE.",
	},
	{
		question: "Which AI coding agents are supported?",
		answer:
			"SpectralSet works with any CLI-based coding agent including Claude Code, OpenCode, OpenAI Codex, and more. If it runs in a terminal, it runs in SpectralSet.",
	},
	{
		question: "How does the parallel agent system work?",
		answer:
			"Each agent runs in its own isolated Git worktree, which means they can work on different branches or features simultaneously without conflicts. You can monitor all agents in real-time and switch between them instantly.",
	},
	{
		question: "Is SpectralSet free to use?",
		answer:
			"SpectralSet has a free tier. The source code is available on GitHub under Elastic License 2.0 (ELv2), so you can inspect and self-host it subject to the license terms.",
	},
	{
		question: "Can I use my own API keys?",
		answer:
			"Absolutely. SpectralSet doesn't proxy any API calls. You use your own API keys directly with whatever AI providers you choose. This means you have full control over costs and usage.",
	},
];
