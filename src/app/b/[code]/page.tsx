import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FillHistory, FillStatus } from "@/components/public/fill-status";
import { MonoLabel, PublicShell } from "@/components/public/public-shell";
import { Button } from "@/components/ui/button";
import {
	formatAbv,
	formatDate,
	type PublicBottleCopy,
	publicBottleCopy,
} from "@/lib/public-i18n";
import { getPublicLocale } from "@/lib/public-locale";
import type { Locale } from "@/lib/status-labels";
import { cn } from "@/lib/utils";
import { shortPublicCode } from "@/server/domain/public-code";
import {
	getPublicBottlePageByCode,
	type PublicBottlePage as PublicBottlePageData,
} from "@/server/services/bottle-service";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: {
	params: Promise<{ code: string }>;
}): Promise<Metadata> {
	const { code } = await props.params;
	const [bottle, locale] = await Promise.all([
		getPublicBottlePageByCode(code),
		getPublicLocale(),
	]);
	const copy = publicBottleCopy[locale];
	if (!bottle) return { title: copy.unknownTitle };
	const name = `${copy.bottle} ${bottle.bottleNumber}`;
	const beer = bottle.currentFill?.beerName;
	return { title: beer ? `${beer} · ${name}` : name };
}

function BottleIdentity({
	bottle,
	code,
	copy,
	className,
}: {
	bottle: PublicBottlePageData;
	code: string;
	copy: PublicBottleCopy;
	className?: string;
}) {
	return (
		<p
			className={cn(
				"flex flex-wrap items-center gap-x-2 gap-y-1 font-mono font-semibold text-[0.6875rem] uppercase leading-none tracking-widest",
				className,
			)}
		>
			<span>
				{copy.bottle} {bottle.bottleNumber}
			</span>
			{bottle.displayName ? (
				<>
					<span aria-hidden="true" className="size-1 rounded-full bg-current" />
					<span>{bottle.displayName}</span>
				</>
			) : null}
			<span aria-hidden="true" className="size-1 rounded-full bg-current" />
			<span>{shortPublicCode(code)}</span>
		</p>
	);
}

function HistorySection({
	title,
	bottle,
	locale,
	copy,
	className,
}: {
	title: string;
	bottle: PublicBottlePageData;
	locale: Locale;
	copy: PublicBottleCopy;
	className?: string;
}) {
	return (
		<section className={className}>
			<MonoLabel>{title}</MonoLabel>
			<div className="mt-3">
				<FillHistory fills={bottle.timeline} locale={locale} copy={copy} />
			</div>
		</section>
	);
}

