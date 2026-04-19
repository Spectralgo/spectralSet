import { describe, expect, it } from "bun:test";
import { getRigPrefix } from "./rig-prefix";

describe("getRigPrefix", () => {
	it("splits camelCase rigs on the inner uppercase letter", () => {
		expect(getRigPrefix("spectralSet")).toBe("ss");
		expect(getRigPrefix("spectralChat")).toBe("sc");
		expect(getRigPrefix("spectralNotify")).toBe("sn");
		expect(getRigPrefix("spectralPaper")).toBe("sp");
		expect(getRigPrefix("spectralTranscript")).toBe("st");
	});

	it("falls back to the first two letters for flat rigs", () => {
		expect(getRigPrefix("gmux")).toBe("gm");
	});

	it("lowercases the result even when the rig starts uppercase", () => {
		expect(getRigPrefix("SpectralSet")).toBe("ss");
	});

	it("handles single-letter rigs without throwing", () => {
		expect(getRigPrefix("x")).toBe("x");
	});
});
