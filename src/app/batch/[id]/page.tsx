"use client";

import { Beer, ChevronLeft, LoaderIcon, Pencil } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { api } from "@/trpc/react";

const batchStatusColors = {
	planning: "bg-secondary text-secondary-foreground",
	brewing: "bg-chart-4 text-primary-foreground",
	fermenting: "bg-chart-2 text-primary-foreground",
	bottled: "bg-chart-1 text-primary-foreground",
	completed: "bg-muted text-muted-foreground",
};

const bottleStatusColors = {
	empty: "bg-muted text-muted-foreground",
	filled: "bg-chart-4 text-primary-foreground",
	conditioning: "bg-chart-2 text-primary-foreground",
	ready: "bg-chart-1 text-primary-foreground",
};

export default function PublicBatchPage() {
	const { id } = useParams<{ id: string }>();
	const { data: batch, isLoading } = api.batch.getById.useQuery({ id });
	const { data: bottles = [], isFetched: bottlesFetched } =
		api.bottle.getByBatchId.useQuery({ batchId: id }, { enabled: !!id });

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background">
				<LoaderIcon className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!batch) {
		return (
			<div className="min-h-screen bg-background">
				<div className="container mx-auto px-4 py-16">
					<Card className="mx-auto max-w-2xl">
						<CardContent className="flex flex-col items-center justify-center py-16 text-center">
							<Beer className="mb-4 h-10 w-10 text-muted-foreground" />
							<h2 className="mb-2 font-semibold text-xl">Batch Not Found</h2>
							<p className="text-muted-foreground">
								This batch does not exist or has been removed.
							</p>
						</CardContent>
					</Card>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background">
			<header className="border-border border-b bg-card">
				<div className="container mx-auto px-4 py-6">
					<div className="flex items-center gap-4">
						<Button variant="ghost" size="sm" asChild>
							<Link href="/" className="h-16">
								<ChevronLeft className="h-8 w-8" />
							</Link>
						</Button>
						<div className="flex flex-1 items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
								<Beer className="h-6 w-6 text-primary-foreground" />
							</div>
							<div>
								<h1 className="text-balance font-bold text-2xl">
									{batch.name}
								</h1>
								<p className="text-muted-foreground text-sm">
									Batch #{batch.batchNumber}
								</p>
							</div>
						</div>
						<Button variant="ghost" size="sm" asChild>
							<Link href={`/admin/batch/${id}`}>
								<Pencil className="h-4 w-4" />
							</Link>
						</Button>
					</div>
				</div>
			</header>

			<main className="container mx-auto px-4 py-8">
				<div className="mx-auto max-w-3xl space-y-6">
					<Card>
						<CardHeader>
							<div className="flex flex-wrap items-center gap-2">
								<Badge variant="outline" className="font-mono">
									#{batch.batchNumber}
								</Badge>
								<Badge className={batchStatusColors[batch.status]}>
									{batch.status}
								</Badge>
							</div>
							<CardTitle className="text-balance">{batch.name}</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							{batch.description && (
								<p className="text-pretty text-muted-foreground">
									{batch.description}
								</p>
							)}
							{batch.note && (
								<>
									<Separator />
									<div>
										<p className="mb-1 font-medium text-sm">Notes</p>
										<p className="text-pretty text-muted-foreground text-sm">
											{batch.note}
										</p>
									</div>
								</>
							)}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Beer className="h-5 w-5" />
								Bottles
							</CardTitle>
						</CardHeader>
						<CardContent>
							{!bottlesFetched ? (
								<div className="flex items-center justify-center py-8">
									<LoaderIcon className="h-6 w-6 animate-spin text-muted-foreground" />
								</div>
							) : bottles.length === 0 ? (
								<p className="py-8 text-center text-muted-foreground text-sm">
									No bottles assigned to this batch.
								</p>
							) : (
								<div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
									{bottles.map((bottle) => (
										<Link
											key={bottle.id}
											href={`/bottle/${bottle.id}`}
											className="group block"
										>
											<div className="flex items-center justify-between rounded-lg border p-3 transition-colors group-hover:border-primary/50">
												<span className="font-medium font-mono text-sm">
													#{bottle.bottleNumber}
												</span>
												<Badge className={bottleStatusColors[bottle.status]}>
													{bottle.status}
												</Badge>
											</div>
										</Link>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</main>
		</div>
	);
}