export default async function PublicBottlePage(props: {
	params: Promise<{ code: string }>;
}) {
	const { code } = await props.params;
	const [bottle, locale] = await Promise.all([
		getPublicBottlePageByCode(code),
		getPublicLocale(),
	]);
	if (!bottle) notFound();
	const copy = publicBottleCopy[locale];
	const fill = bottle.currentFill;

	if (bottle.state === "retired") {
		return (
			<PublicShell locale={locale} copy={copy}>
				<main className="mx-auto max-w-2xl px-4 py-6 lg:py-12">
					<span className="inline-flex items-center gap-1.5 rounded-full border bg-state-archived-bg px-2.5 py-1 font-semibold text-state-archived text-xs">
						<span aria-hidden="true" className="h-0.5 w-2.5 bg-current" />
						{copy.retiredBadge}
					</span>
					<h1 className="mt-3.5 font-semibold text-2xl leading-tight tracking-tight">
						{copy.retiredTitle}
					</h1>
					<p className="mt-2 text-pretty text-[0.9375rem] text-muted-foreground leading-normal">
						{copy.retiredBody(
							bottle.bottleNumber,
							formatDate(bottle.retiredAt, locale),
						)}
					</p>
					<BottleIdentity
						bottle={bottle}
						code={code}
						copy={copy}
						className="mt-4 text-muted-foreground"
					/>
					<HistorySection
						title={copy.lastHeld}
						bottle={bottle}
						locale={locale}
						copy={copy}
						className="mt-8 border-t pt-6"
					/>
				</main>
			</PublicShell>
		);
	}

	if (!fill) {
		return (
			<PublicShell locale={locale} copy={copy}>
				<main className="mx-auto max-w-2xl">
					<div className="border-b px-4 pt-7 pb-6 text-center">
						<BottleIdentity
							bottle={bottle}
							code={code}
							copy={copy}
							className="justify-center text-muted-foreground"
						/>
						<span
							aria-hidden="true"
							className="mx-auto mt-4 block size-7.5 rounded-full border-2 border-muted-foreground/50 border-dashed"
						/>
						<h1 className="mt-3.5 font-semibold text-2xl leading-tight tracking-tight">
							{copy.emptyTitle}
						</h1>
						<p className="mx-auto mt-2.5 max-w-xs text-pretty text-[0.9375rem] text-muted-foreground leading-normal">
							{copy.emptyBody}
						</p>
					</div>
					<div className="px-4 pt-5 pb-6">
						<HistorySection
							title={copy.lastHeld}
							bottle={bottle}
							locale={locale}
							copy={copy}
						/>
						<Button
							asChild
							className="mt-5 h-12 w-full font-semibold text-base"
						>
							<Link href="/">{copy.emptyAction}</Link>
						</Button>
					</div>
				</main>
			</PublicShell>
		);
	}

	const isPrivate = fill.beerName === null;
	const meta = [
		fill.style,
		fill.abv === null ? null : formatAbv(fill.abv, locale),
	].filter((value): value is string => Boolean(value));

	return (
		<PublicShell locale={locale} copy={copy}>
			<main className="mx-auto max-w-[1080px] lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-x-10 lg:px-10 lg:pt-9 lg:pb-11">
				{/* Amber hero on mobile; on desktop the label becomes plain typography. No text alpha on amber. */}
				<div
					className={cn(
						"px-4 pt-5 pb-4.5 lg:col-start-1 lg:bg-transparent lg:p-0 lg:text-foreground",
						isPrivate
							? "border-b bg-muted text-muted-foreground lg:border-b-0"
							: "bg-primary text-primary-foreground",
					)}
				>
					<BottleIdentity
						bottle={bottle}
						code={code}
						copy={copy}
						className="lg:text-muted-foreground"
					/>
					<h1
						className={cn(
							"mt-2.5 text-pretty font-semibold tracking-tight lg:mt-3.5 lg:text-5xl lg:leading-none",
							isPrivate
								? "font-medium text-[1.6875rem] leading-tight"
								: "text-[1.9375rem] leading-[1.04]",
						)}
					>
						{fill.beerName ?? copy.privateBatch}
					</h1>
					{isPrivate ? (
						<p className="mt-2 text-pretty text-sm leading-normal">
							{copy.privateHero}
						</p>
					) : meta.length > 0 ? (
						<p className="mt-2 flex flex-wrap items-center gap-x-2.5 font-medium text-sm lg:mt-3.5 lg:text-base lg:text-foreground/80">
							{meta.map((value, index) => (
								<span key={value} className="contents">
									{index > 0 ? (
										<span
											aria-hidden="true"
											className="size-1 rounded-full bg-current"
										/>
									) : null}
									<span className={index > 0 ? "font-mono" : undefined}>
										{value}
									</span>
								</span>
							))}
						</p>
					) : null}
				</div>

				<aside className="p-4 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:p-0">
					<div className="lg:sticky lg:top-5">
						<FillStatus
							fill={fill}
							volumeMl={bottle.volumeMl}
							locale={locale}
							copy={copy}
						/>
						{isPrivate ? (
							<p className="mt-3.5 rounded-md border border-dashed bg-muted px-3.5 py-3 text-muted-foreground text-xs leading-normal">
								{copy.privateNote}
							</p>
						) : null}
					</div>
				</aside>

				{bottle.currentDescription || bottle.currentListedBatchNumber ? (
					<section className="px-4 pt-0.5 pb-5 lg:col-start-1 lg:mt-6.5 lg:border-primary lg:border-t-2 lg:px-0 lg:pt-5.5 lg:pb-0">
						<MonoLabel>{copy.about}</MonoLabel>
						{bottle.currentDescription ? (
							<p className="mt-2.5 max-w-[62ch] whitespace-pre-line text-pretty text-[0.9375rem] text-foreground/85 leading-relaxed lg:text-[1.0625rem]">
								{bottle.currentDescription}
							</p>
						) : null}
						{bottle.currentListedBatchNumber ? (
							<Link
								href={`/batch/${bottle.currentListedBatchNumber}`}
								className="mt-3.5 flex min-h-12 items-center justify-between gap-2 rounded-md border bg-muted px-3.5 font-medium text-sm hover:bg-accent lg:inline-flex lg:min-h-11 lg:border-0 lg:bg-transparent lg:px-0 lg:hover:bg-transparent lg:hover:underline"
							>
								{copy.batchStory(bottle.currentListedBatchNumber)}
								<ArrowRight
									className="size-4 text-accent-foreground"
									aria-hidden="true"
								/>
							</Link>
						) : null}
					</section>
				) : null}

				<HistorySection
					title={copy.history}
					bottle={bottle}
					locale={locale}
					copy={copy}
					className="px-4 pt-2 pb-5.5 lg:col-start-1 lg:mt-8 lg:px-0 lg:pb-0"
				/>
			</main>
		</PublicShell>
	);
}
