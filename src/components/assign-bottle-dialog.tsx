"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { Bottle } from "@/lib/types";
import { api } from "@/trpc/react";

interface AssignBottleDialogProps {
	availableBottles: Bottle[];
	batchId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onAssign: (bottleId: string) => void;
}

const bottleStatusColors = {
	empty: "bg-muted text-muted-foreground",
	filled: "bg-chart-4 text-primary-foreground",
	conditioning: "bg-chart-2 text-primary-foreground",
	ready: "bg-chart-1 text-primary-foreground",
};

export function AssignBottleDialog({
	availableBottles,
	batchId,
	open,
	onOpenChange,
	onAssign,
}: AssignBottleDialogProps) {
	const assignMutation = api.bottle.assignToBatch.useMutation();

	const handleAssign = async (bottleId: string) => {
		await assignMutation.mutateAsync({
			bottleId,
			batchId,
		});
		onAssign(bottleId);
	};

	if (availableBottles.length === 0) {
		return (
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>Assign Bottle</DialogTitle>
						<DialogDescription>
							No available bottles to assign
						</DialogDescription>
					</DialogHeader>
					<div className="py-8 text-center">
						<p className="text-muted-foreground">
							All bottles are currently assigned to batches.
						</p>
						<p className="mt-2 text-muted-foreground text-sm">
							Create a new bottle to continue.
						</p>
					</div>
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[600px]">
				<DialogHeader>
					<DialogTitle>Assign Bottle to Batch</DialogTitle>
					<DialogDescription>
						Select a bottle to assign to this batch
					</DialogDescription>
				</DialogHeader>
				<div className="grid max-h-[400px] gap-3 overflow-y-auto py-4">
					{availableBottles.map((bottle) => (
						<Card
							key={bottle.id}
							className="cursor-pointer transition-colors hover:border-primary/50"
						>
							<CardContent className="p-4">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<Badge variant="outline" className="font-mono">
											#{bottle.bottleNumber}
										</Badge>
										<Badge className={bottleStatusColors[bottle.status]}>
											{bottle.status}
										</Badge>
									</div>
									<Button size="sm" onClick={() => handleAssign(bottle.id)}>
										Assign
									</Button>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			</DialogContent>
		</Dialog>
	);
}
