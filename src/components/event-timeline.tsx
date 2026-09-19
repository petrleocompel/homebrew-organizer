import { cn } from "@/lib/utils";

export interface TimelineEvent {
	id: string;
	/** A full sentence in human language, never a raw event type. */
	sentence: React.ReactNode;
	/** Already formatted: time, source, visibility. */
	meta: string[];
}

export function EventTimeline({
	events,
	className,
}: {
	events: TimelineEvent[];
	className?: string;
}) {
	return (
		<ol className={cn("flex flex-col", className)}>
			{events.map((event, index) => (
				<li key={event.id} className="grid grid-cols-[18px_1fr] gap-3">
					<div className="flex flex-col items-center" aria-hidden="true">
						<span
							className={cn(
								"mt-1.5 size-2.5 shrink-0 rounded-full",
								index === 0 ? "bg-primary" : "bg-border",
							)}
						/>
						{index < events.length - 1 ? (
							<span className="w-px flex-1 bg-border" />
						) : null}
					</div>
					<div className={index < events.length - 1 ? "pb-4" : undefined}>
						<p className="text-sm leading-relaxed">{event.sentence}</p>
						<p className="mt-0.5 font-mono text-muted-foreground text-xs">
							{event.meta.join(" · ")}
						</p>
					</div>
				</li>
			))}
		</ol>
	);
}
