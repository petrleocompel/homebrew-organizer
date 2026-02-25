"use client";

import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BottleStatus } from "@/lib/types";
import { api } from "@/trpc/react";

interface CreateBottlesDialogProps {
	onCreated: () => void;
}

export function CreateBottlesDialog({ onCreated }: CreateBottlesDialogProps) {
	const [open, setOpen] = useState(false);

	const { data: bottles = [] } = api.bottle.getAll.useQuery();
	const createManyMutation = api.bottle.createMany.useMutation();

	const maxBottleNumber = bottles.reduce(
		(max, b) => Math.max(max, b.bottleNumber),
		0,
	);

	// Numeric tab state
	const [fromNum, setFromNum] = useState(maxBottleNumber + 1);
	const [toNum, setToNum] = useState(maxBottleNumber + 10);
	const [numericStatus, setNumericStatus] = useState<BottleStatus>("empty");

	// GUID tab state
	const [guidCount, setGuidCount] = useState(3);
	const [guidStatus, setGuidStatus] = useState<BottleStatus>("empty");
	const [guidPreviews, setGuidPreviews] = useState<string[]>([]);

	useEffect(() => {
		if (open) {
			const nextMax = maxBottleNumber;
			setFromNum(nextMax + 1);
			setToNum(nextMax + 10);
		}
	}, [open, maxBottleNumber]);

	useEffect(() => {
		const count = Math.max(1, Math.min(100, guidCount));
		setGuidPreviews(Array.from({ length: count }, () => crypto.randomUUID()));
	}, [guidCount]);

	const existingNumbers = new Set(bottles.map((b) => b.bottleNumber));

	const numericRange: number[] = [];
	for (let n = fromNum; n <= toNum; n++) {
		numericRange.push(n);
	}
	const numericConflicts = numericRange.filter((n) => existingNumbers.has(n));
	const numericValid =
		fromNum <= toNum &&
		numericConflicts.length === 0 &&
		numericRange.length > 0;

	const handleNumericSubmit = async () => {
		await createManyMutation.mutateAsync(
			numericRange.map((n) => ({ bottleNumber: n, status: numericStatus })),
		);
		setOpen(false);
		onCreated();
	};

	const handleGuidSubmit = async () => {
		const count = Math.max(1, Math.min(100, guidCount));
		const nextMax = maxBottleNumber;
		await createManyMutation.mutateAsync(
			guidPreviews.slice(0, count).map((uuid, i) => ({
				bottleNumber: nextMax + i + 1,
				status: guidStatus,
				label: uuid,
			})),
		);
		setOpen(false);
		onCreated();
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button>
					<Plus className="mr-2 h-4 w-4" />
					Create Bottles
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[520px]">
				<DialogHeader>
					<DialogTitle>Create Bottles</DialogTitle>
					<DialogDescription>
						Create multiple bottles at once using a numeric range or UUID
						labels.
					</DialogDescription>
				</DialogHeader>

				<Tabs defaultValue="numeric" className="mt-2">
					<TabsList className="w-full">
						<TabsTrigger value="numeric" className="flex-1">
							Numeric
						</TabsTrigger>
						<TabsTrigger value="guid" className="flex-1">
							GUID
						</TabsTrigger>
					</TabsList>

					<TabsContent value="numeric" className="space-y-4 pt-4">
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="from">From</Label>
								<Input
									id="from"
									type="number"
									min={1}
									value={fromNum}
									onChange={(e) => setFromNum(Number(e.target.value))}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="to">To</Label>
								<Input
									id="to"
									type="number"
									min={fromNum}
									value={toNum}
									onChange={(e) => setToNum(Number(e.target.value))}
								/>
							</div>
						</div>
						<div className="grid gap-2">
							<Label>Status</Label>
							<Select
								value={numericStatus}
								onValueChange={(v) => setNumericStatus(v as BottleStatus)}
							>
								<SelectTrigger>
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
						{numericRange.length > 0 && (
							<div>
								<p className="mb-2 text-muted-foreground text-sm">
									Preview ({numericRange.length} bottles)
								</p>
								<div className="flex max-h-28 flex-wrap gap-1 overflow-y-auto">
									{numericRange.map((n) => (
										<Badge
											key={n}
											variant={
												existingNumbers.has(n) ? "destructive" : "outline"
											}
											className="font-mono"
										>
											#{n}
										</Badge>
									))}
								</div>
								{numericConflicts.length > 0 && (
									<p className="mt-1 text-destructive text-xs">
										Conflicts with existing bottles:{" "}
										{numericConflicts.map((n) => `#${n}`).join(", ")}
									</p>
								)}
							</div>
						)}
						<DialogFooter>
							<Button
								variant="outline"
								onClick={() => setOpen(false)}
								type="button"
							>
								Cancel
							</Button>
							<Button
								onClick={handleNumericSubmit}
								disabled={!numericValid || createManyMutation.isPending}
								type="button"
							>
								Create {numericRange.length > 0 ? numericRange.length : ""}{" "}
								Bottles
							</Button>
						</DialogFooter>
					</TabsContent>

					<TabsContent value="guid" className="space-y-4 pt-4">
						<div className="grid gap-2">
							<Label htmlFor="count">Count (1–100)</Label>
							<Input
								id="count"
								type="number"
								min={1}
								max={100}
								value={guidCount}
								onChange={(e) => setGuidCount(Number(e.target.value))}
							/>
						</div>
						<div className="grid gap-2">
							<Label>Status</Label>
							<Select
								value={guidStatus}
								onValueChange={(v) => setGuidStatus(v as BottleStatus)}
							>
								<SelectTrigger>
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
						<div>
							<p className="mb-2 text-muted-foreground text-sm">
								Preview ({Math.max(1, Math.min(100, guidCount))} UUIDs)
							</p>
							<div className="flex max-h-28 flex-col gap-1 overflow-y-auto">
								{guidPreviews
									.slice(0, Math.max(1, Math.min(100, guidCount)))
									.map((uuid) => (
										<Badge
											key={uuid}
											variant="outline"
											className="font-mono text-xs"
										>
											{uuid}
										</Badge>
									))}
							</div>
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
								onClick={handleGuidSubmit}
								disabled={createManyMutation.isPending}
								type="button"
							>
								Create {Math.max(1, Math.min(100, guidCount))} Bottles
							</Button>
						</DialogFooter>
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}
