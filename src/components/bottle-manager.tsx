"use client";

import { ExternalLink, Plus } from "lucide-react";
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
import type { Bottle } from "@/lib/types";
import { api } from "@/trpc/react";
import { AssignBottleDialog } from "./assign-bottle-dialog";
import { CreateBottleDialog } from "./create-bottle-dialog";
import { EditBottleDialog } from "./edit-bottle-dialog";

const bottleStatusColors = {
	empty: "bg-muted text-muted-foreground",
	filled: "bg-chart-4 text-primary-foreground",
	conditioning: "bg-chart-2 text-primary-foreground",
	ready: "bg-chart-1 text-primary-foreground",
};

interface BottleManagerProps {
	batchId: string;
}

export function BottleManager({ batchId }: BottleManagerProps) {
	const { data: batch } = api.batch.getById.useQuery({ id: batchId });
	const { data: assignedBottles = [], refetch: refetchAssignedBottles } =
		api.bottle.getByBatchId.useQuery({ batchId });
	const { data: allBottles = [] } = api.bottle.getAll.useQuery();

	const unassignMutation = api.bottle.unassignFromBatch.useMutation({
		onSuccess: () => {
			refetchAssignedBottles();
		},
	});

	const deleteMutation = api.bottle.delete.useMutation({
		onSuccess: () => {
			refetchAssignedBottles();
		},
	});

	const [editingBottle, setEditingBottle] = useState<Omit<
		Bottle,
		"created" | "updated"
	> | null>(null);
	const [showAssignDialog, setShowAssignDialog] = useState(false);

	const handleUnassign = (bottleId: string) => {
		if (confirm("Remove this bottle from the batch?")) {
			unassignMutation.mutate({ bottleId });
		}
	};

	const handleDelete = (bottleId: string) => {
		if (confirm("Are you sure you want to delete this bottle?")) {
			deleteMutation.mutate({ id: bottleId });
		}
	};

	const handleAssign = () => {
		setShowAssignDialog(false);
		refetchAssignedBottles();
	};

	if (!batch) {
		return (
			<div className="py-16 text-center">
				<p className="text-muted-foreground">Batch not found</p>
			</div>
		);
	}

	const availableBottles: Bottle[] = allBottles.filter(
		(b) => !b.currentBatchId,
	) as any as Bottle[];

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<div className="flex items-start justify-between">
						<div>
							<div className="mb-2 flex items-center gap-2">
								<Badge variant="outline" className="font-mono">
									#{batch.batchNumber}
								</Badge>
								<Badge className="bg-primary text-primary-foreground">
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
				{batch.note && (
					<CardContent>
						<p className="text-pretty text-muted-foreground text-sm">
							{batch.note}
						</p>
					</CardContent>
				)}
			</Card>

			<div className="flex items-center justify-between">
				<div>
					<h2 className="font-semibold text-xl">Bottles in this Batch</h2>
					<p className="text-muted-foreground text-sm">
						{assignedBottles.length} bottles assigned
					</p>
				</div>
				<div className="flex gap-2">
					<CreateBottleDialog onCreated={refetchAssignedBottles} />
					<Button variant="outline" onClick={() => setShowAssignDialog(true)}>
						<Plus className="mr-2 h-4 w-4" />
						Assign Existing
					</Button>
				</div>
			</div>

			{assignedBottles.length === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-16 text-center">
						<p className="mb-4 text-muted-foreground">
							No bottles assigned to this batch yet
						</p>
						<div className="flex gap-2">
							<CreateBottleDialog onCreated={refetchAssignedBottles} />
							<Button
								variant="outline"
								onClick={() => setShowAssignDialog(true)}
							>
								Assign Existing Bottle
							</Button>
						</div>
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{assignedBottles.map((bottle) => (
						<Card
							key={bottle.id}
							className="transition-colors hover:border-primary/50"
						>
							<CardHeader>
								<div className="flex items-start justify-between gap-2">
									<div className="flex-1">
										<div className="mb-1 flex items-center gap-2">
											<Badge variant="outline" className="font-mono">
												{bottle.label ?? `#${bottle.bottleNumber}`}
											</Badge>
											<Badge className={bottleStatusColors[bottle.status]}>
												{bottle.status}
											</Badge>
										</div>
									</div>
								</div>
							</CardHeader>
							<CardContent>
								<div className="flex items-center gap-2">
									<Button
										variant="outline"
										size="sm"
										asChild
										className="flex-1 bg-transparent"
									>
										<a
											href={`/bottle/${bottle.id}`}
											target="_blank"
											rel="noopener noreferrer"
										>
											<ExternalLink className="mr-2 h-4 w-4" />
											View Public
										</a>
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={() =>
											setEditingBottle(
												bottle as Omit<Bottle, "created" | "updated">,
											)
										}
									>
										Edit
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={() => handleUnassign(bottle.id)}
									>
										Remove
									</Button>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}

			{editingBottle && (
				<EditBottleDialog
					bottle={editingBottle as Omit<Bottle, "created" | "updated">}
					open={!!editingBottle}
					onOpenChange={(open) => !open && setEditingBottle(null)}
					onSave={refetchAssignedBottles}
					onDelete={handleDelete}
				/>
			)}

			{showAssignDialog && (
				<AssignBottleDialog
					availableBottles={availableBottles}
					batchId={batchId}
					open={showAssignDialog}
					onOpenChange={setShowAssignDialog}
					onAssign={handleAssign}
				/>
			)}
		</div>
	);
}
