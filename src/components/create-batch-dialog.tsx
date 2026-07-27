"use client";

import { Plus } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
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
import type { BatchStatus } from "@/lib/types";
import { api } from "@/trpc/react";

export function CreateBatchDialog() {
	const [open, setOpen] = useState(false);
	const [formData, setFormData] = useState({
		name: "",
		publicName: "",
		description: "",
		note: "",
		status: "planning" as BatchStatus,
		visibility: "unlisted" as "private" | "unlisted" | "listed",
		recipeRevisionId: "",
	});

	const { data: batches = [] } = api.batch.getAll.useQuery();
	const { data: recipes = [] } = api.recipe.list.useQuery();
	const createMutation = api.batch.create.useMutation();
	const utils = api.useUtils();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		const maxBatchNumber = batches.reduce(
			(max, b) => Math.max(max, b.batchNumber),
			0,
		);

		await createMutation.mutateAsync({
			batchNumber: maxBatchNumber + 1,
			name: formData.name,
			publicName: formData.publicName || formData.name,
			description: formData.description,
			publicDescription: formData.description,
			note: formData.note,
			status: formData.status,
			visibility: formData.visibility,
			recipeRevisionId: formData.recipeRevisionId,
		});

		setFormData({
			name: "",
			publicName: "",
			description: "",
			note: "",
			status: "planning",
			visibility: "unlisted",
			recipeRevisionId: "",
		});
		setOpen(false);
		utils.batch.getAll.invalidate();
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button data-testid="create-batch-trigger">
					<Plus className="mr-2 h-4 w-4" />
					New Batch
				</Button>
			</DialogTrigger>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Create New Batch</DialogTitle>
						<DialogDescription>
							Add a new brewing batch to your collection
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="recipe-revision">Immutable recipe revision</Label>
							<Select
								value={formData.recipeRevisionId}
								onValueChange={(value) =>
									setFormData({ ...formData, recipeRevisionId: value })
								}
							>
								<SelectTrigger id="recipe-revision">
									<SelectValue placeholder="Choose a recipe revision" />
								</SelectTrigger>
								<SelectContent>
									{recipes
										.filter((recipe) => recipe.currentRevisionId)
										.map((recipe) => (
											<SelectItem
												key={recipe.id}
												value={recipe.currentRevisionId as string}
											>
												{recipe.name} · revision {recipe.revision}
											</SelectItem>
										))}
								</SelectContent>
							</Select>
							{recipes.length === 0 && (
								<p className="text-muted-foreground text-xs">
									Create or import a recipe first.
								</p>
							)}
						</div>
						<div className="grid gap-2">
							<Label htmlFor="name">Batch Name</Label>
							<Input
								id="name"
								placeholder="e.g., Summer Pale Ale"
								value={formData.name}
								onChange={(e) =>
									setFormData({ ...formData, name: e.target.value })
								}
								required
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="public-name">Public beer name</Label>
							<Input
								id="public-name"
								placeholder="Defaults to the private batch name"
								value={formData.publicName}
								onChange={(e) =>
									setFormData({ ...formData, publicName: e.target.value })
								}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="description">Description</Label>
							<Input
								id="description"
								placeholder="Brief description of the beer"
								value={formData.description}
								onChange={(e) =>
									setFormData({ ...formData, description: e.target.value })
								}
								required
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="visibility">Public visibility</Label>
							<Select
								value={formData.visibility}
								onValueChange={(value) =>
									setFormData({
										...formData,
										visibility: value as "private" | "unlisted" | "listed",
									})
								}
							>
								<SelectTrigger id="visibility">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="private">Private</SelectItem>
									<SelectItem value="unlisted">Unlisted (QR only)</SelectItem>
									<SelectItem value="listed">Listed catalog</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="status">Status</Label>
							<Select
								value={formData.status}
								onValueChange={(value) =>
									setFormData({ ...formData, status: value as BatchStatus })
								}
							>
								<SelectTrigger id="status">
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
							<Label htmlFor="note">Notes</Label>
							<Textarea
								id="note"
								placeholder="Additional notes about this batch"
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
							onClick={() => setOpen(false)}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							data-testid="create-batch-submit"
							disabled={!formData.recipeRevisionId || createMutation.isPending}
						>
							Create Batch
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
