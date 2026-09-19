import { formatDate, type PublicBottleCopy } from "@/lib/public-i18n";
import type { Locale } from "@/lib/status-labels";
import { cn } from "@/lib/utils";
import type { PublicFillSummary } from "@/server/contracts/dtos";
import type { FillStatus as FillStatusValue } from "@/server/db/schema";
import { MonoLabel } from "./public-shell";

const tone: Record<FillStatusValue, { text: string; ring: string }> = {
	filled: {
		text: "text-fill-filled",
		ring: "border-fill-filled border-r-fill-filled-bg border-b-fill-filled-bg border-l-fill-filled-bg",
	},
	conditioning: {
		text: "text-fill-conditioning",
		ring: "border-fill-conditioning border-r-fill-conditioning-bg border-b-fill-conditioning-bg",
	},
	ready: { text: "text-fill-ready", ring: "border-fill-ready" },
	emptied: {
		text: "text-fill-emptied",
		ring: "border-fill-emptied border-dashed",
	},
};

/** Ring + color + sentence: "is it good to drink yet" is never told by color alone. */
export function FillStatus({
	fill,
	volumeMl,
	locale,
	copy,
	className,
}: {
	fill: PublicFillSummary;
	volumeMl: number;
	locale: Locale;
	copy: PublicBottleCopy;
	className?: string;
}) {
	const readyDate = fill.readyAt ?? fill.expectedReadyAt;
	const sentence = copy.sentence[fill.status](
		readyDate ? formatDate(readyDate, locale, "long") : null,
	);

	return (
		<section
			data-fill-status={fill.status}
			className={cn(
				"rounded-lg border bg-card p-4 shadow-xs lg:p-5",
				className,
			)}
		>
			<div className="flex items-center gap-2.5">
				<span
					aria-hidden="true"
					className={cn(
						"size-6.5 shrink-0 rounded-full border-[3px]",
						tone[fill.status].ring,
					)}
				/>
				<h2
					className={cn(
						"font-semibold text-xl leading-tight tracking-tight",
						tone[fill.status].text,
					)}
				>
					{copy.status[fill.status]}
				</h2>
			</div>
			<p className="mt-2.5 text-pretty text-[0.9375rem] leading-normal">
				{sentence}
			</p>
			<dl className="mt-3.5 grid grid-cols-3 gap-3 border-t pt-3.5">
				<div>
					<dt>
						<MonoLabel>{copy.filled}</MonoLabel>
					</dt>
					<dd className="mt-1.5 font-medium text-sm leading-none">
						{formatDate(fill.filledAt, locale)}
					</dd>
				</div>
				<div>
					<dt>
						<MonoLabel>{copy.ready}</MonoLabel>
					</dt>
					<dd className="mt-1.5 font-medium text-sm leading-none">
						{formatDate(readyDate, locale)}
					</dd>
				</div>
				<div>
					<dt>
						<MonoLabel>{copy.volume}</MonoLabel>
					</dt>
					<dd className="mt-1.5 font-medium text-sm leading-none">
						{volumeMl} ml
					</dd>
				</div>
			</dl>
		</section>
	);
}

const dot: Record<FillStatusValue, string> = {
	filled: "bg-fill-filled",
	conditioning: "bg-fill-conditioning",
	ready: "bg-fill-ready",
	emptied: "bg-border",
};

export function FillHistory({
	fills,
	locale,
	copy,
}: {
	fills: PublicFillSummary[];
	locale: Locale;
	copy: PublicBottleCopy;
}) {
	if (fills.length === 0) {
		return <p className="text-muted-foreground text-sm">{copy.noHistory}</p>;
	}
	return (
		<ol className="flex flex-col">
			{fills.map((fill, index) => {
				const isLast = index === fills.length - 1;
				const active = fill.emptiedAt === null;
				return (
					<li
						key={`${fill.filledAt}-${index}`}
						className="grid grid-cols-[18px_1fr] gap-3"
					>
						<div className="flex flex-col items-center" aria-hidden="true">
							<span
								className={cn(
									"mt-1.5 size-2.5 shrink-0 rounded-full",
									active ? dot[fill.status] : "bg-border",
								)}
							/>
							{isLast ? null : <span className="w-px flex-1 bg-border" />}
						</div>
						<div className={isLast ? undefined : "pb-4"}>
							<p
								className={cn(
									"font-semibold text-sm leading-snug",
									!active && "text-muted-foreground",
								)}
							>
								{fill.beerName ?? copy.privateBatch}
							</p>
							<p className="mt-0.5 font-mono text-muted-foreground text-xs">
								{active
									? `${copy.since(formatDate(fill.filledAt, locale))} · ${copy.status[fill.status].toLowerCase()}`
									: `${formatDate(fill.filledAt, locale)} — ${formatDate(fill.emptiedAt, locale)}`}
							</p>
						</div>
					</li>
				);
			})}
		</ol>
	);
}
