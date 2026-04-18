import { Badge } from "@spectralset/ui/badge";
import { Button } from "@spectralset/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@spectralset/ui/sheet";
import { useState } from "react";
import { HiOutlinePause, HiOutlinePlay } from "react-icons/hi2";
import { useGastownPeek } from "renderer/hooks/useGastownPeek";

export interface PolecatPeekTarget {
	rig: string;
	name: string;
	state: string;
}

interface PolecatPeekDrawerProps {
	target: PolecatPeekTarget | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function PolecatPeekDrawer({
	target,
	open,
	onOpenChange,
}: PolecatPeekDrawerProps) {
	const [paused, setPaused] = useState(false);

	const peekQuery = useGastownPeek({
		rig: target?.rig ?? "",
		polecat: target?.name ?? "",
		paused,
		enabled: open && target != null,
	});

	const output = peekQuery.data?.output ?? "";
	const error = peekQuery.error as Error | null;

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="w-full sm:max-w-xl">
				<SheetHeader className="border-b pb-3">
					<div className="flex items-center justify-between gap-3">
						<div className="flex items-center gap-2">
							<SheetTitle className="font-mono text-sm">
								{target ? `${target.rig}/${target.name}` : "polecat"}
							</SheetTitle>
							{target && (
								<Badge variant="secondary" className="text-xs">
									{target.state}
								</Badge>
							)}
						</div>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setPaused((p) => !p)}
							aria-label={paused ? "Resume auto-refresh" : "Pause auto-refresh"}
						>
							{paused ? (
								<HiOutlinePlay className="size-3.5" />
							) : (
								<HiOutlinePause className="size-3.5" />
							)}
							<span className="ml-1 text-xs">{paused ? "Paused" : "Live"}</span>
						</Button>
					</div>
					<SheetDescription className="text-xs">
						Last 30 lines · auto-refresh every 5s
					</SheetDescription>
				</SheetHeader>
				<div className="flex-1 overflow-y-auto px-4 pb-4">
					{error ? (
						<p className="text-sm text-destructive">
							Failed to peek: {error.message}
						</p>
					) : peekQuery.isLoading ? (
						<p className="text-sm text-muted-foreground">Loading output…</p>
					) : output.length === 0 ? (
						<p className="text-sm text-muted-foreground">No output captured.</p>
					) : (
						<pre className="whitespace-pre-wrap break-words font-mono text-xs leading-snug">
							{output}
						</pre>
					)}
				</div>
			</SheetContent>
		</Sheet>
	);
}
