import {
	BATCH_STATUS_ORDER,
	batchStatusLabels,
	type DisplayBatchStatus,
	type Locale,
	normalizeBatchStatus,
} from "@/lib/status-labels";
import { cn } from "@/lib/utils";
import type { BatchStatus } from "@/server/db/schema";

const currentBar: Partial<Record<DisplayBatchStatus, string>> = {
	planning: "bg-state-planning",
	brewing: "bg-state-brewing",
	fermenting: "bg-state-fermenting",
	packaging: "bg-state-packaging",
	conditioning: "bg-state-conditioning",
	ready: "bg-state-ready",
	completed: "bg-state-completed",
};

const currentText: Partial<Record<DisplayBatchStatus, string>> = {
	planning: "text-state-planning",
	brewing: "text-state-brewing",
	fermenting: "text-state-fermenting",
	packaging: "text-state-packaging",
	conditioning: "text-state-conditioning",
	ready: "text-state-ready",
	completed: "text-state-completed",
};

/** Where the batch is, what already happened and what comes next. */
export function LifecycleBar({
	status,
	milestones = {},
	locale = "en",
	footer,
	className,
}: {
	status: BatchStatus;
	/** Already formatted dates keyed by phase. */
	milestones?: Partial<Record<DisplayBatchStatus, string>>;
	locale?: Locale;
	/** Next-step sentence and the advance action. */
	footer?: React.ReactNode;
	className?: string;
}) {
	const current = normalizeBatchStatus(status);
	const currentIndex = BATCH_STATUS_ORDER.indexOf(current);
	const labels = batchStatusLabels[locale];

	return (
		<div className={className}>
			<ol className="flex items-start gap-0.5">
				{BATCH_STATUS_ORDER.map((phase, index) => {
					const isCurrent = index === currentIndex;
					const isDone = currentIndex > -1 && index < currentIndex;
					return (
						<li
							key={phase}
							aria-current={isCurrent ? "step" : undefined}
							className={cn("min-w-0 flex-1", isCurrent && "flex-[1.2]")}
						>
							<div
								className={cn(
									"h-1.5",
									index === 0 && "rounded-l-full",
									index === BATCH_STATUS_ORDER.length - 1 && "rounded-r-full",
									isCurrent
										? currentBar[phase]
										: isDone
											? "bg-primary"
											: "bg-border",
								)}
							/>
							<p
								className={cn(
									"mt-2 truncate text-xs",
									isCurrent
										? cn("font-semibold", currentText[phase])
										: isDone
											? "font-medium text-foreground"
											: "font-medium text-muted-foreground",
								)}
							>
								{labels[phase]}
								{isCurrent ? <span aria-hidden="true"> ●</span> : null}
							</p>
							{milestones[phase] ? (
								<p
									className={cn(
										"truncate font-mono text-[0.6875rem]",
										isCurrent ? currentText[phase] : "text-muted-foreground",
									)}
								>
									{milestones[phase]}
								</p>
							) : null}
						</li>
					);
				})}
			</ol>
			{footer ? (
				<div className="mt-4 flex flex-wrap items-center gap-2.5 border-t pt-3.5">
					{footer}
				</div>
			) : null}
		</div>
	);
}
