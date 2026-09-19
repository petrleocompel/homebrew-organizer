import type { BottleState } from "@/server/contracts/dtos";
import type {
	BatchStatus,
	BatchVisibility,
	FillStatus,
} from "@/server/db/schema";

export type Locale = "en" | "cs";

/** `bottled` is legacy; the UI only ever knows about `packaging`. */
export type DisplayBatchStatus = Exclude<BatchStatus, "bottled">;

export function normalizeBatchStatus(status: BatchStatus): DisplayBatchStatus {
	return status === "bottled" ? "packaging" : status;
}

export const BATCH_STATUS_ORDER: readonly DisplayBatchStatus[] = [
	"planning",
	"brewing",
	"fermenting",
	"packaging",
	"conditioning",
	"ready",
	"completed",
];

export const batchStatusLabels: Record<
	Locale,
	Record<DisplayBatchStatus, string>
> = {
	en: {
		planning: "Planned",
		brewing: "Brewing",
		fermenting: "Fermenting",
		packaging: "Packaging",
		conditioning: "Conditioning",
		ready: "Ready to drink",
		completed: "Completed",
		archived: "Archived",
	},
	cs: {
		planning: "Naplánováno",
		brewing: "Vaří se",
		fermenting: "Kvasí",
		packaging: "Stáčí se",
		conditioning: "Zraje",
		ready: "K pití",
		completed: "Dokončeno",
		archived: "Archiv",
	},
};

export const fillStatusLabels: Record<Locale, Record<FillStatus, string>> = {
	en: {
		filled: "Filled",
		conditioning: "Conditioning",
		ready: "Ready",
		emptied: "Emptied",
	},
	cs: {
		filled: "Naplněna",
		conditioning: "Zraje",
		ready: "Připravena",
		emptied: "Vypita",
	},
};

export const bottleStateLabels: Record<Locale, Record<BottleState, string>> = {
	en: { available: "Available", in_use: "In use", retired: "Retired" },
	cs: { available: "Volná", in_use: "Plná", retired: "Vyřazena" },
};

export const visibilityLabels: Record<
	Locale,
	Record<BatchVisibility, string>
> = {
	en: { listed: "In catalog", unlisted: "QR only", private: "Private" },
	cs: { listed: "V katalogu", unlisted: "Jen přes QR", private: "Soukromá" },
};
