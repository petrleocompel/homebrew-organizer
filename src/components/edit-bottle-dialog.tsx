"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { Bottle, BottleStatus } from "@/lib/types";
import { api } from "@/trpc/react";

interface EditBottleDialogProps {
	bottle: Omit<Bottle, "created" | "updated">;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: () => void;
	onDelete: (id: string) => void;
}

export function EditBottleDialog({
	bottle,
	open,
	onOpenChange,
	onSave,
	onDelete,
}: EditBottleDialogProps) {
	const [status, setStatus] = useState(bottle.status);
	const updateMutation = api.bottle.update.useMutation();

	useEffect(() => {
		setStatus(bottle.status);
	}, [bottle]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		const updatedBottle: Omit<Bottle, "created" | "updated"> = {
			...bottle,
			status,
		};

		updateMutation.mutate(updatedBottle);
		onSave();
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[400px]">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Edit Bottle #{bottle.bottleNumber}</DialogTitle>
						<DialogDescription>Update the bottle status</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="edit-status">Status</Label>
							<Select
								value={status}
								onValueChange={(value) => setStatus(value as BottleStatus)}
							>
								<SelectTrigger id="edit-status">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="empty">Empty</SelectItem>
									<SelectItem value="filled">Filled</SelectItem>
									<SelectItem value="conditioning">Conditioning</SelectItem>
									<SelectItem value="ready">Ready</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
					<DialogFooter className="flex-col gap-2 sm:flex-row">
						<Button
							type="button"
							variant="destructive"
							onClick={() => {
								onDelete(bottle.id);
								onOpenChange(false);
							}}
							className="sm:mr-auto"
						>
							Delete Bottle
						</Button>
						<div className="flex gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
							>
								Cancel
							</Button>
							<Button type="submit">Save Changes</Button>
						</div>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
