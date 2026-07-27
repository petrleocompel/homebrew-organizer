import {
	type APIRequestContext,
	type APIResponse,
	expect,
	test,
} from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import postgres from "postgres";
import { resetSeedData, seedData } from "./fixtures";

interface BottleFixture {
	id: string;
	bottleNumber: number;
	publicCode: string;
}

test.beforeEach(() => {
	resetSeedData();
});

async function signIn(
	request: APIRequestContext,
	credentials: { email: string; password: string },
) {
	const response = await request.post("/api/auth/sign-in/email", {
		headers: {
			origin: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
		},
		data: credentials,
	});
	expect(response.ok(), await response.text()).toBe(true);
	const token = response.headers()["set-auth-token"];
	expect(token).toBeTruthy();
	return {
		authorization: `Bearer ${token}`,
		"x-homebrew-client": "ios",
	};
}

async function errorCode(response: APIResponse) {
	const body = (await response.json()) as { error: { code: string } };
	return body.error.code;
}

async function bottleFixture(label: string): Promise<BottleFixture> {
	const databaseUrl =
		process.env.PLAYWRIGHT_DATABASE_URL ?? process.env.DATABASE_URL;
	if (!databaseUrl) throw new Error("Playwright database URL is missing.");
	const sql = postgres(databaseUrl, { max: 1 });
	try {
		const [row] = await sql<BottleFixture[]>`
			SELECT
				b.id,
				b.bottle_number AS "bottleNumber",
				c.code AS "publicCode"
			FROM ho_bottles b
			INNER JOIN ho_bottle_public_codes c
				ON c.bottle_id = b.id
				AND c.revoked_at IS NULL
			WHERE b.label = ${label}
			LIMIT 1
		`;
		if (!row) throw new Error(`Bottle fixture "${label}" was not found.`);
		return row;
	} finally {
		await sql.end();
	}
}

async function amberBatchId(
	request: APIRequestContext,
	headers: Record<string, string>,
) {
	const response = await request.get("/api/v1/batches?assignable=true", {
		headers,
	});
	expect(response.ok(), await response.text()).toBe(true);
	const body = (await response.json()) as {
		items: Array<{ id: string; batchNumber: number }>;
	};
	const batch = body.items.find(
		(item) => item.batchNumber === seedData.batches.amberAle.batchNumber,
	);
	if (!batch) throw new Error("Assignable amber batch fixture was not found.");
	return batch.id;
}

test("keeps public bottle responses curated and legacy links permanent", async ({
	request,
}) => {
	const bottle = await bottleFixture(seedData.bottles.assigned.label);
	const publicResponse = await request.get(
		`/api/v1/public/bottles/${bottle.publicCode}`,
	);
	expect(publicResponse.status()).toBe(200);
	expect(publicResponse.headers()["cache-control"]).toContain("public");
	const publicBottle = (await publicResponse.json()) as Record<string, unknown>;
	expect(publicBottle).toMatchObject({
		bottleNumber: bottle.bottleNumber,
		displayName: seedData.bottles.assigned.label,
		state: "in_use",
	});
	const serialized = JSON.stringify(publicBottle);
	expect(serialized).not.toContain(bottle.id);
	expect(serialized).not.toContain("privateNotes");
	expect(serialized).not.toContain("batchId");
	expect(serialized).not.toContain(seedData.batches.amberAle.note);

	const badCode = await request.get("/api/v1/public/bottles/not-a-code");
	expect(badCode.status()).toBe(404);
	expect(await errorCode(badCode)).toBe("NOT_FOUND");
	expect(badCode.headers()["x-request-id"]).toMatch(
		/^[0-9a-f]{8}-[0-9a-f-]{27}$/,
	);

	const privateWithoutAuth = await request.get(
		`/api/v1/bottles/by-code/${bottle.publicCode}`,
	);
	expect(privateWithoutAuth.status()).toBe(401);
	expect(await errorCode(privateWithoutAuth)).toBe("AUTHENTICATION_REQUIRED");

	const ownerHeaders = await signIn(request, seedData.admin);
	const me = await request.get("/api/v1/me", { headers: ownerHeaders });
	expect(me.status()).toBe(200);
	expect(await me.json()).toMatchObject({
		role: "owner",
		capabilities: { apiVersion: "v1", offlineMutations: false },
	});
	const privateBottle = await request.get(
		`/api/v1/bottles/by-code/${bottle.publicCode}`,
		{ headers: ownerHeaders },
	);
	expect(privateBottle.status()).toBe(200);
	expect(await privateBottle.json()).toMatchObject({
		id: bottle.id,
		publicCode: bottle.publicCode,
	});

	const legacy = await request.get(`/bottle/${bottle.bottleNumber}`, {
		maxRedirects: 0,
	});
	expect(legacy.status()).toBe(308);
	expect(legacy.headers().location).toBe(`/b/${bottle.publicCode}`);
});

