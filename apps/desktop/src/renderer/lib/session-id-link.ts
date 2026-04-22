import type { TRPCLink } from "@trpc/client";
import type { AnyRouter } from "@trpc/server";
import { observable } from "@trpc/server/observable";

/**
 * Global counter for unique operation IDs across all tRPC clients.
 * Starts from Date.now() to ensure uniqueness across page refreshes.
 */
let globalOperationId = Date.now();

/**
 * Assigns globally unique operation IDs to prevent collisions between
 * the React client and proxy client (each creates separate IPCClients
 * that both receive all IPC responses and match by ID).
 */
export function sessionIdLink<TRouter extends AnyRouter>(): TRPCLink<TRouter> {
	return () => {
		return ({ op, next }) => {
			const uniqueId = ++globalOperationId;

			// ss-8ui DIAG: does sessionIdLink actually forward every call to the next link?
			console.log("[session-id-link] enter", {
				path: op.path,
				type: op.type,
				id: uniqueId,
			});

			return observable((observer) => {
				return next({
					...op,
					id: uniqueId,
				}).subscribe({
					next: (result) => {
						console.log("[session-id-link] next", {
							path: op.path,
							id: uniqueId,
						});
						observer.next(result);
					},
					error: (err) => {
						console.error("[session-id-link] error", {
							path: op.path,
							id: uniqueId,
							message: err.message,
						});
						observer.error(err);
					},
					complete: () => {
						console.log("[session-id-link] complete", {
							path: op.path,
							id: uniqueId,
						});
						observer.complete();
					},
				});
			});
		};
	};
}
