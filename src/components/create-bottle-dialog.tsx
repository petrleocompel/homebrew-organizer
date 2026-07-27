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
import { api } from "@/trpc/react";

interface CreateBottleDialogProps {
	onCreated: () => void;
}

export function CreateBottleDialog({ onCreated }: CreateBottleDialogProps) {
	const [open, setOpen] = useState(false);
	const createMutation = api.bottle.createRange.useMutation();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		await createMutation.mutateAsync({ count: 1 });

		setOpen(false);
		onCreated();
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button data-testid="create-bottle-trigger">
					<Plus className="mr-2 h-4 w-4" />
					New Bottle
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[400px]">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Create New Bottle</DialogTitle>
						<DialogDescription>
							Add a new bottle to your inventory
						</DialogDescription>
					</DialogHeader>
					<p className="py-6 text-muted-foreground text-sm">
						The server assigns the next bottle number and a permanent public QR
						code. The new bottle starts available.
					</p>
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
							data-testid="create-bottle-submit"
							disabled={createMutation.isPending}
						>
							Create Bottle
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
