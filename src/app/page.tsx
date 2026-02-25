"use client";

import { Beer, LoaderIcon, Pencil } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { api } from "@/trpc/react";

const statusColors = {
	planning: "bg-secondary text-secondary-foreground",
	brewing: "bg-chart-4 text-primary-foreground",
	fermenting: "bg-chart-2 text-primary-foreground",
	bottled: "bg-chart-1 text-primary-foreground",
	completed: "bg-muted text-muted-foreground",
};

export default function PublicHomePage() {
	const { isFetched, data: batches = [] } = api.batch.getAll.useQuery();

	return (
		<div className="min-h-screen bg-background">
			<header className="border-border border-b bg-card">
				<div className="container mx-auto px-4 py-6">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
								<Beer className="h-6 w-6 text-primary-foreground" />
							</div>
							<div>
								<h1 className="text-balance font-bold text-2xl">
									Homebrew Organizer
								</h1>
								<p className="text-muted-foreground text-sm">
									Brewing batches and bottles
								</p>
							</div>
						</div>
						<Button variant="ghost" size="sm" asChild>
							<Link href="/admin">
								<Pencil className="h-4 w-4" />
							</Link>
						</Button>
					</div>
				</div>
			</header>

			<main className="container mx-auto px-4 py-8">
				{!isFetched ? (
					<div className="flex flex-col items-center justify-center py-16 text-center">
						<LoaderIcon className="mb-4 h-10 w-10 animate-spin text-muted-foreground" />
						<p className="text-muted-foreground">Loading batches…</p>
					</div>
				) : batches.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-16 text-center">
						<Beer className="mb-4 h-10 w-10 text-muted-foreground" />
						<h2 className="mb-2 font-semibold text-xl">No batches yet</h2>
						<p className="text-muted-foreground">Nothing to show here yet.</p>
					</div>
				) : (
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{batches.map((batch) => (
							<Link
								key={batch.id}
								href={`/batch/${batch.id}`}
								className="group block"
							>
								<Card className="transition-colors group-hover:border-primary/50">
									<CardHeader>
										<div className="mb-2 flex items-center gap-2">
											<Badge variant="outline" className="font-mono">
												#{batch.batchNumber}
											</Badge>
											<Badge className={statusColors[batch.status]}>
												{batch.status}
											</Badge>
										</div>
										<CardTitle className="text-balance">{batch.name}</CardTitle>
										<CardDescription className="text-pretty">
											{batch.description}
										</CardDescription>
									</CardHeader>
									{batch.note && (
										<CardContent>
											<p className="text-pretty text-muted-foreground text-sm">
												{batch.note}
											</p>
										</CardContent>
									)}
								</Card>
							</Link>
						))}
					</div>
				)}
			</main>
		</div>
	);
}
