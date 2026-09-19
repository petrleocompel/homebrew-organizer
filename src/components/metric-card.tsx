import { cn } from "@/lib/utils";

const tones = {
	default: { card: "bg-card", label: "text-muted-foreground", value: "" },
	conditioning: {
		card: "bg-card",
		label: "text-muted-foreground",
		value: "text-state-conditioning",
	},
	ready: {
		card: "bg-card",
		label: "text-muted-foreground",
		value: "text-state-ready",
	},
	muted: {
		card: "bg-card",
		label: "text-muted-foreground",
		value: "text-muted-foreground",
	},
	attention: {
		card: "bg-state-attention-bg",
		label: "text-state-attention",
		value: "text-state-attention",
	},
} as const;

export function MetricCard({
	label,
	value,
	tone = "default",
	className,
}: {
	label: string;
	value: React.ReactNode;
	tone?: keyof typeof tones;
	className?: string;
}) {
	const style = tones[tone];
	return (
		<div className={cn("rounded-lg border p-3.5", style.card, className)}>
			<p
				className={cn(
					"font-medium font-mono text-[0.625rem] uppercase leading-none tracking-widest",
					style.label,
				)}
			>
				{label}
			</p>
			<p
				className={cn(
					"mt-2 font-mono font-semibold text-2xl leading-none",
					style.value,
				)}
			>
				{value}
			</p>
		</div>
	);
}
