import { Beer, CalendarDays, History, PackageCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicFooter } from "@/components/public-footer";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { getPublicBottleByCode } from "@/server/services/bottle-service";

export const dynamic = "force-dynamic";

function date(value: string | null) {
	return value
		? new Intl.DateTimeFormat("cs-CZ", { dateStyle: "medium" }).format(
				new Date(value),
			)
		: "—";
}

export async function generateMetadata(props: {
	params: Promise<{ code: string }>;
}): Promise<Metadata> {
	const { code } = await props.params;
	const bottle = await getPublicBottleByCode(code);
	return {
		title: bottle
			? `Bottle ${bottle.displayName ?? `#${bottle.bottleNumber}`}`
			: "Bottle not found",
	};
}

export default async function PublicBottlePage(props: {
	params: Promise<{ code: string }>;
}) {
	const { code } = await props.params;
	const bottle = await getPublicBottleByCode(code);
	if (!bottle) notFound();

	return (
		<div className="flex min-h-screen flex-col bg-muted/20">
			<header className="border-border border-b bg-card">
				<div className="container mx-auto flex items-center justify-between px-4 py-5">
					<Link href="/" className="flex items-center gap-3">
						<span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
							<Beer className="h-6 w-6 text-primary-foreground" />
						</span>
						<span>
							<span className="block font-bold">Homebrew Organizer</span>
							<span className="block text-muted-foreground text-xs">
								Permanent bottle identity
							</span>
						</span>
					</Link>
					<Badge variant="outline">{bottle.state.replace("_", " ")}</Badge>
				</div>
			</header>

			<main className="container mx-auto max-w-3xl flex-1 space-y-6 px-4 py-8">
				<Card>
					<CardHeader>
						<CardDescription>Bottle #{bottle.bottleNumber}</CardDescription>
						<h1 className="font-semibold text-3xl leading-none">
							{bottle.displayName ?? `Bottle #${bottle.bottleNumber}`}
						</h1>
					</CardHeader>
					<CardContent>
						{bottle.currentFill ? (
							<div className="space-y-4">
								<div className="flex items-start gap-3">
									<PackageCheck className="mt-1 h-5 w-5 text-primary" />
									<div>
										<p className="font-semibold text-xl">
											{bottle.currentFill.beerName ?? "Private batch"}
										</p>
										<p className="text-muted-foreground text-sm">
											{[
												bottle.currentFill.style,
												bottle.currentFill.abv === null
													? null
													: `${bottle.currentFill.abv.toFixed(1)}% ABV`,
											]
												.filter(Boolean)
												.join(" · ")}
										</p>
									</div>
								</div>
								<div className="grid gap-3 rounded-lg bg-muted/50 p-4 sm:grid-cols-3">
									<div>
										<p className="text-muted-foreground text-xs">Status</p>
										<p className="font-medium">{bottle.currentFill.status}</p>
									</div>
									<div>
										<p className="text-muted-foreground text-xs">Filled</p>
										<p className="font-medium">
											{date(bottle.currentFill.filledAt)}
										</p>
									</div>
									<div>
										<p className="text-muted-foreground text-xs">
											Expected ready
										</p>
										<p className="font-medium">
											{date(bottle.currentFill.expectedReadyAt)}
										</p>
									</div>
								</div>
							</div>
						) : (
							<p className="text-muted-foreground">
								This bottle is currently available.
							</p>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<History className="h-5 w-5" />
							Bottle timeline
						</CardTitle>
						<CardDescription>
							Public fills remain here when the bottle is reused.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{bottle.timeline.length === 0 ? (
							<p className="text-muted-foreground text-sm">
								No public fill history yet.
							</p>
						) : (
							<ol className="space-y-5">
								{bottle.timeline.map((fill, index) => (
									<li
										key={`${fill.filledAt}-${index}`}
										className="relative border-border border-l pl-5"
									>
										<span className="absolute top-1 -left-1.5 h-3 w-3 rounded-full bg-primary" />
										<p className="font-medium">
											{fill.beerName ?? "Private batch"}
										</p>
										<p className="mt-1 flex items-center gap-2 text-muted-foreground text-sm">
											<CalendarDays className="h-4 w-4" />
											Filled {date(fill.filledAt)}
											{fill.emptiedAt
												? ` · Emptied ${date(fill.emptiedAt)}`
												: ` · ${fill.status}`}
										</p>
									</li>
								))}
							</ol>
						)}
					</CardContent>
				</Card>
			</main>
			<PublicFooter />
		</div>
	);
}
