import { Button } from "@spectralset/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@spectralset/ui/dialog";
import { toast } from "@spectralset/ui/sonner";
import { Textarea } from "@spectralset/ui/textarea";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useGastownTownPath } from "renderer/hooks/useGastownTownPath";
import { electronTrpcClient } from "renderer/lib/trpc-client";

export interface NudgeTarget {
	rig: string;
	name: string;
}

interface NudgeDialogProps {
	target: NudgeTarget | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function NudgeDialog({ target, open, onOpenChange }: NudgeDialogProps) {
	const townPath = useGastownTownPath();
	const [message, setMessage] = useState("");

	useEffect(() => {
		if (!open) setMessage("");
	}, [open]);

	const nudgeMutation = useMutation({
		mutationFn: (input: {
			rig: string;
			polecat: string;
			message: string;
			townPath?: string;
		}) => electronTrpcClient.gastown.nudge.mutate(input),
		onSuccess: (_result, variables) => {
			toast.success(`Nudged ${variables.polecat}`);
			onOpenChange(false);
		},
		onError: (err: unknown) => {
			const msg = err instanceof Error ? err.message : "Failed to send nudge";
			toast.error(msg);
		},
	});

	const trimmed = message.trim();
	const disabled = !target || !trimmed || nudgeMutation.isPending;

	const handleSubmit = () => {
		if (!target || !trimmed) return;
		nudgeMutation.mutate({
			rig: target.rig,
			polecat: target.name,
			message: trimmed,
			...(townPath ? { townPath } : {}),
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-[460px]">
				<DialogHeader>
					<DialogTitle>
						Nudge{target ? ` ${target.rig}/${target.name}` : ""}
					</DialogTitle>
					<DialogDescription>
						Send a message to the polecat's Claude session. Delivered via
						<span className="ml-1 font-mono text-xs">gt nudge</span>.
					</DialogDescription>
				</DialogHeader>
				<Textarea
					value={message}
					onChange={(e) => setMessage(e.target.value)}
					placeholder="What do you want to say?"
					rows={4}
					autoFocus
					onKeyDown={(e) => {
						if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
							e.preventDefault();
							handleSubmit();
						}
					}}
				/>
				<DialogFooter className="flex-row justify-end gap-2">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => onOpenChange(false)}
						disabled={nudgeMutation.isPending}
					>
						Cancel
					</Button>
					<Button size="sm" onClick={handleSubmit} disabled={disabled}>
						{nudgeMutation.isPending ? "Sending…" : "Send nudge"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
