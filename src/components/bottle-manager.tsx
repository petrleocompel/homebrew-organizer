"use client";

import { ExternalLink, Plus } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { BottleStatusBadge, StatusBadge } from "@/components/status-badge";
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

interface BottleManagerProps {
	batchId: string;
}

export function BottleManager({ batchId }: BottleManagerProps) {
	const { data: batch } = api.batch.getById.useQuery({ id: batchId });
	const { data: assignedBottles = [], refetch: refetchAssignedBottles } =
		api.bottle.getByBatchId.useQuery({ batchId });
	const { data: allBottles = [], refetch: refetchAllBottles } =
		api.bottle.getAll.useQuery();

	const refreshBottleData = () => {
		refetchAssignedBottles();
		refetchAllBottles();
	};

	const unassignMutation = api.bottle.unassignFromBatch.useMutation({
		onSuccess: () => {
			refreshBottleData();
		},
	});

	const retireMutation = api.bottle.delete.useMutation({
		onSuccess: () => {
			refreshBottleData();
		},
	});

	const [editingBottle, setEditingBottle] = useState<Omit<
		Bottle,
		"created" | "updated"
	> | null>(null);
	const [showAssignDialog, setShowAssignDialog] = useState(false);

	const [pendingAction, setPendingAction] = useState<{
		kind: "unassign" | "retire";
		bottleId: string;
	} | null>(null);

	const handleUnassign = (bottleId: string) =>
		setPendingAction({ kind: "unassign", bottleId });

	const handleRetire = (bottleId: string) =>
		setPendingAction({ kind: "retire", bottleId });

	const confirmPendingAction = () => {
		if (pendingAction?.kind === "unassign") {
			unassignMutation.mutate({ bottleId: pendingAction.bottleId });
		} else if (pendingAction?.kind === "retire") {
			retireMutation.mutate({ id: pendingAction.bottleId });
		}
		setPendingAction(null);
	};

	const handleAssign = (_bottleIds: string[]) => {
		setShowAssignDialog(false);
		refreshBottleData();
	};

	if (!batch) {
		return (
			<div className="py-16 text-center">
				<p className="text-muted-foreground">Batch not found</p>
			</div>
		);
	}

	const availableBottles = allBottles.filter((b) => !b.currentBatchId);

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
								<StatusBadge kind="batch" value={batch.status} />
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
						<span data-testid="assigned-bottle-count">
							{assignedBottles.length} bottle
							{assignedBottles.length === 1 ? "" : "s"} assigned
						</span>
					</p>
				</div>
				<div className="flex gap-2">
					<CreateBottleDialog onCreated={refreshBottleData} />
					<Button
						variant="outline"
						data-testid="assign-existing-bottle-trigger"
						onClick={() => setShowAssignDialog(true)}
					>
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
							<CreateBottleDialog onCreated={refreshBottleData} />
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
				<div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,19rem),1fr))] gap-4">
					{assignedBottles.map((bottle) => (
						<Card
							key={bottle.id}
							data-testid="assigned-bottle-card"
							className="transition-colors hover:border-primary/50"
						>
							<CardHeader>
								<div className="flex items-start justify-between gap-2">
									<div className="flex-1">
										<div className="mb-1 flex items-center gap-2">
											<Badge variant="outline" className="font-mono">
												{bottle.label ?? `#${bottle.bottleNumber}`}
											</Badge>
											<BottleStatusBadge status={bottle.status} />
										</div>
									</div>
								</div>
							</CardHeader>
							<CardContent>
								<div className="flex flex-wrap items-center gap-2">
									<Button
										variant="outline"
										size="sm"
										asChild
										className="flex-1 bg-transparent"
									>
										<a
											href={`/b/${bottle.publicCode}`}
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

			<ConfirmDialog
				open={!!pendingAction}
				onOpenChange={(open) => !open && setPendingAction(null)}
				title={
					pendingAction?.kind === "retire"
						? "Retire this bottle?"
						: "Remove this bottle from the batch?"
				}
				description={
					pendingAction?.kind === "retire"
						? "The physical bottle can no longer be filled. Nothing is deleted: its QR code, fills and history stay in place, and it can be restored later."
						: "The active fill ends and the bottle becomes available again. The fill stays in the bottle's history."
				}
				confirmLabel={
					pendingAction?.kind === "retire" ? "Retire bottle" : "Remove bottle"
				}
				destructive
				onConfirm={confirmPendingAction}
			/>

			{editingBottle && (
				<EditBottleDialog
					bottle={editingBottle as Omit<Bottle, "created" | "updated">}
					open={!!editingBottle}
					onOpenChange={(open) => !open && setEditingBottle(null)}
					onSave={refreshBottleData}
					onRetire={handleRetire}
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
