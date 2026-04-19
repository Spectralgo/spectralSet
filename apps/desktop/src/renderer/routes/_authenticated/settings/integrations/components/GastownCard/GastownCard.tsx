import { Button } from "@spectralset/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
} from "@spectralset/ui/card";
import { Input } from "@spectralset/ui/input";
import { Label } from "@spectralset/ui/label";
import { Switch } from "@spectralset/ui/switch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { HiOutlineArrowTopRightOnSquare } from "react-icons/hi2";
import {
	setGastownTownPath,
	useGastownTownPath,
} from "renderer/hooks/useGastownTownPath";
import { apiTrpcClient } from "renderer/lib/api-trpc-client";
import { electronTrpcClient } from "renderer/lib/trpc-client";
import { GastownRigList } from "../GastownRigList";
import { GastownStatus } from "../GastownStatus";

const GASTOWN_DOCS_URL = "https://github.com/spectralgo/gastown";
const TOWN_PATH_PLACEHOLDER = "~/code/spectralGasTown";

const ENABLED_QUERY_KEY = ["user", "gastownEnabled"] as const;

export function GastownCard() {
	const queryClient = useQueryClient();
	const townPath = useGastownTownPath();
	const [townPathDraft, setTownPathDraft] = useState(townPath);

	useEffect(() => {
		setGastownTownPath(townPathDraft);
	}, [townPathDraft]);

	const probeQuery = useQuery({
		queryKey: ["electron", "gastown", "probe", townPath],
		queryFn: () =>
			electronTrpcClient.gastown.probe.query(
				townPath ? { townPath } : undefined,
			),
		refetchOnWindowFocus: false,
	});

	// Auto-populate the Town Path input with the probe-detected root when
	// the user hasn't set one yet. One-shot per session: once the user
	// edits or clears the field we stop overwriting so they remain in
	// control.
	const autoFilledRef = useRef(false);
	useEffect(() => {
		if (autoFilledRef.current) return;
		if (townPathDraft) return;
		const detected = probeQuery.data?.townRoot;
		if (!detected) return;
		autoFilledRef.current = true;
		setTownPathDraft(detected);
	}, [probeQuery.data?.townRoot, townPathDraft]);

	const enabledQuery = useQuery({
		queryKey: ENABLED_QUERY_KEY,
		queryFn: () => apiTrpcClient.user.getGastownEnabled.query(),
	});

	const setEnabled = useMutation({
		mutationFn: (enabled: boolean) =>
			apiTrpcClient.user.setGastownEnabled.mutate({ enabled }),
		onMutate: async (enabled) => {
			await queryClient.cancelQueries({ queryKey: ENABLED_QUERY_KEY });
			const previous = queryClient.getQueryData<{ enabled: boolean }>(
				ENABLED_QUERY_KEY,
			);
			queryClient.setQueryData(ENABLED_QUERY_KEY, { enabled });
			return { previous };
		},
		onError: (_err, _vars, context) => {
			if (context?.previous) {
				queryClient.setQueryData(ENABLED_QUERY_KEY, context.previous);
			}
		},
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: ENABLED_QUERY_KEY });
		},
	});

	const enabled = enabledQuery.data?.enabled ?? false;
	const installed = probeQuery.data?.installed ?? false;

	return (
		<Card>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between gap-3">
					<div className="flex items-center gap-3">
						<div className="flex size-10 items-center justify-center rounded-lg border bg-muted/50">
							<GastownGlyph />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<span className="font-medium">Gas Town</span>
								<GastownStatus
									probe={probeQuery.data ?? undefined}
									isLoading={probeQuery.isLoading}
									error={probeQuery.isError}
								/>
							</div>
							<CardDescription className="mt-0.5">
								Dispatch work to local Gas Town rigs and polecats
							</CardDescription>
						</div>
					</div>
					<div className="flex items-center gap-3">
						<Switch
							checked={enabled}
							disabled={enabledQuery.isLoading || setEnabled.isPending}
							onCheckedChange={(value) => setEnabled.mutate(value)}
							aria-label="Enable Gas Town integration"
						/>
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-3 pt-0">
				<div className="flex flex-col gap-1.5">
					<Label
						htmlFor="gastown-town-path"
						className="text-xs text-muted-foreground"
					>
						Town path (optional)
					</Label>
					<Input
						id="gastown-town-path"
						value={townPathDraft}
						onChange={(e) => setTownPathDraft(e.target.value)}
						placeholder={TOWN_PATH_PLACEHOLDER}
						spellCheck={false}
						autoCorrect="off"
						autoCapitalize="off"
					/>
					<p className="text-xs text-muted-foreground">
						Override auto-detection. Used as the working directory when invoking
						gt/bd. Leave blank to use the default discovered town.
					</p>
				</div>
				{!installed && !probeQuery.isLoading && (
					<p className="text-sm text-muted-foreground">
						Gas Town CLI not found on PATH.{" "}
						<Button
							variant="link"
							size="sm"
							className="h-auto p-0 text-sm"
							onClick={() => window.open(GASTOWN_DOCS_URL, "_blank")}
						>
							Install instructions
							<HiOutlineArrowTopRightOnSquare className="ml-1 size-3" />
						</Button>
					</p>
				)}
				{enabled && installed && (
					<GastownRigList
						fallbackTownRoot={probeQuery.data?.townRoot ?? undefined}
					/>
				)}
			</CardContent>
		</Card>
	);
}

function GastownGlyph() {
	return (
		<span
			aria-hidden
			className="font-mono text-xs font-semibold tracking-tight"
		>
			GT
		</span>
	);
}
