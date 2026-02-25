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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Batch, BatchStatus } from "@/lib/types";
import { api } from "@/trpc/react";

interface EditBatchDialogProps {
	batch: Omit<Batch, "created" | "updated">;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: () => void;
}

export function EditBatchDialog({
	batch,
	open,
	onOpenChange,
	onSave,
}: EditBatchDialogProps) {
	const [formData, setFormData] = useState({
		name: batch.name,
		description: batch.description,
		note: batch.note,
		status: batch.status,
	});

	const updateMutation = api.batch.update.useMutation();

	useEffect(() => {
		setFormData({
			name: batch.name,
			description: batch.description,
			note: batch.note,
			status: batch.status,
		});
	}, [batch]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		await updateMutation.mutateAsync({
			id: batch.id!,
			batchNumber: batch.batchNumber!,
			name: formData.name!,
			description: formData.description!,
			note: formData.note!,
			status: formData.status!,
		});

		onSave();
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Edit Batch #{batch.batchNumber}</DialogTitle>
						<DialogDescription>
							Update the details of your brewing batch
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="edit-name">Batch Name</Label>
							<Input
								id="edit-name"
								value={formData.name}
								onChange={(e) =>
									setFormData({ ...formData, name: e.target.value })
								}
								required
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="edit-description">Description</Label>
							<Input
								id="edit-description"
								value={formData.description}
								onChange={(e) =>
									setFormData({ ...formData, description: e.target.value })
								}
								required
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="edit-status">Status</Label>
							<Select
								value={formData.status}
								onValueChange={(value) =>
									setFormData({ ...formData, status: value as BatchStatus })
								}
							>
								<SelectTrigger id="edit-status">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="planning">Planning</SelectItem>
									<SelectItem value="brewing">Brewing</SelectItem>
									<SelectItem value="fermenting">Fermenting</SelectItem>
									<SelectItem value="bottled">Bottled</SelectItem>
									<SelectItem value="completed">Completed</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="edit-note">Notes</Label>
							<Textarea
								id="edit-note"
								value={formData.note}
								onChange={(e) =>
									setFormData({ ...formData, note: e.target.value })
								}
								rows={3}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button type="submit">Save Changes</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
