"use client";

import {
	Beer,
	Calendar,
	Download,
	ExternalLink,
	History,
	Info,
	LoaderIcon,
	Pencil,
	QrCode,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { EditBottleDialog } from "@/components/edit-bottle-dialog";
import { PageHeader } from "@/components/page-header";
import { BottleStatusBadge, StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Bottle } from "@/lib/types";
import { api } from "@/trpc/react";

export default function AdminBottlePage() {
	const { id } = useParams<{ id: string }>();
	const router = useRouter();
	const [editingBottle, setEditingBottle] = useState<Omit<
		Bottle,
		"created" | "updated"
	> | null>(null);

	const {
		data: bottle,
		isLoading,
		refetch,
	} = api.bottle.getById.useQuery({ id });
	const { data: detail, refetch: refetchDetail } =
		api.bottle.getDetail.useQuery({ id });
	const { data: batch, isFetched: isBatchLoaded } = api.batch.getById.useQuery(
		{ id: bottle?.currentBatchId ?? "" },
		{ enabled: !!bottle?.currentBatchId },
	);
	const retireMutation = api.bottle.delete.useMutation({
		onSuccess: () => router.push("/admin/bottles"),
	});

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-32">
				<LoaderIcon className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!bottle) {
		return (
			<div className="container mx-auto px-4 py-16">
				<Card className="mx-auto max-w-2xl">
					<CardContent className="flex flex-col items-center justify-center py-16 text-center">
						<Beer className="mb-4 h-10 w-10 text-muted-foreground" />
						<h2 className="mb-2 font-semibold text-xl">Bottle Not Found</h2>
						<p className="text-muted-foreground">
							This bottle does not exist or has been removed.
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<>
			<PageHeader
				className="p-4 pb-0 md:p-7 md:pb-0"
				title={`Bottle ${bottle.label ?? `#${bottle.bottleNumber}`}`}
				description="Admin — bottle details"
				actions={
					<Button
						variant="outline"
						size="sm"
						onClick={() =>
							setEditingBottle({
								id: bottle.id,
								status: bottle.status,
								bottleNumber: bottle.bottleNumber,
								label: bottle.label,
								currentBatchId: bottle.currentBatchId ?? undefined,
							})
						}
					>
						<Pencil className="mr-2 h-4 w-4" />
						Edit
					</Button>
				}
			/>

			<div className="p-4 md:p-7">
				<div className="mx-auto max-w-3xl space-y-6">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Info className="h-5 w-5" />
								Bottle Details
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid gap-4 sm:grid-cols-2">
								<div>
									<p className="mb-1 text-muted-foreground text-sm">
										Bottle Number
									</p>
									<Badge variant="outline" className="font-mono text-base">
										{bottle.label ?? `#${bottle.bottleNumber}`}
									</Badge>
								</div>
								<div>
									<p className="mb-1 text-muted-foreground text-sm">
										Current Status
									</p>
									<BottleStatusBadge status={bottle.status} />
								</div>
							</div>
							<Separator />
							<div className="grid gap-4 sm:grid-cols-2">
								<div>
									<p className="mb-1 text-muted-foreground text-sm">Created</p>
									<div className="flex items-center gap-2">
										<Calendar className="h-4 w-4 text-muted-foreground" />
										<p className="text-sm">
											{new Date(bottle.created).toLocaleDateString()}
										</p>
									</div>
								</div>
								<div>
									<p className="mb-1 text-muted-foreground text-sm">
										Last Updated
									</p>
									<div className="flex items-center gap-2">
										<Calendar className="h-4 w-4 text-muted-foreground" />
										<p className="text-sm">
											{new Date(
												bottle.updated ?? bottle.created,
											).toLocaleDateString()}
										</p>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>

					{detail && (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<QrCode className="h-5 w-5" />
									Permanent QR identity
								</CardTitle>
								<CardDescription>
									The opaque code remains with this physical bottle across
									fills.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="rounded-lg bg-muted/50 p-4">
									<p className="text-muted-foreground text-xs">
										Short public code
									</p>
									<p className="font-mono font-semibold">
										{detail.publicCode.slice(0, 8)}
									</p>
								</div>
								<div className="flex flex-wrap gap-2">
									<Button variant="outline" size="sm" asChild>
										<a
											href={`/b/${detail.publicCode}`}
											target="_blank"
											rel="noreferrer"
										>
											<ExternalLink className="mr-2 h-4 w-4" />
											Public page
										</a>
									</Button>
									<Button variant="outline" size="sm" asChild>
										<a href={`/api/v1/bottles/${id}/qr?format=svg`}>
											<Download className="mr-2 h-4 w-4" />
											Vector SVG
										</a>
									</Button>
									<Button variant="outline" size="sm" asChild>
										<a href={`/api/v1/bottles/${id}/qr?format=png&width=2048`}>
											<Download className="mr-2 h-4 w-4" />
											High-resolution PNG
										</a>
									</Button>
								</div>
							</CardContent>
						</Card>
					)}

					{isBatchLoaded && batch && (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Beer className="h-5 w-5" />
									Assigned Batch
								</CardTitle>
								<CardDescription>
									Manage this bottle via its batch
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="mb-3 flex items-center gap-2">
									<Badge variant="outline" className="font-mono">
										Batch #{batch.batchNumber}
									</Badge>
									<StatusBadge kind="batch" value={batch.status} />
								</div>
								<h3 className="mb-4 font-semibold text-lg">{batch.name}</h3>
								<Button asChild variant="default" size="sm">
									<Link href={`/admin/batch/${batch.id}`}>
										Go to batch management
									</Link>
								</Button>
							</CardContent>
						</Card>
					)}

					{detail && (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<History className="h-5 w-5" />
									Immutable event timeline
								</CardTitle>
								<CardDescription>
									{detail.fills.length} retained fill
									{detail.fills.length === 1 ? "" : "s"} ·{" "}
									{detail.events.length} audited event
									{detail.events.length === 1 ? "" : "s"}
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="space-y-3">
									{detail.events.map((event) => (
										<div
											key={event.id}
											className="border-border border-l-2 pl-4"
										>
											<div className="flex flex-wrap items-center justify-between gap-2">
												<p className="font-medium text-sm">{event.type}</p>
												<Badge variant="outline">{event.source}</Badge>
											</div>
											<p className="text-muted-foreground text-xs">
												{new Date(event.timestamp).toLocaleString()}
												{event.actorUserId
													? ` · actor ${event.actorUserId.slice(0, 8)}`
													: ""}
											</p>
										</div>
									))}
									{detail.events.length === 0 && (
										<p className="text-muted-foreground text-sm">
											No events yet.
										</p>
									)}
								</div>
							</CardContent>
						</Card>
					)}
				</div>
			</div>

			{editingBottle && (
				<EditBottleDialog
					bottle={editingBottle}
					open={!!editingBottle}
					onOpenChange={(open) => !open && setEditingBottle(null)}
					onSave={() => {
						void refetch();
						void refetchDetail();
					}}
					onRetire={(id) => retireMutation.mutate({ id })}
				/>
			)}
		</>
	);
}
