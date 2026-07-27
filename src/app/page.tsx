import { Beer, LogIn } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { listPublicBatches } from "@/server/services/batch-service";

export const dynamic = "force-dynamic";

export default async function PublicHomePage() {
	const batches = await listPublicBatches();
	return (
		<div className="min-h-screen bg-background">
			<header className="border-border border-b bg-card">
				<div className="container mx-auto flex items-center justify-between px-4 py-6">
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
							<Beer className="h-6 w-6 text-primary-foreground" />
						</div>
						<div>
							<h1 className="font-bold text-2xl">Homebrew Organizer</h1>
							<p className="text-muted-foreground text-sm">
								Our listed homebrew batches
							</p>
						</div>
					</div>
					<Button variant="ghost" size="sm" asChild>
						<Link href="/admin">
							<LogIn className="mr-2 h-4 w-4" />
							Team
						</Link>
					</Button>
				</div>
			</header>

			<main className="container mx-auto px-4 py-8">
				{batches.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-16 text-center">
						<Beer className="mb-4 h-10 w-10 text-muted-foreground" />
						<h2 className="mb-2 font-semibold text-xl">
							No listed batches yet
						</h2>
						<p className="text-muted-foreground">
							Unlisted beers remain available from their bottle QR.
						</p>
					</div>
				) : (
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{batches.map((batch) => (
							<Link
								key={batch.batchNumber}
								href={`/batch/${batch.batchNumber}`}
								className="group block"
							>
								<Card className="h-full transition-colors group-hover:border-primary/50">
									<CardHeader>
										<div className="mb-2 flex items-center gap-2">
											<Badge variant="outline" className="font-mono">
												#{batch.batchNumber}
											</Badge>
											<Badge>{batch.status}</Badge>
										</div>
										<CardTitle>{batch.publicName}</CardTitle>
										<CardDescription>{batch.publicDescription}</CardDescription>
										{(batch.style || batch.abv !== null) && (
											<p className="pt-2 text-muted-foreground text-sm">
												{[
													batch.style,
													batch.abv === null ? null : `${batch.abv}% ABV`,
												]
													.filter(Boolean)
													.join(" · ")}
											</p>
										)}
									</CardHeader>
								</Card>
							</Link>
						))}
					</div>
				)}
			</main>
		</div>
	);
}
