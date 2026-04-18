import { listRigs, probe } from "@spectralset/gastown-cli-client";
import { publicProcedure, router } from "../../index";

export const gastownRouter = router({
	probe: publicProcedure.query(() => probe()),
	listRigs: publicProcedure.query(() => listRigs()),
});
