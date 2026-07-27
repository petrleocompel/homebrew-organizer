import { randomBytes } from "node:crypto";

const BASE32_ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";
export const PUBLIC_CODE_PATTERN = /^[a-z2-7]{26}$/;

/**
 * Encodes exactly 128 random bits as unpadded, lowercase RFC 4648 Base32.
 * 128 bits require 26 characters; the final character contains two data bits.
 */
export function generatePublicCode(bytes = randomBytes(16)): string {
	if (bytes.length !== 16) {
		throw new TypeError("A public code requires exactly 16 random bytes.");
	}

	let output = "";
	let buffer = 0;
	let bits = 0;

	for (const byte of bytes) {
		buffer = (buffer << 8) | byte;
		bits += 8;

		while (bits >= 5) {
			output += BASE32_ALPHABET[(buffer >>> (bits - 5)) & 31];
			bits -= 5;
			buffer &= (1 << bits) - 1;
		}
	}

	if (bits > 0) {
		output += BASE32_ALPHABET[(buffer << (5 - bits)) & 31];
	}

	if (!PUBLIC_CODE_PATTERN.test(output)) {
		throw new Error("Generated an invalid public bottle code.");
	}

	return output;
}

export function isPublicCode(value: string): boolean {
	return PUBLIC_CODE_PATTERN.test(value);
}

export function shortPublicCode(value: string): string {
	return value.slice(0, 8);
}