test("enforces the viewer role at the REST mutation boundary", async ({
	request,
}) => {
	const viewerHeaders = await signIn(request, seedData.viewer);
	const me = await request.get("/api/v1/me", { headers: viewerHeaders });
	expect(me.status()).toBe(200);
	expect(await me.json()).toMatchObject({
		role: "viewer",
		permissions: ["private:read"],
	});

	const bottle = await bottleFixture(seedData.bottles.unassignedTwo.label);
	const ownerHeaders = await signIn(request, seedData.admin);
	const batchId = await amberBatchId(request, ownerHeaders);
	const response = await request.post(`/api/v1/bottles/${bottle.id}/fills`, {
		headers: {
			...viewerHeaders,
			"idempotency-key": crypto.randomUUID(),
		},
		data: { batchId, status: "conditioning" },
	});
	expect(response.status()).toBe(403);
	expect(await errorCode(response)).toBe("FORBIDDEN");
});

test("replays idempotent fill requests and rejects conflicts", async ({
	request,
}) => {
	const headers = await signIn(request, seedData.admin);
	const batchId = await amberBatchId(request, headers);
	const bottle = await bottleFixture(seedData.bottles.unassignedOne.label);
	const url = `/api/v1/bottles/${bottle.id}/fills`;
	const body = { batchId, status: "filled" };

	const missingKey = await request.post(url, { headers, data: body });
	expect(missingKey.status()).toBe(400);
	expect(await errorCode(missingKey)).toBe("IDEMPOTENCY_KEY_REQUIRED");

	const key = crypto.randomUUID();
	const first = await request.post(url, {
		headers: { ...headers, "idempotency-key": key },
		data: body,
	});
	expect(first.status()).toBe(201);
	expect(first.headers()["idempotency-replayed"]).toBe("false");
	const firstBody = (await first.json()) as {
		fill: { id: string; status: string };
	};
	expect(firstBody.fill.status).toBe("filled");

	const replay = await request.post(url, {
		headers: { ...headers, "idempotency-key": key },
		data: body,
	});
	expect(replay.status()).toBe(201);
	expect(replay.headers()["idempotency-replayed"]).toBe("true");
	expect(await replay.json()).toEqual(firstBody);

	const reused = await request.post(url, {
		headers: { ...headers, "idempotency-key": key },
		data: { batchId, status: "ready" },
	});
	expect(reused.status()).toBe(409);
	expect(await errorCode(reused)).toBe("IDEMPOTENCY_KEY_REUSED");

	const duplicateFill = await request.post(url, {
		headers: { ...headers, "idempotency-key": crypto.randomUUID() },
		data: body,
	});
	expect(duplicateFill.status()).toBe(409);
	expect(await errorCode(duplicateFill)).toBe("BOTTLE_ALREADY_FILLED");

	const transitionUrl = `/api/v1/fills/${firstBody.fill.id}/transition`;
	const transitionKey = crypto.randomUUID();
	const transition = await request.post(transitionUrl, {
		headers: { ...headers, "idempotency-key": transitionKey },
		data: { status: "conditioning" },
	});
	expect(transition.status()).toBe(200);
	expect(transition.headers()["idempotency-replayed"]).toBe("false");
	const transitionBody = await transition.json();

	const transitionReplay = await request.post(transitionUrl, {
		headers: { ...headers, "idempotency-key": transitionKey },
		data: { status: "conditioning" },
	});
	expect(transitionReplay.status()).toBe(200);
	expect(transitionReplay.headers()["idempotency-replayed"]).toBe("true");
	expect(await transitionReplay.json()).toEqual(transitionBody);

	const ready = await request.post(transitionUrl, {
		headers: { ...headers, "idempotency-key": crypto.randomUUID() },
		data: { status: "ready" },
	});
	expect(ready.status()).toBe(200);
	const backwards = await request.post(transitionUrl, {
		headers: { ...headers, "idempotency-key": crypto.randomUUID() },
		data: { status: "conditioning" },
	});
	expect(backwards.status()).toBe(409);
	expect(await errorCode(backwards)).toBe("INVALID_FILL_TRANSITION");

	const concurrentBottle = await bottleFixture(
		seedData.bottles.unassignedTwo.label,
	);
	const concurrentKey = crypto.randomUUID();
	const concurrent = await Promise.all([
		request.post(`/api/v1/bottles/${concurrentBottle.id}/fills`, {
			headers: { ...headers, "idempotency-key": concurrentKey },
			data: { batchId, status: "conditioning" },
		}),
		request.post(`/api/v1/bottles/${concurrentBottle.id}/fills`, {
			headers: { ...headers, "idempotency-key": concurrentKey },
			data: { batchId, status: "conditioning" },
		}),
	]);
	expect(concurrent.map((response) => response.status()).sort()).toEqual([
		201, 201,
	]);
	expect(
		concurrent
			.map((response) => response.headers()["idempotency-replayed"])
			.sort(),
	).toEqual(["false", "true"]);
});

