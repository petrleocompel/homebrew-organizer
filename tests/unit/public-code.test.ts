import { describe, expect, it } from "vitest";
import {
	generatePublicCode,
	isPublicCode,
	shortPublicCode,
} from "@/server/domain/public-code";

describe("permanent public bottle codes", () => {
	it("encodes exactly 128 bits as lowercase unpadded RFC 4648 Base32", () => {
		expect(generatePublicCode(Buffer.alloc(16))).toBe("a".repeat(26));
		expect(generatePublicCode(Buffer.alloc(16, 0xff))).toBe(
			`${"7".repeat(25)}4`,
		);
	});

	it("enforces the opaque 26-character format", () => {
		const code = generatePublicCode();
		expect(code).toHaveLength(26);
		expect(isPublicCode(code)).toBe(true);
		expect(isPublicCode(code.toUpperCase())).toBe(false);
		expect(isPublicCode("1".repeat(26))).toBe(false);
		expect(shortPublicCode(code)).toBe(code.slice(0, 8));
	});

	it("rejects input that is not exactly 128 bits", () => {
		expect(() => generatePublicCode(Buffer.alloc(15))).toThrow(TypeError);
		expect(() => generatePublicCode(Buffer.alloc(17))).toThrow(TypeError);
	});
});
