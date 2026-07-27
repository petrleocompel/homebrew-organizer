import { describe, expect, it } from "vitest";
import { GET } from "@/app/.well-known/apple-app-site-association/route";

describe("apple-app-site-association", () => {
	it("returns the exact Homebrew Scan application ID and bottle path", async () => {
		const response = GET();

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toContain("application/json");
		expect(response.headers.get("cache-control")).toBe("public, max-age=3600");
		expect(await response.json()).toEqual({
			applinks: {
				apps: [],
				details: [
					{
						appIDs: ["ABCDE12345.com.example.homebrew-scan"],
						components: [{ "/": "/b/*" }],
					},
				],
			},
		});
	});
});
