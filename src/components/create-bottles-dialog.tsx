"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
import { api } from "@/trpc/react";

interface CreateBottlesDialogProps {
	onCreated: () => void;
}

export function CreateBottlesDialog({ onCreated }: CreateBottlesDialogProps) {
	const [open, setOpen] = useState(false);
	const [count, setCount] = useState(10);
	const createRange = api.bottle.createRange.useMutation();
	const valid = Number.isInteger(count) && count >= 1 && count <= 500;

	const handleSubmit = async () => {
		if (!valid) return;
		try {
			const created = await createRange.mutateAsync({ count });
			setOpen(false);
			onCreated();
			toast.success(
				`Created ${created.length} bottle${created.length === 1 ? "" : "s"}`,
			);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to create bottles",
			);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button>
					<Plus className="mr-2 h-4 w-4" />
					Create Bottles
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[460px]">
				<DialogHeader>
					<DialogTitle>Create bottle range</DialogTitle>
					<DialogDescription>
						The server allocates consecutive bottle numbers safely and gives
						every bottle a permanent public QR code.
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-2 py-5">
					<Label htmlFor="bottle-count">Number of bottles</Label>
					<Input
						id="bottle-count"
						type="number"
						min={1}
						max={500}
						value={count}
						onChange={(event) => setCount(Number(event.target.value))}
					/>
					<p className="text-muted-foreground text-xs">
						Each new physical bottle starts available. Fill state is recorded
						only when it is assigned to a batch.
					</p>
				</div>
				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => setOpen(false)}
						type="button"
					>
						Cancel
					</Button>
					<Button
						onClick={handleSubmit}
						disabled={!valid || createRange.isPending}
						type="button"
					>
						Create {valid ? count : ""} Bottle{count === 1 ? "" : "s"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
