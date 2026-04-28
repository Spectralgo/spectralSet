import type { Convoy } from "@spectralset/gastown-cli-client";
import { Button } from "@spectralset/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@spectralset/ui/dialog";
import { Input } from "@spectralset/ui/input";
import { Label } from "@spectralset/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@spectralset/ui/select";
import { Switch } from "@spectralset/ui/switch";
import { useEffect, useState } from "react";

type MergeStrategy = "direct" | "mr" | "local";

interface CreateSprintModalProps {
	open: boolean;
	existingConvoys: readonly Pick<Convoy, "title">[];
	isPending: boolean;
	errorMessage: string | null;
	onOpenChange: (open: boolean) => void;
	onSubmit: (input: {
		name: string;
		issueIds: string[];
		owned: boolean;
		mergeStrategy: MergeStrategy;
	}) => void;
}

export function CreateSprintModal({
	open,
	existingConvoys,
	isPending,
	errorMessage,
	onOpenChange,
	onSubmit,
}: CreateSprintModalProps) {
	const [name, setName] = useState("");
	const [issueId, setIssueId] = useState("");
	const [owned, setOwned] = useState(true);
	const [mergeStrategy, setMergeStrategy] = useState<MergeStrategy>("direct");

	useEffect(() => {
		if (open) {
			setName("");
			setIssueId("");
			setOwned(true);
			setMergeStrategy("direct");
		}
	}, [open]);

	const trimmedName = name.trim();
	const trimmedIssueId = issueId.trim();
	const isDuplicate = existingConvoys.some(
		(c) => c.title.trim().toLowerCase() === trimmedName.toLowerCase(),
	);
	const nameError =
		trimmedName.length === 0
			? null
			: trimmedName.length > 100
				? "Name must be 100 characters or less"
				: isDuplicate
					? "A sprint with this name already exists"
					: null;
	const canSubmit =
		!isPending &&
		trimmedName.length > 0 &&
		trimmedName.length <= 100 &&
		!isDuplicate &&
		trimmedIssueId.length > 0;

	const handleSubmit = () => {
		if (!canSubmit) return;
		onSubmit({
			name: trimmedName,
			issueIds: [trimmedIssueId],
			owned,
			mergeStrategy,
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="sm:max-w-md"
				onKeyDown={(e) => {
					if (e.key === "Enter" && !e.shiftKey && canSubmit) {
						e.preventDefault();
						handleSubmit();
					}
				}}
			>
				<DialogHeader>
					<DialogTitle>Create sprint</DialogTitle>
					<DialogDescription>
						Spin up a new convoy to track related issues.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4">
					<div className="space-y-1.5">
						<Label htmlFor="sprint-name">Name</Label>
						<Input
							id="sprint-name"
							placeholder="e.g. Wave R-3 rebaseline"
							value={name}
							onChange={(e) => setName(e.target.value)}
							maxLength={100}
							disabled={isPending}
							aria-invalid={Boolean(nameError)}
							autoFocus
						/>
						{nameError ? (
							<p className="text-destructive text-xs">{nameError}</p>
						) : null}
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="sprint-issue">First issue</Label>
						<Input
							id="sprint-issue"
							placeholder="e.g. ss-abc, gt-xyz"
							value={issueId}
							onChange={(e) => setIssueId(e.target.value)}
							disabled={isPending}
							className="font-mono text-sm"
						/>
						<p className="text-muted-foreground text-xs">
							Required by gt — at least one issue ID to seed the sprint.
						</p>
					</div>
					<div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
						<div>
							<Label htmlFor="sprint-owned" className="text-sm">
								Owned
							</Label>
							<p className="text-muted-foreground text-xs">
								Caller manages lifecycle (no auto refinery handoff).
							</p>
						</div>
						<Switch
							id="sprint-owned"
							checked={owned}
							onCheckedChange={setOwned}
							disabled={isPending}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="sprint-merge">Merge strategy</Label>
						<Select
							value={mergeStrategy}
							onValueChange={(v) => setMergeStrategy(v as MergeStrategy)}
							disabled={isPending}
						>
							<SelectTrigger id="sprint-merge">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="direct">direct — push to main</SelectItem>
								<SelectItem value="mr">mr — merge queue</SelectItem>
								<SelectItem value="local">local — keep on branch</SelectItem>
							</SelectContent>
						</Select>
					</div>
					{errorMessage ? (
						<p role="alert" className="text-destructive text-sm">
							{errorMessage}
						</p>
					) : null}
					<div className="flex justify-end gap-2 pt-2">
						<Button
							type="button"
							variant="ghost"
							onClick={() => onOpenChange(false)}
							disabled={isPending}
						>
							Cancel
						</Button>
						<Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
							{isPending ? "Creating…" : "Create sprint"}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
