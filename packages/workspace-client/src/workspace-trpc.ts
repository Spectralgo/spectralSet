import type { AppRouter } from "@spectralset/host-service/trpc";
import { createTRPCReact } from "@trpc/react-query";

export const workspaceTrpc = createTRPCReact<AppRouter>();
