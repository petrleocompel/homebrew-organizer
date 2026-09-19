import Link from "next/link";
import { cn } from "@/lib/utils";

/** Identifier in mono, optional name beside it. Used for bottles, batches and recipe revisions. */
export function EntityRef({
	id,
	label,
	href,
	className,
}: {
	id: string | number;
	label?: string;
	href?: string;
	className?: string;
}) {
	const classes = cn(
		"inline-flex items-center gap-1.5 rounded-sm border bg-muted px-2.5 py-1 text-xs leading-none",
		href && "transition-colors hover:bg-accent hover:text-accent-foreground",
		className,
	);
	const content = (
		<>
			<span className="font-mono font-semibold">{id}</span>
			{label ? <span className="text-muted-foreground">{label}</span> : null}
		</>
	);
	return href ? (
		<Link href={href} className={classes}>
			{content}
		</Link>
	) : (
		<span className={classes}>{content}</span>
	);
}
