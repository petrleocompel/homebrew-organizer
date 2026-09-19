import {
	Archive,
	Ban,
	CalendarPlus,
	Check,
	CircleCheck,
	CircleDashed,
	CircleSlash,
	Droplet,
	Flame,
	Hourglass,
	type LucideIcon,
	PackageOpen,
	Waves,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
	batchStatusLabels,
	bottleStateLabels,
	type DisplayBatchStatus,
	fillStatusLabels,
	type Locale,
	normalizeBatchStatus,
	visibilityLabels,
} from "@/lib/status-labels";
import { cn } from "@/lib/utils";
import type { BottleState } from "@/server/contracts/dtos";
import type {
	BatchStatus,
	BatchVisibility,
	FillStatus,
} from "@/server/db/schema";

interface StatusStyle {
	icon: LucideIcon;
	className: string;
}

const batchStyles: Record<DisplayBatchStatus, StatusStyle> = {
	planning: {
		icon: CalendarPlus,
		className: "bg-state-planning-bg text-state-planning",
	},
	brewing: { icon: Flame, className: "bg-state-brewing-bg text-state-brewing" },
	fermenting: {
		icon: Waves,
		className: "bg-state-fermenting-bg text-state-fermenting",
	},
	packaging: {
		icon: PackageOpen,
		className: "bg-state-packaging-bg text-state-packaging",
	},
	conditioning: {
		icon: Hourglass,
		className: "bg-state-conditioning-bg text-state-conditioning",
	},
	ready: { icon: CircleCheck, className: "bg-state-ready-bg text-state-ready" },
	completed: {
		icon: Check,
		className: "bg-state-completed-bg text-state-completed",
	},
	archived: {
		icon: Archive,
		className:
			"border-state-archived/40 border-dashed bg-state-archived-bg text-state-archived",
	},
};

const fillStyles: Record<FillStatus, StatusStyle> = {
	filled: { icon: Droplet, className: "bg-fill-filled-bg text-fill-filled" },
	conditioning: {
		icon: Hourglass,
		className: "bg-fill-conditioning-bg text-fill-conditioning",
	},
	ready: { icon: CircleCheck, className: "bg-fill-ready-bg text-fill-ready" },
	emptied: {
		icon: CircleSlash,
		className: "bg-fill-emptied-bg text-fill-emptied",
	},
};

const bottleStyles: Record<BottleState, StatusStyle> = {
	available: {
		icon: CircleDashed,
		className: "border-border bg-card text-muted-foreground",
	},
	in_use: { icon: Droplet, className: "bg-fill-filled-bg text-fill-filled" },
	retired: {
		icon: Ban,
		className: "bg-state-archived-bg text-state-archived line-through",
	},
};

type StatusBadgeProps = (
	| { kind: "batch"; value: BatchStatus }
	| { kind: "fill"; value: FillStatus }
	| { kind: "bottle"; value: BottleState }
) & { locale?: Locale; className?: string };

function resolve(props: StatusBadgeProps, locale: Locale) {
	switch (props.kind) {
		case "batch": {
			const status = normalizeBatchStatus(props.value);
			return {
				style: batchStyles[status],
				label: batchStatusLabels[locale][status],
			};
		}
		case "fill":
			return {
				style: fillStyles[props.value],
				label: fillStatusLabels[locale][props.value],
			};
		case "bottle":
			return {
				style: bottleStyles[props.value],
				label: bottleStateLabels[locale][props.value],
			};
	}
}

/** Shape + icon + human label, so a state never relies on color alone. */
export function StatusBadge(props: StatusBadgeProps) {
	const { style, label } = resolve(props, props.locale ?? "en");
	const Icon = style.icon;
	return (
		<Badge
			data-status={props.value}
			className={cn(
				"gap-1.5 rounded-full border-transparent px-2.5 py-1 font-semibold",
				style.className,
				props.className,
			)}
		>
			<Icon aria-hidden="true" />
			{label}
		</Badge>
	);
}

/** Admin lists report a bottle without an active fill as `empty`. */
export function BottleStatusBadge({
	status,
	className,
}: {
	status: FillStatus | "empty";
	className?: string;
}) {
	return status === "empty" ? (
		<StatusBadge kind="bottle" value="available" className={className} />
	) : (
		<StatusBadge kind="fill" value={status} className={className} />
	);
}

const visibilityStyles: Record<BatchVisibility, string> = {
	listed: "bg-state-ready-bg text-state-ready",
	unlisted: "bg-muted text-muted-foreground",
	private: "bg-foreground/10 text-foreground",
};

export function VisibilityBadge({
	value,
	locale = "en",
	className,
}: {
	value: BatchVisibility;
	locale?: Locale;
	className?: string;
}) {
	return (
		<Badge
			data-visibility={value}
			className={cn(
				"border-transparent px-2.5 py-1 font-semibold",
				visibilityStyles[value],
				className,
			)}
		>
			{visibilityLabels[locale][value]}
		</Badge>
	);
}
