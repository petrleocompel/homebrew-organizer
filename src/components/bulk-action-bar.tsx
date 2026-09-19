"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Appears only while rows are selected; actions are passed in by the table that owns the selection. */
export function BulkActionBar({
	count,
	noun = "selected",
	onClear,
	children,
	className,
}: {
	count: number;
	noun?: string;
	onClear: () => void;
	children: React.ReactNode;
	className?: string;
}) {
	if (count === 0) return null;
	return (
		<div
			role="toolbar"
			aria-label="Bulk actions"
			className={cn(
				"flex flex-wrap items-center gap-2 rounded-lg bg-foreground px-3 py-2 text-background",
				className,
			)}
		>
			<span aria-live="polite" className="font-semibold text-sm">
				{count} {noun}
			</span>
			<div className="ml-auto flex flex-wrap items-center gap-1.5 [&_button]:bg-background/15 [&_button]:text-background [&_button]:hover:bg-background/25">
				{children}
			</div>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="size-8 text-background hover:bg-background/15 hover:text-background"
				onClick={onClear}
			>
				<X className="size-4" aria-hidden="true" />
				<span className="sr-only">Clear selection</span>
			</Button>
		</div>
	);
}
