import { Beer, ChevronLeft, Package } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicFooter } from "@/components/public-footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { getPublicBatch } from "@/server/services/batch-service";

export const dynamic = "force-dynamic";

export default async function PublicBatchPage(props: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await props.params;
	const batch = await getPublicBatch(id);
	if (!batch) notFound();

	return (
		<div className="flex min-h-screen flex-col bg-background">
			<header className="border-border border-b bg-card">
				<div className="container mx-auto flex items-center gap-4 px-4 py-6">
					<Button variant="ghost" size="sm" asChild>
						<Link href="/">
							<ChevronLeft className="h-5 w-5" />
							<span className="sr-only">Back</span>
						</Link>
					</Button>
					<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
						<Beer className="h-6 w-6 text-primary-foreground" />
					</div>
					<div>
						<h1 className="font-bold text-2xl">{batch.publicName}</h1>
						<p className="text-muted-foreground text-sm">
							Batch #{batch.batchNumber}
						</p>
					</div>
				</div>
			</header>

			<main className="container mx-auto max-w-4xl flex-1 space-y-6 px-4 py-8">
				<Card>
					<CardHeader>
						<div className="flex flex-wrap gap-2">
							<Badge>{batch.status}</Badge>
							{batch.style && <Badge variant="outline">{batch.style}</Badge>}
							{batch.abv !== null && (
								<Badge variant="outline">{batch.abv}% ABV</Badge>
							)}
						</div>
						<CardDescription className="pt-2 text-base">
							{batch.publicDescription}
						</CardDescription>
					</CardHeader>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Package className="h-5 w-5" />
							Bottles
						</CardTitle>
						<CardDescription>
							Current and historical public fills from this batch.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{batch.bottles.length === 0 ? (
							<p className="text-muted-foreground text-sm">
								No public bottle fills yet.
							</p>
						) : (
							<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
								{batch.bottles.map((bottle, index) => (
									<Link
										key={`${bottle.publicCode}-${bottle.filledAt}-${index}`}
										href={`/b/${bottle.publicCode}`}
										className="rounded-lg border p-4 transition-colors hover:border-primary/50"
									>
										<p className="font-medium">
											{bottle.displayName ?? `Bottle #${bottle.bottleNumber}`}
										</p>
										<p className="mt-1 text-muted-foreground text-sm">
											{bottle.emptiedAt ? "emptied" : bottle.status}
										</p>
									</Link>
								))}
							</div>
						)}
					</CardContent>
				</Card>
			</main>
			<PublicFooter />
		</div>
	);
}
