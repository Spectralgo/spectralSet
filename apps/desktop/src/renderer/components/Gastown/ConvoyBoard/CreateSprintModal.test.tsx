import { describe, expect, it, mock } from "bun:test";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

mock.module("@spectralset/ui/dialog", () => {
	const Pass = ({ children }: { children?: ReactNode }) => <>{children}</>;
	return {
		Dialog: Pass,
		DialogContent: Pass,
		DialogDescription: Pass,
		DialogHeader: Pass,
		DialogTitle: Pass,
	};
});

const { CreateSprintModal } = await import("./CreateSprintModal");

const baseProps = {
	open: true,
	existingConvoys: [],
	isPending: false,
	errorMessage: null,
	onOpenChange: () => {},
	onSubmit: () => {},
};

describe("CreateSprintModal", () => {
	it("renders single-id placeholder and post-creation helper text", () => {
		const html = renderToStaticMarkup(<CreateSprintModal {...baseProps} />);
		expect(html).toContain('placeholder="e.g. ss-abc"');
		expect(html).not.toContain("gt-xyz");
		expect(html).toContain("Track more issues after creation");
	});
});
