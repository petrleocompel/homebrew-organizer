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
		publicName: batch.publicName ?? batch.name,
		description: batch.description,
		note: batch.note,
		status: batch.status,
		visibility: batch.visibility ?? "unlisted",
		styleName: batch.styleName ?? "",
		abv: batch.abv ?? "",
	});

	const updateMutation = api.batch.update.useMutation();

	useEffect(() => {
		setFormData({
			name: batch.name,
			publicName: batch.publicName ?? batch.name,
			description: batch.description,
			note: batch.note,
			status: batch.status,
			visibility: batch.visibility ?? "unlisted",
			styleName: batch.styleName ?? "",
			abv: batch.abv ?? "",
		});
	}, [batch]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		await updateMutation.mutateAsync({
			id: batch.id,
			batchNumber: batch.batchNumber,
			name: formData.name,
			publicName: formData.publicName,
			description: formData.description,
			publicDescription: formData.description,
			note: formData.note,
			status: formData.status,
			visibility: formData.visibility,
			styleName: formData.styleName || null,
			abv: formData.abv === "" ? null : Number(formData.abv),
		});

		onSave();
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[540px]">
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
							<Label htmlFor="edit-public-name">Public beer name</Label>
							<Input
								id="edit-public-name"
								value={formData.publicName}
								onChange={(e) =>
									setFormData({ ...formData, publicName: e.target.value })
								}
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
							<Label htmlFor="edit-visibility">Public visibility</Label>
							<Select
								value={formData.visibility}
								onValueChange={(value) =>
									setFormData({
										...formData,
										visibility: value as "private" | "unlisted" | "listed",
									})
								}
							>
								<SelectTrigger id="edit-visibility">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="private">Private</SelectItem>
									<SelectItem value="unlisted">Unlisted (QR only)</SelectItem>
									<SelectItem value="listed">Listed catalog</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div className="grid gap-2">
								<Label htmlFor="edit-style">Beer style</Label>
								<Input
									id="edit-style"
									value={formData.styleName}
									onChange={(e) =>
										setFormData({ ...formData, styleName: e.target.value })
									}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="edit-abv">ABV (%)</Label>
								<Input
									id="edit-abv"
									type="number"
									step="0.1"
									value={formData.abv}
									onChange={(e) =>
										setFormData({ ...formData, abv: e.target.value })
									}
								/>
							</div>
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
									<SelectItem value="packaging">Packaging</SelectItem>
									<SelectItem value="conditioning">Conditioning</SelectItem>
									<SelectItem value="ready">Ready</SelectItem>
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
						<Button type="submit" data-testid="edit-batch-submit">
							Save Changes
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
