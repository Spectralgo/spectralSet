import { describe, expect, it, mock } from "bun:test";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PaneErrorBoundary } from "./PaneErrorBoundary";

const crashed = (children: ReactNode) => {
	const i = new PaneErrorBoundary({ children });
	i.state = { hasError: true, resetKey: 0 };
	return i;
};

describe("PaneErrorBoundary", () => {
	it("catches throw: getDerivedStateFromError flips hasError, fallback hides children", () => {
		expect(PaneErrorBoundary.getDerivedStateFromError()).toEqual({
			hasError: true,
		});
		const html = renderToStaticMarkup(crashed(<span>child-x</span>).render());
		expect(html).toContain("data-pane-error-fallback");
		expect(html).not.toContain("child-x");
	});

	it("retry remounts: clears hasError, bumps resetKey, fires onReset (would re-render children)", () => {
		const onReset = mock(() => {});
		const i = new PaneErrorBoundary({ children: null, onReset });
		// biome-ignore lint/suspicious/noExplicitAny: capture setState updater
		let u: any;
		i.setState = ((fn: typeof u) => {
			u = fn;
		}) as typeof i.setState;
		i.handleRetry();
		expect(u({ hasError: true, resetKey: 0 })).toEqual({
			hasError: false,
			resetKey: 1,
		});
		expect(onReset).toHaveBeenCalledTimes(1);
	});

	it("isolation: a sibling boundary keeps rendering when its neighbour crashes", () => {
		const ok = new PaneErrorBoundary({ children: <span>sibling-ok</span> });
		const html = renderToStaticMarkup(
			<>
				{crashed(<span>A</span>).render()}
				{ok.render()}
			</>,
		);
		expect(html).toContain("sibling-ok");
		expect(html).not.toContain(">A<");
	});

	it("error fallback microcopy: 'Something went wrong' with a Retry control", () => {
		const html = renderToStaticMarkup(crashed(null).render());
		expect(html).toContain("Something went wrong");
		expect(html).toContain("Retry");
	});
});
