import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { type ConvoyBead, ConvoyBoardShell } from "./ConvoyBoardShell";

const renderCard = (b: ConvoyBead) => <div data-bead-id={b.id}>{b.title}</div>;

describe("ConvoyBoardShell", () => {
	it("renders three columns with empty placeholders when no issues", () => {
		const html = renderToStaticMarkup(
			<ConvoyBoardShell
				beads={[]}
				onStatusChange={() => {}}
				renderCard={renderCard}
			/>,
		);
		expect(html).toContain("Open");
		expect(html).toContain("Hooked");
		expect(html).toContain("Closed");
		expect(html.match(/No issues/g)?.length).toBe(3);
	});

	it("groups beads into the correct columns", () => {
		const beads: ConvoyBead[] = [
			{ id: "ss-1", title: "Lay rails", status: "open" },
			{ id: "ss-2", title: "Paint cars", status: "hooked" },
			{ id: "ss-3", title: "Inspect", status: "closed" },
		];
		const html = renderToStaticMarkup(
			<ConvoyBoardShell
				beads={beads}
				onStatusChange={() => {}}
				renderCard={renderCard}
			/>,
		);
		expect(html).toContain("Lay rails");
		expect(html).toContain("Paint cars");
		expect(html).toContain("Inspect");
		expect(html).not.toContain("No issues");
	});
});
