import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** The only heading on a page. The shell never repeats it. */
export function PageHeader({
	eyebrow,
	title,
	description,
	badges,
	actions,
	readOnly = false,
	className,
}: {
	eyebrow?: React.ReactNode;
	title: React.ReactNode;
	description?: React.ReactNode;
	badges?: React.ReactNode;
	actions?: React.ReactNode;
	readOnly?: boolean;
	className?: string;
}) {
	return (
		<div className={cn("flex flex-wrap items-start gap-4", className)}>
			<div className="min-w-0">
				{eyebrow ? (
					<p className="text-muted-foreground text-xs">{eyebrow}</p>
				) : null}
				<div className="mt-1 flex flex-wrap items-center gap-2.5">
					<h1 className="font-semibold text-2xl leading-tight tracking-tight">
						{title}
					</h1>
					{badges}
					{readOnly ? (
						<Badge className="border-transparent bg-foreground/10 text-foreground">
							Read only
						</Badge>
					) : null}
				</div>
				{description ? (
					<p className="mt-1.5 text-muted-foreground text-sm">{description}</p>
				) : null}
			</div>
			{actions && !readOnly ? (
				<div className="ml-auto flex flex-wrap gap-2">{actions}</div>
			) : null}
		</div>
	);
}
