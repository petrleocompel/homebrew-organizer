export type BatchStatus =
	| "planning"
	| "brewing"
	| "fermenting"
	| "bottled"
	| "packaging"
	| "conditioning"
	| "ready"
	| "archived"
	| "completed";
export type BottleStatus = "empty" | "filled" | "conditioning" | "ready";

export interface Batch {
	id: string;
	batchNumber: number;
	name: string;
	description: string;
	note: string;
	status: BatchStatus;
	publicName?: string | null;
	publicDescription?: string | null;
	privateNotes?: string | null;
	visibility?: "private" | "unlisted" | "listed";
	styleName?: string | null;
	abv?: string | null;
	created: string | Date;
	updated: string | Date;
}

export interface Bottle {
	id: string;
	status: BottleStatus;
	bottleNumber: number;
	label?: string | null;
	publicCode?: string | null;
	currentBatchId?: string;
	created: string | Date;
	updated: string | Date;
}

export interface BatchBottle {
	id: string;
	batchId: string;
	bottleId: string;
	created: string;
	updated: string;
}
