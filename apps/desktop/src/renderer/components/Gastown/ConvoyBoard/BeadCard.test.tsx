import { describe, expect, it } from "bun:test";
import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { renderToStaticMarkup } from "react-dom/server";
import { BeadCard } from "./BeadCard";
import type { ConvoyBead } from "./types";

function render(bead: ConvoyBead, stackCount?: number) {
	return renderToStaticMarkup(
		<DndContext>
			<SortableContext items={[bead.id]}>
				<BeadCard bead={bead} stackCount={stackCount} />
			</SortableContext>
		</DndContext>,
	);
}

const base: ConvoyBead = {
	id: "ss-1",
	title: "Lay rails",
	status: "open",
	assignee: null,
	priority: 0,
};

describe("BeadCard", () => {
	it("renders open variant with id, title, priority pill", () => {
		const html = render(base);
		expect(html).toContain("ss-1");
		expect(html).toContain("Lay rails");
		expect(html).toContain("P0");
	});

	it("renders hooked variant with avatar fallback for assignee", () => {
		const html = render({
			...base,
			status: "hooked",
			assignee: "spectralSet/polecats/basalt",
			priority: 1,
		});
		expect(html).toContain("P1");
		// Avatar fallback shows initials when no image is available
		expect(html.toLowerCase()).toContain("avatar");
	});

	it("renders closed variant", () => {
		const html = render({ ...base, status: "closed", priority: 3 });
		expect(html).toContain("ss-1");
		expect(html).toContain("P3");
	});

	it("renders stranded variant with orange ring", () => {
		const html = render({ ...base, status: "stranded", priority: 0 });
		expect(html).toContain("ring-orange-500");
	});

	it("renders many-to-one stack indicator when stackCount > 1", () => {
		const html = render(
			{ ...base, status: "hooked", assignee: "polecat/a" },
			3,
		);
		expect(html).toContain("+2");
	});
});
