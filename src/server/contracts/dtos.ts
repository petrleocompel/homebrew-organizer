import type {
	BatchStatus,
	BatchVisibility,
	BreweryRole,
	FillStatus,
} from "@/server/db/schema";

export type BottleState = "available" | "in_use" | "retired";

export interface PublicFillSummary {
	beerName: string | null;
	batchNumber: number | null;
	style: string | null;
	abv: number | null;
	status: FillStatus;
	filledAt: string;
	expectedReadyAt: string | null;
	readyAt: string | null;
	emptiedAt: string | null;
	historyApproximate?: boolean;
}

export interface PublicBottle {
	bottleNumber: number;
	displayName: string | null;
	state: BottleState;
	currentFill: PublicFillSummary | null;
	timeline: PublicFillSummary[];
	serverTimestamp: string;
}

export interface BottleEventDto {
	id: string;
	type: string;
	fillId: string | null;
	batchId: string | null;
	actorUserId: string | null;
	source: "web" | "ios" | "migration";
	visibility: "public" | "private";
	timestamp: string;
	metadata: Record<string, unknown>;
}

export interface AuthenticatedFill {
	id: string;
	batchId: string;
	batchNumber: number;
	beerName: string;
	status: FillStatus;
	filledAt: string;
	expectedReadyAt: string | null;
	readyAt: string | null;
	emptiedAt: string | null;
	privateNotes: string | null;
	historyApproximate: boolean;
}

export interface AuthenticatedBottle {
	id: string;
	bottleNumber: number;
	displayName: string | null;
	volumeMl: number;
	color: string | null;
	closureType: string | null;
	location: string | null;
	privateNotes: string | null;
	retiredAt: string | null;
	state: BottleState;
	publicCode: string;
	currentFill: AuthenticatedFill | null;
	fills: AuthenticatedFill[];
	events: BottleEventDto[];
	serverTimestamp: string;
}

export interface BatchSummary {
	id: string;
	batchNumber: number;
	name: string;
	publicName: string;
	status: BatchStatus;
	visibility: BatchVisibility;
	style: string | null;
	abv: number | null;
	assignable: boolean;
}

export interface BatchMeasurementDto {
	id: string;
	batchId: string;
	kind: "gravity" | "temperature" | "ph" | "volume";
	originalValue: number;
	originalUnit: string;
	normalizedValue: number;
	normalizedUnit: string;
	measuredAt: string;
	note: string | null;
}

export interface FillMutationResult {
	bottleId: string;
	bottleNumber: number;
	bottleState: BottleState;
	fill: AuthenticatedFill;
	serverTimestamp: string;
}

export interface ServerCapabilities {
	apiVersion: "v1";
	maxRecipeUploadBytes: number;
	maxPdfUploadBytes: number;
	maxRecipesPerImport: number;
	maxStickersPerRun: number;
	allowedQrHosts: string[];
	offlineMutations: false;
}

export interface MeDto {
	user: {
		id: string;
		name: string;
		email: string;
	};
	role: BreweryRole;
	permissions: string[];
	capabilities: ServerCapabilities;
}

export interface ApiErrorBody {
	error: {
		code: string;
		message: string;
		details: Record<string, unknown>;
		requestId: string;
	};
}
