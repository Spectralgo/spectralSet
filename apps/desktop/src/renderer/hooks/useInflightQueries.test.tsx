import { describe, expect, it } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import { countInflight } from "./useInflightQueries";

describe("countInflight", () => {
	it("counts pending gastown queries/mutations and ignores non-gastown", () => {
		const c = new QueryClient();
		void c.fetchQuery({
			queryKey: ["gastown", "probe"],
			queryFn: () => new Promise(() => {}),
		});
		void c.fetchQuery({
			queryKey: ["settings", "x"],
			queryFn: () => new Promise(() => {}),
		});
		void c
			.getMutationCache()
			.build(c, {
				mutationKey: ["gastown", "sling"],
				mutationFn: () => new Promise(() => {}),
			})
			.execute(undefined);
		const r = countInflight(c);
		expect(r.loading).toBe(1);
		expect(r.mutating).toBe(1);
	});
});