test("previews, commits, replays, and exports BeerJSON", async ({
	request,
}) => {
	const headers = await signIn(request, seedData.admin);
	const recipe = {
		beerjson: {
			version: 1,
			recipes: [
				{
					name: "API Pale Ale",
					type: "all grain",
					author: "Playwright",
					batch_size: { unit: "l", value: 20 },
					efficiency: { brewhouse: { unit: "%", value: 72 } },
					ingredients: { fermentable_additions: [] },
				},
			],
		},
	};
	const importBody = {
		fileName: "api-pale-ale.beer.json",
		content: JSON.stringify(recipe),
		commit: false,
		selectedIndexes: [],
	};
	const preview = await request.post("/api/v1/recipes/import", {
		headers,
		data: importBody,
	});
	expect(preview.status()).toBe(200);
	expect(await preview.json()).toMatchObject({
		format: "beerjson",
		items: [{ name: "API Pale Ale", valid: true, errors: [] }],
	});

	const key = crypto.randomUUID();
	const committed = await request.post("/api/v1/recipes/import", {
		headers: { ...headers, "idempotency-key": key },
		data: { ...importBody, commit: true, selectedIndexes: [0] },
	});
	expect(committed.status()).toBe(201);
	const committedBody = (await committed.json()) as {
		items: Array<{ id: string; name: string }>;
	};
	expect(committedBody.items).toHaveLength(1);
	expect(committedBody.items[0]?.name).toBe("API Pale Ale");

	const replay = await request.post("/api/v1/recipes/import", {
		headers: { ...headers, "idempotency-key": key },
		data: { ...importBody, commit: true, selectedIndexes: [0] },
	});
	expect(replay.status()).toBe(201);
	expect(replay.headers()["idempotency-replayed"]).toBe("true");
	expect(await replay.json()).toEqual(committedBody);

	const documentId = committedBody.items[0]?.id;
	expect(documentId).toBeTruthy();
	const exported = await request.get(
		`/api/v1/recipes/${documentId}/export?format=beerjson`,
		{ headers },
	);
	expect(exported.status()).toBe(200);
	expect(exported.headers()["content-type"]).toContain("application/json");
	expect(await exported.json()).toEqual(recipe);

	const maliciousXml = await request.post("/api/v1/recipes/import", {
		headers,
		data: {
			fileName: "malicious.xml",
			content: '<!DOCTYPE x [<!ENTITY x "boom">]><RECIPES/>',
			commit: false,
			selectedIndexes: [],
		},
	});
	expect(maliciousXml.status()).toBe(422);
	expect(await errorCode(maliciousXml)).toBe("RECIPE_INVALID");
});

