import { createTRPCProxyClient, type TRPCLink } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import type { AppRouter } from "lib/trpc/routers";
import superjson from "superjson";
import { ipcLink } from "trpc-electron/renderer";
import { electronTrpc } from "./electron-trpc";
import { sessionIdLink } from "./session-id-link";

// ss-8ui DIAG: log every outgoing tRPC call + result to find where gastown.agents.list is dropped
const loggingLink: TRPCLink<AppRouter> =
	() =>
	({ op, next }) =>
		observable((observer) => {
			console.log("[trpc-outgoing]", {
				path: op.path,
				type: op.type,
				input: op.input,
				id: op.id,
			});
			const sub = next(op).subscribe({
				next: (v) => {
					console.log("[trpc-incoming]", { path: op.path, id: op.id });
					observer.next(v);
				},
				error: (err) => {
					console.error("[trpc-err]", {
						path: op.path,
						id: op.id,
						message: err.message,
						shape: err.shape,
						data: err.data,
					});
					observer.error(err);
				},
				complete: () => {
					console.log("[trpc-complete]", { path: op.path, id: op.id });
					observer.complete();
				},
			});
			return () => sub.unsubscribe();
		});

/** Electron tRPC React client for React hooks (used by ElectronTRPCProvider). */
export const electronReactClient = electronTrpc.createClient({
	links: [loggingLink, sessionIdLink(), ipcLink({ transformer: superjson })],
});

/** Electron tRPC proxy client for imperative calls from stores/utilities. */
export const electronTrpcClient = createTRPCProxyClient<AppRouter>({
	links: [loggingLink, sessionIdLink(), ipcLink({ transformer: superjson })],
});
