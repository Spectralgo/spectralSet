import {
	DndContext,
	type DragEndEvent,
	MouseSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { type ReactNode, useCallback, useMemo } from "react";
import { ConvoyColumn } from "./ConvoyColumn";

export type BeadStatus = "open" | "hooked" | "closed";

export interface ConvoyBead {
	id: string;
	title: string;
	status: BeadStatus;
}

const COLUMNS: { status: BeadStatus; label: string }[] = [
	{ status: "open", label: "Open" },
	{ status: "hooked", label: "Hooked" },
	{ status: "closed", label: "Closed" },
];

interface ConvoyBoardShellProps {
	beads: ConvoyBead[];
	onStatusChange: (beadId: string, next: BeadStatus) => void;
	renderCard: (bead: ConvoyBead) => ReactNode;
}

export function ConvoyBoardShell({
	beads,
	onStatusChange,
	renderCard,
}: ConvoyBoardShellProps) {
	const sensors = useSensors(
		useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
	);

	const grouped = useMemo(() => {
		const map = new Map<BeadStatus, ConvoyBead[]>();
		for (const c of COLUMNS) map.set(c.status, []);
		for (const b of beads) map.get(b.status)?.push(b);
		return map;
	}, [beads]);

	const handleDragEnd = useCallback(
		({ active, over }: DragEndEvent) => {
			const next = over?.data.current?.statusId as BeadStatus | undefined;
			const bead = beads.find((b) => b.id === active.id);
			if (!next || !bead || bead.status === next) return;
			onStatusChange(bead.id, next);
		},
		[beads, onStatusChange],
	);

	return (
		<DndContext sensors={sensors} onDragEnd={handleDragEnd}>
			<div className="flex-1 flex gap-2 overflow-x-auto overflow-y-hidden px-4 py-3 min-h-0 min-w-0">
				{COLUMNS.map((c) => (
					<ConvoyColumn
						key={c.status}
						status={c.status}
						label={c.label}
						beads={grouped.get(c.status) ?? []}
						renderCard={renderCard}
					/>
				))}
			</div>
		</DndContext>
	);
}