test("renders immutable 80 mm identity-label PDF and ZIP print runs", async ({
	request,
}) => {
	const headers = await signIn(request, seedData.admin);
	const bottle = await bottleFixture(seedData.bottles.unassignedOne.label);
	const background = await PDFDocument.create();
	background.addPage([200, 200]);
	const backgroundBytes = Buffer.from(await background.save());
	const elements = [
		{
			id: "qr",
			type: "qr",
			xMm: 20,
			yMm: 20,
			widthMm: 40,
			heightMm: 40,
		},
		{
			id: "number",
			type: "text",
			token: "bottle.number",
			xMm: 10,
			yMm: 66,
			widthMm: 60,
			heightMm: 8,
			fontFamily: "Noto Sans",
			fontSizePt: 12,
			fontWeight: 700,
			color: "#000000",
			align: "center",
			wrap: false,
			visible: true,
		},
	];
	const templateResponse = await request.post("/api/v1/label-templates", {
		headers,
		multipart: {
			name: "Playwright identity",
			type: "identity",
			elements: JSON.stringify(elements),
			file: {
				name: "background.pdf",
				mimeType: "application/pdf",
				buffer: backgroundBytes,
			},
		},
	});
	expect(templateResponse.status(), await templateResponse.text()).toBe(201);
	const template = (await templateResponse.json()) as { id: string };
	const printBody = {
		templateId: template.id,
		bottleIds: [bottle.id],
		confirmDuplicateIdentity: false,
	};
	const key = crypto.randomUUID();
	const printResponse = await request.post("/api/v1/print-runs", {
		headers: { ...headers, "idempotency-key": key },
		data: printBody,
	});
	expect(printResponse.status(), await printResponse.text()).toBe(201);
	const print = (await printResponse.json()) as {
		runs: Array<{ id: string; itemCount: number }>;
	};
	expect(print.runs).toHaveLength(1);
	expect(print.runs[0]?.itemCount).toBe(1);

	const replay = await request.post("/api/v1/print-runs", {
		headers: { ...headers, "idempotency-key": key },
		data: printBody,
	});
	expect(replay.status()).toBe(201);
	expect(replay.headers()["idempotency-replayed"]).toBe("true");
	expect(await replay.json()).toEqual(print);

	const runId = print.runs[0]?.id;
	expect(runId).toBeTruthy();
	const pdfResponse = await request.get(
		`/api/v1/print-runs/${runId}/download?format=pdf`,
		{ headers },
	);
	expect(pdfResponse.status(), await pdfResponse.text()).toBe(200);
	expect(pdfResponse.headers()["content-type"]).toContain("application/pdf");
	const pdf = await PDFDocument.load(await pdfResponse.body());
	expect(pdf.getPageCount()).toBe(1);
	const size = pdf.getPage(0).getSize();
	expect(size.width).toBeCloseTo((80 * 72) / 25.4, 2);
	expect(size.height).toBeCloseTo((80 * 72) / 25.4, 2);

	const zipResponse = await request.get(
		`/api/v1/print-runs/${runId}/download?format=zip`,
		{ headers },
	);
	expect(zipResponse.status()).toBe(200);
	expect(zipResponse.headers()["content-type"]).toContain("application/zip");
	expect((await zipResponse.body()).subarray(0, 2).toString()).toBe("PK");

	const duplicate = await request.post("/api/v1/print-runs", {
		headers: {
			...headers,
			"idempotency-key": crypto.randomUUID(),
		},
		data: printBody,
	});
	expect(duplicate.status()).toBe(409);
	expect(await errorCode(duplicate)).toBe("PRINT_CONFIRMATION_REQUIRED");

	const confirmed = await request.post("/api/v1/print-runs", {
		headers: {
			...headers,
			"idempotency-key": crypto.randomUUID(),
		},
		data: { ...printBody, confirmDuplicateIdentity: true },
	});
	expect(confirmed.status()).toBe(201);
});
