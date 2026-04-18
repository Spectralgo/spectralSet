import { Button } from "@spectralset/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
} from "@spectralset/ui/card";
import { Switch } from "@spectralset/ui/switch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HiOutlineArrowTopRightOnSquare } from "react-icons/hi2";
import { apiTrpcClient } from "renderer/lib/api-trpc-client";
import { getHostServiceClientByUrl } from "renderer/lib/host-service-client";
import { useLocalHostService } from "renderer/routes/_authenticated/providers/LocalHostServiceProvider";
import { GastownRigList } from "../GastownRigList";
import { GastownStatus } from "../GastownStatus";

const GASTOWN_DOCS_URL = "https://github.com/spectralgo/gastown";

const ENABLED_QUERY_KEY = ["user", "gastownEnabled"] as const;

export function GastownCard() {
	const queryClient = useQueryClient();
	const { activeHostUrl } = useLocalHostService();

	const probeQuery = useQuery({
		queryKey: ["host", "gastown", "probe", activeHostUrl],
		queryFn: async () => {
			if (!activeHostUrl) return null;
			const client = getHostServiceClientByUrl(activeHostUrl);
			return await client.host.gastown.probe.query();
		},
		enabled: !!activeHostUrl,
		refetchOnWindowFocus: false,
	});

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
			{!installed && !probeQuery.isLoading && (
				<CardContent className="pt-0">
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
				</CardContent>
			)}
			{enabled && installed && (
				<CardContent className="pt-0">
					<GastownRigList />
				</CardContent>
			)}
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
