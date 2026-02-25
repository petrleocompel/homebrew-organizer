"use client";
import { Beer, Calendar, Info, LoaderIcon, Pencil } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { api } from "@/trpc/react";

const bottleStatusColors = {
	empty: "bg-muted text-muted-foreground",
	filled: "bg-chart-4 text-primary-foreground",
	conditioning: "bg-chart-2 text-primary-foreground",
	ready: "bg-chart-1 text-primary-foreground",
};

const batchStatusColors = {
	planning: "bg-secondary text-secondary-foreground",
	brewing: "bg-chart-4 text-primary-foreground",
	fermenting: "bg-chart-2 text-primary-foreground",
	bottled: "bg-chart-1 text-primary-foreground",
	completed: "bg-muted text-muted-foreground",
};

export default function PublicBottlePage() {
	const { id } = useParams<{ id: string }>();
	const { data: bottle, isLoading } = api.bottle.getById.useQuery({
		id: id,
	});
	const { data: batch, isFetched: isBatchLoaded } = api.batch.getById.useQuery(
		{ id: bottle?.currentBatchId || "" },
		{ enabled: !!bottle?.currentBatchId },
	);

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background">
				<p className="text-muted-foreground">Loading...</p>
			</div>
		);
	}

	if (!bottle) {
		return (
			<div className="min-h-screen bg-background">
				<div className="container mx-auto px-4 py-16">
					<Card className="mx-auto max-w-2xl">
						<CardContent className="flex flex-col items-center justify-center py-16 text-center">
							<div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
								<Beer className="h-10 w-10 text-muted-foreground" />
							</div>
							<h2 className="mb-2 font-semibold text-xl">Bottle Not Found</h2>
							<p className="text-muted-foreground">
								This bottle does not exist or has been removed.
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
				<div className="container mx-auto px-4 py-8">
					<div className="flex items-center justify-between gap-3">
						<div className="flex items-center gap-3">
							<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
								<Beer className="h-7 w-7 text-primary-foreground" />
							</div>
							<div>
								<h1 className="text-balance font-bold text-3xl">
									Bottle {bottle.label ?? `#${bottle.bottleNumber}`}
								</h1>
								<p className="text-muted-foreground text-sm">
									Bottle Information
								</p>
							</div>
						</div>
						<Button variant="ghost" size="sm" asChild>
							<Link href={`/admin/bottle/${id}`}>
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
							<CardTitle className="flex items-center gap-2">
								<Info className="h-5 w-5" />
								Bottle Details
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid gap-4 sm:grid-cols-2">
								<div>
									<p className="mb-1 text-muted-foreground text-sm">
										Bottle Number
									</p>
									<Badge variant="outline" className="font-mono text-base">
										{bottle.label ?? `#${bottle.bottleNumber}`}
									</Badge>
								</div>
								<div>
									<p className="mb-1 text-muted-foreground text-sm">
										Current Status
									</p>
									<Badge className={bottleStatusColors[bottle.status]}>
										{bottle.status}
									</Badge>
								</div>
							</div>

							<Separator />

							<div className="grid gap-4 sm:grid-cols-2">
								<div>
									<p className="mb-1 text-muted-foreground text-sm">Created</p>
									<div className="flex items-center gap-2">
										<Calendar className="h-4 w-4 text-muted-foreground" />
										<p className="text-sm">
											{new Date(bottle.created).toLocaleDateString()}
										</p>
									</div>
								</div>
								<div>
									<p className="mb-1 text-muted-foreground text-sm">
										Last Updated
									</p>
									<div className="flex items-center gap-2">
										<Calendar className="h-4 w-4 text-muted-foreground" />
										<p className="text-sm">
											{new Date(bottle.updated!).toLocaleDateString()}
										</p>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
					{isBatchLoaded && batch && (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Beer className="h-5 w-5" />
									Current Batch
								</CardTitle>
								<CardDescription>
									This bottle is currently assigned to a batch
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div>
									<div className="mb-3 flex items-center gap-2">
										<Badge variant="outline" className="font-mono">
											Batch #{batch.batchNumber}
										</Badge>
										<Badge className={batchStatusColors[batch.status]}>
											{batch.status}
										</Badge>
									</div>
									<h3 className="mb-2 text-balance font-semibold text-xl">
										{batch.name}
									</h3>
									<p className="text-pretty text-muted-foreground">
										{batch.description}
									</p>
								</div>

								{batch.note && (
									<>
										<Separator />
										<div>
											<p className="mb-2 font-medium text-sm">Batch Notes</p>
											<p className="text-pretty text-muted-foreground text-sm">
												{batch.note}
											</p>
										</div>
									</>
								)}

								<Separator />

								<div className="grid gap-4 sm:grid-cols-2">
									<div>
										<p className="mb-1 text-muted-foreground text-sm">
											Batch Created
										</p>
										<div className="flex items-center gap-2">
											<Calendar className="h-4 w-4 text-muted-foreground" />
											<p className="text-sm">
												{new Date(batch.created).toLocaleDateString()}
											</p>
										</div>
									</div>
									<div>
										<p className="mb-1 text-muted-foreground text-sm">
											Batch Updated
										</p>
										<div className="flex items-center gap-2">
											<Calendar className="h-4 w-4 text-muted-foreground" />
											<p className="text-sm">
												{new Date(batch.updated!).toLocaleDateString()}
											</p>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					)}
					{isBatchLoaded && !batch && (
						<Card>
							<CardContent className="flex flex-col items-center justify-center py-12 text-center">
								<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
									<Beer className="h-8 w-8 text-muted-foreground" />
								</div>
								<h3 className="mb-2 font-semibold text-lg">
									No Batch Assigned
								</h3>
								<p className="text-muted-foreground text-sm">
									This bottle is not currently assigned to any batch.
								</p>
							</CardContent>
						</Card>
					)}
					{!isBatchLoaded && (
						<Card>
							<CardContent className="flex flex-col items-center justify-center py-12 text-center">
								<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
									<LoaderIcon className="h-10 w-10 animate-spin text-muted-foreground" />
								</div>
								<h3 className="mb-2 font-semibold text-lg">Loading...</h3>
								<p className="text-muted-foreground text-sm">
									Please wait while we load the bottle details
								</p>
							</CardContent>
						</Card>
					)}
				</div>
			</main>
		</div>
	);
}
