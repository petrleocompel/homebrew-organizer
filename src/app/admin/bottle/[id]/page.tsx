"use client";

import {
	Beer,
	Calendar,
	ChevronLeft,
	Info,
	LoaderIcon,
	Pencil,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { EditBottleDialog } from "@/components/edit-bottle-dialog";
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
import type { Bottle } from "@/lib/types";
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

export default function AdminBottlePage() {
	const { id } = useParams<{ id: string }>();
	const router = useRouter();
	const [editingBottle, setEditingBottle] = useState<Omit<
		Bottle,
		"created" | "updated"
	> | null>(null);

	const {
		data: bottle,
		isLoading,
		refetch,
	} = api.bottle.getById.useQuery({ id });
	const { data: batch, isFetched: isBatchLoaded } = api.batch.getById.useQuery(
		{ id: bottle?.currentBatchId ?? "" },
		{ enabled: !!bottle?.currentBatchId },
	);
	const deleteMutation = api.bottle.delete.useMutation({
		onSuccess: () => router.push("/admin"),
	});

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-32">
				<LoaderIcon className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!bottle) {
		return (
			<div className="container mx-auto px-4 py-16">
				<Card className="mx-auto max-w-2xl">
					<CardContent className="flex flex-col items-center justify-center py-16 text-center">
						<Beer className="mb-4 h-10 w-10 text-muted-foreground" />
						<h2 className="mb-2 font-semibold text-xl">Bottle Not Found</h2>
						<p className="text-muted-foreground">
							This bottle does not exist or has been removed.
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<>
			<header className="border-border border-b bg-card">
				<div className="container mx-auto px-4 py-6">
					<div className="flex items-center gap-4">
						<Button variant="ghost" size="sm" asChild>
							<Link href="/admin" className="h-16">
								<ChevronLeft className="h-8 w-8" />
							</Link>
						</Button>
						<div className="flex flex-1 items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
								<Beer className="h-6 w-6 text-primary-foreground" />
							</div>
							<div>
								<h1 className="text-balance font-bold text-2xl">
									Bottle {bottle.label ?? `#${bottle.bottleNumber}`}
								</h1>
								<p className="text-muted-foreground text-sm">
									Admin — bottle details
								</p>
							</div>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={() =>
								setEditingBottle({
									id: bottle.id,
									status: bottle.status,
									bottleNumber: bottle.bottleNumber,
									currentBatchId: bottle.currentBatchId ?? undefined,
								})
							}
						>
							<Pencil className="mr-2 h-4 w-4" />
							Edit
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
											{new Date(
												bottle.updated ?? bottle.created,
											).toLocaleDateString()}
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
									Assigned Batch
								</CardTitle>
								<CardDescription>
									Manage this bottle via its batch
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="mb-3 flex items-center gap-2">
									<Badge variant="outline" className="font-mono">
										Batch #{batch.batchNumber}
									</Badge>
									<Badge className={batchStatusColors[batch.status]}>
										{batch.status}
									</Badge>
								</div>
								<h3 className="mb-4 font-semibold text-lg">{batch.name}</h3>
								<Button asChild variant="default" size="sm">
									<Link href={`/admin/batch/${batch.id}`}>
										Go to batch management
									</Link>
								</Button>
							</CardContent>
						</Card>
					)}
				</div>
			</main>

			{editingBottle && (
				<EditBottleDialog
					bottle={editingBottle}
					open={!!editingBottle}
					onOpenChange={(open) => !open && setEditingBottle(null)}
					onSave={() => refetch()}
					onDelete={(id) => deleteMutation.mutate({ id })}
				/>
			)}
		</>
	);
}
