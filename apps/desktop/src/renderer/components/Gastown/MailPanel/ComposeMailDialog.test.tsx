import { describe, expect, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

const probeState = {
	data: { rigs: [{ name: "spectralSet" }] },
	isLoading: false,
	error: null,
};

mock.module("renderer/lib/electron-trpc", () => ({
	electronTrpc: {
		gastown: { probe: { useQuery: () => probeState } },
	},
}));

mock.module("@spectralset/ui/sonner", () => ({
	toast: { success: () => {}, error: () => {} },
}));

const sendMutateSpy = mock(async (_input: unknown) => ({ ok: true as const }));
mock.module("renderer/lib/trpc-client", () => ({
	electronTrpcClient: {
		gastown: { mail: { send: { mutate: sendMutateSpy } } },
	},
}));

mock.module("renderer/hooks/useGastownTownPath", () => ({
	useGastownTownPath: () => "/tmp/town",
}));

const invalidateSpy = mock((_args: unknown) => {});
type MutationOptions = {
	mutationFn: (v: unknown) => Promise<unknown>;
	onSuccess: (r: unknown, v: unknown) => void;
	onError: (e: unknown) => void;
};
let lastMutationOptions: MutationOptions | null = null;

mock.module("@tanstack/react-query", () => ({
	useQueryClient: () => ({ invalidateQueries: invalidateSpy }),
	useMutation: (opts: MutationOptions) => {
		lastMutationOptions = opts;
		return { mutate: opts.mutationFn, isPending: false };
	},
}));

const {
	ComposeMailDialog,
	MAIL_INBOX_QUERY_KEY,
	buildSendVariables,
	emptyForm,
} = await import("./ComposeMailDialog");

describe("emptyForm", () => {
	it("defaults pinned=true and type=task when recipient is mayor/", () => {
		expect(emptyForm("mayor/")).toMatchObject({ pinned: true, type: "task" });
	});

	it("defaults pinned=false and type=notification for non-mayor recipients", () => {
		expect(emptyForm("spectralSet/witness")).toMatchObject({
			pinned: false,
			type: "notification",
		});
	});

	it("defaults pinned=false for empty recipient", () => {
		expect(emptyForm("")).toMatchObject({
			pinned: false,
			type: "notification",
		});
	});
});

describe("buildSendVariables", () => {
	const base = {
		to: "mayor/",
		subject: "Hi",
		body: "hello",
		priority: "normal" as const,
		type: "notification" as const,
		pinned: false,
	};

	it("produces a send payload with trimmed fields and townPath", () => {
		const r = buildSendVariables(
			{
				...base,
				to: "  spectralSet/witness  ",
				subject: "  S  ",
				body: "  B ",
			},
			"/tmp/town",
		);
		expect(r.ok).toBe(true);
		if (r.ok) {
			expect(r.value).toEqual({
				to: "spectralSet/witness",
				subject: "S",
				body: "B",
				priority: "normal",
				type: "notification",
				pinned: false,
				townPath: "/tmp/town",
			});
		}
	});

	it("omits townPath when unset", () => {
		const r = buildSendVariables(base, "");
		expect(r.ok).toBe(true);
		if (r.ok) expect("townPath" in r.value).toBe(false);
	});

	it("rejects recipients missing a slash", () => {
		const r = buildSendVariables({ ...base, to: "mayor" }, "");
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.error).toMatch(/Recipient/);
	});

	it("requires a subject", () => {
		const r = buildSendVariables({ ...base, subject: "   " }, "");
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.error).toMatch(/Subject/);
	});

	it("requires a body", () => {
		const r = buildSendVariables({ ...base, body: "" }, "");
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.error).toMatch(/Body/);
	});
});

describe("ComposeMailDialog", () => {
	it("renders (dialog content is portaled, SSR markup is empty)", () => {
		// Radix Dialog portals its content to document.body, which SSR cannot
		// serialize — so markup is empty regardless of the open prop. The
		// assertion below just proves rendering doesn't throw.
		const html = renderToStaticMarkup(
			<ComposeMailDialog open={true} onOpenChange={() => {}} />,
		);
		expect(html).toBe("");
	});

	it("wires mutation shape and invalidation queryKey", async () => {
		sendMutateSpy.mockClear();
		invalidateSpy.mockClear();
		const onOpenChange = mock((_next: boolean) => {});
		renderToStaticMarkup(
			<ComposeMailDialog open={true} onOpenChange={onOpenChange} />,
		);
		expect(lastMutationOptions).not.toBeNull();
		const opts = lastMutationOptions as MutationOptions;

		const vars = {
			to: "mayor/",
			subject: "Hi",
			body: "hello",
			priority: "normal" as const,
			type: "notification" as const,
			pinned: false,
			townPath: "/tmp/town",
		};
		await opts.mutationFn(vars);
		expect(sendMutateSpy).toHaveBeenCalledTimes(1);
		expect(sendMutateSpy.mock.calls[0]?.[0]).toEqual(vars);

		opts.onSuccess({ ok: true }, vars);
		expect(invalidateSpy).toHaveBeenCalledTimes(1);
		expect(invalidateSpy.mock.calls[0]?.[0]).toEqual({
			queryKey: MAIL_INBOX_QUERY_KEY,
		});
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});
});
