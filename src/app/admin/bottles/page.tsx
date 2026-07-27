"use client";

import { Archive, Beer, ExternalLink, Pencil } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CreateBottlesDialog } from "@/components/create-bottles-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { BottleStatus } from "@/lib/types";
import { api } from "@/trpc/react";

const bottleStatusColors = {
	empty: "bg-muted text-muted-foreground",
	filled: "bg-chart-4 text-primary-foreground",
	conditioning: "bg-chart-2 text-primary-foreground",
	ready: "bg-chart-1 text-primary-foreground",
};

export default function AdminBottlesPage() {
	const { data: bottles = [], refetch } = api.bottle.getAll.useQuery();
	const { data: batches = [] } = api.batch.getAll.useQuery();

	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<
		BottleStatus | "all" | "retired"
	>("all");
	const [batchFilter, setBatchFilter] = useState<string>("all");
	const [selected, setSelected] = useState<string[]>([]);
	const retireMutation = api.bottle.retire.useMutation();

	const batchMap = useMemo(
		() => new Map(batches.map((b) => [b.id, b])),
		[batches],
	);

	const filtered = useMemo(() => {
		return bottles.filter((bottle) => {
			const label = bottle.label ?? `#${bottle.bottleNumber}`;

			if (search) {
				const q = search.toLowerCase();
				const matchLabel = label.toLowerCase().includes(q);
				const matchNum = String(bottle.bottleNumber).includes(q);
				if (!matchLabel && !matchNum) return false;
			}

			if (statusFilter === "retired") {
				if (!bottle.retiredAt) return false;
			} else if (statusFilter !== "all" && bottle.status !== statusFilter)
				return false;

			if (batchFilter === "unassigned") {
				if (bottle.currentBatchId) return false;
			} else if (batchFilter !== "all") {
				if (bottle.currentBatchId !== batchFilter) return false;
			}

			return true;
		});
	}, [bottles, search, statusFilter, batchFilter]);

	const bulkRetire = async () => {
		await Promise.all(
			selected.map((id) => retireMutation.mutateAsync({ id, retired: true })),
		);
		setSelected([]);
		await refetch();
	};

	return (
		<div className="container mx-auto px-4 py-8">
			<div className="mb-6 flex items-center justify-between gap-4">
				<div>
					<h1 className="font-bold text-2xl">Bottles</h1>
					<p className="text-muted-foreground text-sm">
						Manage all bottles in your inventory
					</p>
				</div>
				<CreateBottlesDialog onCreated={() => refetch()} />
			</div>

			<div className="mb-4 flex flex-wrap gap-3">
				<Input
					placeholder="Search by number or label…"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="max-w-xs"
				/>
				<Select
					value={statusFilter}
					onValueChange={(v) =>
						setStatusFilter(v as BottleStatus | "all" | "retired")
					}
				>
					<SelectTrigger className="w-44">
						<SelectValue placeholder="Status" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All statuses</SelectItem>
						<SelectItem value="empty">Empty</SelectItem>
						<SelectItem value="filled">Filled</SelectItem>
						<SelectItem value="conditioning">Conditioning</SelectItem>
						<SelectItem value="ready">Ready</SelectItem>
						<SelectItem value="retired">Retired</SelectItem>
					</SelectContent>
				</Select>
				<Select value={batchFilter} onValueChange={setBatchFilter}>
					<SelectTrigger className="w-52">
						<SelectValue placeholder="Batch" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All batches</SelectItem>
						<SelectItem value="unassigned">Unassigned</SelectItem>
						{batches.map((batch) => (
							<SelectItem key={batch.id} value={batch.id}>
								#{batch.batchNumber} {batch.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{selected.length > 0 && (
				<div className="mb-4 flex items-center justify-between rounded-lg border bg-muted/40 p-3">
					<p className="text-sm">{selected.length} bottles selected</p>
					<Button
						variant="outline"
						size="sm"
						onClick={bulkRetire}
						disabled={retireMutation.isPending}
					>
						<Archive className="mr-2 h-4 w-4" />
						Retire selected
					</Button>
				</div>
			)}

			<p className="mb-4 text-muted-foreground text-sm">
				Showing {filtered.length} of {bottles.length} bottles
			</p>

			{filtered.length === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-16 text-center">
						<Beer className="mb-4 h-10 w-10 text-muted-foreground" />
						<p className="text-muted-foreground">
							No bottles match your filters
						</p>
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
					{filtered.map((bottle) => {
						const label = bottle.label ?? `#${bottle.bottleNumber}`;
						const batch = bottle.currentBatchId
							? batchMap.get(bottle.currentBatchId)
							: null;
						return (
							<Card
								key={bottle.id}
								data-testid="inventory-bottle-card"
								className="transition-colors hover:border-primary/50"
							>
								<CardContent className="p-4">
									<div className="mb-2 flex items-start justify-between gap-1">
										<label className="flex min-w-0 items-center gap-2">
											<input
												type="checkbox"
												checked={selected.includes(bottle.id)}
												onChange={(event) =>
													setSelected((current) =>
														event.target.checked
															? [...current, bottle.id]
															: current.filter((id) => id !== bottle.id),
													)
												}
											/>
											<span className="max-w-[100px] truncate font-medium font-mono text-sm">
												{label}
											</span>
										</label>
										<Badge className={bottleStatusColors[bottle.status]}>
											{bottle.retiredAt ? "retired" : bottle.status}
										</Badge>
									</div>
									<p className="mb-3 truncate text-muted-foreground text-xs">
										{batch ? `${batch.name}` : "Unassigned"}
									</p>
									<p className="mb-3 text-muted-foreground text-xs">
										{bottle.printCount
											? `${bottle.printCount} label print${bottle.printCount === 1 ? "" : "s"}`
											: "Never printed"}
									</p>
									<div className="flex gap-1">
										<Button
											variant="outline"
											size="sm"
											asChild
											className="flex-1 bg-transparent"
										>
											<Link href={`/admin/bottle/${bottle.id}`}>
												<Pencil className="h-3 w-3" />
											</Link>
										</Button>
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
												<ExternalLink className="h-3 w-3" />
											</a>
										</Button>
									</div>
								</CardContent>
							</Card>
						);
					})}
				</div>
			)}
		</div>
	);
}
