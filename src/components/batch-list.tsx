"use client";

import { Bold as Bottle, LoaderIcon, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { Batch } from "@/lib/types";
import { api } from "@/trpc/react";
import { EditBatchDialog } from "./edit-batch-dialog";

const statusColors = {
	planning: "bg-secondary text-secondary-foreground",
	brewing: "bg-chart-4 text-primary-foreground",
	fermenting: "bg-chart-2 text-primary-foreground",
	bottled: "bg-chart-1 text-primary-foreground",
	completed: "bg-muted text-muted-foreground",
};

export function BatchList() {
	const {
		isFetched,
		data: batches = [],
		refetch,
	} = api.batch.getAll.useQuery();
	const deleteMutation = api.batch.delete.useMutation({
		onSuccess: () => refetch(),
	});

	const [editingBatch, setEditingBatch] = useState<Partial<Batch> | null>(null);

	const handleDelete = (id: string) => {
		if (confirm("Are you sure you want to delete this batch?")) {
			deleteMutation.mutate({ id });
		}
	};
	if (!isFetched) {
		return (
			<div className="flex flex-col items-center justify-center py-16 text-center">
				<div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
					<LoaderIcon className="h-10 w-10 animate-spin text-muted-foreground" />
				</div>
				<h2 className="mb-2 font-semibold text-xl">Loading batches...</h2>
				<p className="mb-6 text-muted-foreground">
					Please wait while we fetch your batches
				</p>
			</div>
		);
	}

	if (batches.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-16 text-center">
				<div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
					<Bottle className="h-10 w-10 text-muted-foreground" />
				</div>
				<h2 className="mb-2 font-semibold text-xl">No batches yet</h2>
				<p className="mb-6 text-muted-foreground">
					Create your first brewing batch to get started
				</p>
			</div>
		);
	}

	return (
		<>
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{batches.map((batch) => (
					<Card
						key={batch.id}
						className="transition-colors hover:border-primary/50"
					>
						<CardHeader>
							<div className="flex items-start justify-between gap-2">
								<div className="min-w-0 flex-1">
									<div className="mb-2 flex items-center gap-2">
										<Badge variant="outline" className="font-mono">
											#{batch.batchNumber}
										</Badge>
										<Badge className={statusColors[batch.status]}>
											{batch.status}
										</Badge>
									</div>
									<CardTitle className="text-balance">{batch.name}</CardTitle>
									<CardDescription className="text-pretty">
										{batch.description}
									</CardDescription>
								</div>
							</div>
						</CardHeader>
						<CardContent>
							{batch.note && (
								<p className="mb-4 text-pretty text-muted-foreground text-sm">
									{batch.note}
								</p>
							)}
							<div className="flex items-center gap-2">
								<Button asChild variant="default" size="sm" className="flex-1">
									<Link href={`/admin/batch/${batch.id}`}>
										<Bottle className="mr-2 h-4 w-4" />
										Manage Bottles
									</Link>
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() =>
										setEditingBatch({
											...batch,
											created: undefined,
											updated: undefined,
										})
									}
								>
									<Pencil className="h-4 w-4" />
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => handleDelete(batch.id)}
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			{editingBatch && (
				<EditBatchDialog
					batch={editingBatch as Omit<Batch, "created" | "updated">}
					open={!!editingBatch}
					onOpenChange={(open) => !open && setEditingBatch(null)}
					onSave={() => refetch()}
				/>
			)}
		</>
	);
}
