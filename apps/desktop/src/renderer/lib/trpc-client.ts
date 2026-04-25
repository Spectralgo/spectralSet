import { createTRPCProxyClient, type TRPCLink } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import type { AppRouter } from "lib/trpc/routers";
import superjson from "superjson";
import { ipcLink } from "trpc-electron/renderer";
import { electronTrpc } from "./electron-trpc";
import { sessionIdLink } from "./session-id-link";

const errorLoggingLink: TRPCLink<AppRouter> =
	() =>
	({ op, next }) =>
		observable((observer) => {
			const sub = next(op).subscribe({
				next: (v) => {
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
					observer.complete();
				},
			});
			return () => sub.unsubscribe();
		});

/** Electron tRPC React client for React hooks (used by ElectronTRPCProvider). */
export const electronReactClient = electronTrpc.createClient({
	links: [
		errorLoggingLink,
		sessionIdLink(),
		ipcLink({ transformer: superjson }),
	],
});

/** Electron tRPC proxy client for imperative calls from stores/utilities. */
export const electronTrpcClient = createTRPCProxyClient<AppRouter>({
	links: [
		errorLoggingLink,
		sessionIdLink(),
		ipcLink({ transformer: superjson }),
	],
});
