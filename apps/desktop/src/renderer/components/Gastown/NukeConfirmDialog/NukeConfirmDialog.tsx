import type { RecoveryCheck } from "@spectralset/gastown-cli-client";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@spectralset/ui/alert-dialog";
import { Button } from "@spectralset/ui/button";
import { toast } from "@spectralset/ui/sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getHostServiceClientByUrl } from "renderer/lib/host-service-client";
import { useLocalHostService } from "renderer/routes/_authenticated/providers/LocalHostServiceProvider";

export interface NukeTarget {
	rig: string;
	name: string;
}

interface NukeConfirmDialogProps {
	target: NukeTarget | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function NukeConfirmDialog({
	target,
	open,
	onOpenChange,
}: NukeConfirmDialogProps) {
	const { activeHostUrl } = useLocalHostService();
	const queryClient = useQueryClient();

	const recoveryQuery = useQuery<RecoveryCheck>({
		queryKey: [
			"host",
			"gastown",
			"checkRecovery",
			activeHostUrl,
			target?.rig,
			target?.name,
		],
		queryFn: async () => {
			if (!activeHostUrl || !target) {
				throw new Error("Host service unavailable");
			}
			const client = getHostServiceClientByUrl(activeHostUrl);
			return await client.host.gastown.checkRecovery.query({
				rig: target.rig,
				polecat: target.name,
			});
		},
		enabled: open && !!activeHostUrl && !!target,
		refetchOnWindowFocus: false,
		staleTime: 0,
	});

	const nukeMutation = useMutation({
		mutationFn: async (input: {
			rig: string;
			polecat: string;
			force: boolean;
		}) => {
			if (!activeHostUrl) throw new Error("Host service unavailable");
			const client = getHostServiceClientByUrl(activeHostUrl);
			return await client.host.gastown.nuke.mutate(input);
		},
		onSuccess: (_result, variables) => {
			toast.success(`Nuked ${variables.polecat}`);
			queryClient.invalidateQueries({
				queryKey: ["host", "gastown", "listPolecats"],
			});
			onOpenChange(false);
		},
		onError: (err: unknown) => {
			const message =
				err instanceof Error ? err.message : "Failed to nuke polecat";
			toast.error(message);
		},
	});

	const recovery = recoveryQuery.data;
	const canNuke = recovery?.canNuke === true;
	const suggestions = recovery?.suggestions ?? [];

	const handleConfirm = (force: boolean) => {
		if (!target) return;
		nukeMutation.mutate({
			rig: target.rig,
			polecat: target.name,
			force,
		});
	};

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent className="max-w-[420px]">
				<AlertDialogHeader>
					<AlertDialogTitle>
						Nuke{target ? ` ${target.rig}/${target.name}` : ""}?
					</AlertDialogTitle>
					<AlertDialogDescription asChild>
						<div className="space-y-2 text-xs text-muted-foreground">
							{recoveryQuery.isLoading ? (
								<span>Checking recovery status…</span>
							) : recoveryQuery.error ? (
								<span className="text-destructive">
									Failed to check recovery:{" "}
									{recoveryQuery.error instanceof Error
										? recoveryQuery.error.message
										: "unknown error"}
								</span>
							) : canNuke ? (
								<span>
									This will close {target?.name}'s session, delete its git
									worktree and branch, and close the agent bead.
								</span>
							) : (
								<>
									<span className="block text-amber-700 dark:text-amber-400">
										{target?.name} has active work. Force-nuke will lose it.
									</span>
									{suggestions.length > 0 && (
										<ul className="list-disc space-y-0.5 pl-4">
											{suggestions.map((s) => (
												<li key={s}>{s}</li>
											))}
										</ul>
									)}
								</>
							)}
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter className="flex-row justify-end gap-2">
					<Button
						variant="ghost"
						size="sm"
						className="h-7 px-3 text-xs"
						onClick={() => onOpenChange(false)}
						disabled={nukeMutation.isPending}
					>
						Cancel
					</Button>
					{recoveryQuery.isSuccess && canNuke && (
						<Button
							variant="destructive"
							size="sm"
							className="h-7 px-3 text-xs"
							onClick={() => handleConfirm(false)}
							disabled={nukeMutation.isPending}
						>
							{nukeMutation.isPending ? "Nuking…" : "Nuke"}
						</Button>
					)}
					{recoveryQuery.isSuccess && !canNuke && (
						<Button
							variant="destructive"
							size="sm"
							className="h-7 px-3 text-xs"
							onClick={() => handleConfirm(true)}
							disabled={nukeMutation.isPending}
						>
							{nukeMutation.isPending ? "Force-nuking…" : "Force Nuke"}
						</Button>
					)}
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
