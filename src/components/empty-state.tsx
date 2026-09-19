import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** One empty-state pattern for the whole app: icon, title, one sentence, next action. */
export function EmptyState({
	icon: Icon,
	title,
	description,
	action,
	className,
}: {
	icon?: LucideIcon;
	title: string;
	description?: string;
	action?: React.ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"flex flex-col items-center rounded-lg border border-dashed px-5 py-8 text-center",
				className,
			)}
		>
			{Icon ? (
				<span className="flex size-9 items-center justify-center rounded-md border-2 border-dashed text-muted-foreground">
					<Icon className="size-4" aria-hidden="true" />
				</span>
			) : null}
			<p className="mt-3 font-semibold text-sm">{title}</p>
			{description ? (
				<p className="mt-1.5 max-w-xs text-pretty text-muted-foreground text-sm">
					{description}
				</p>
			) : null}
			{action ? <div className="mt-4">{action}</div> : null}
		</div>
	);
}
