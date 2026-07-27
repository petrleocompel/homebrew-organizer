"use client";

import {
	Download,
	Move,
	Plus,
	Printer,
	Redo2,
	Save,
	Undo2,
	Upload,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { api } from "@/trpc/react";

type QrElement = {
	id: string;
	type: "qr";
	xMm: number;
	yMm: number;
	widthMm: number;
	heightMm: number;
};
type TextElement = {
	id: string;
	type: "text";
	token: string;
	xMm: number;
	yMm: number;
	widthMm: number;
	heightMm: number;
	fontFamily: "Noto Sans";
	fontSizePt: number;
	fontWeight: 400 | 700;
	color: string;
	align: "left" | "center" | "right";
	wrap: boolean;
	visible: boolean;
};
type Element = QrElement | TextElement;

const initialElements: Element[] = [
	{
		id: "qr",
		type: "qr",
		xMm: 51,
		yMm: 4,
		widthMm: 25,
		heightMm: 25,
	},
	{
		id: "bottle-number",
		type: "text",
		token: "bottle.number",
		xMm: 4,
		yMm: 5,
		widthMm: 42,
		heightMm: 9,
		fontFamily: "Noto Sans",
		fontSizePt: 18,
		fontWeight: 700,
		color: "#000000",
		align: "left",
		wrap: false,
		visible: true,
	},
	{
		id: "beer-name",
		type: "text",
		token: "beer.name",
		xMm: 4,
		yMm: 17,
		widthMm: 42,
		heightMm: 13,
		fontFamily: "Noto Sans",
		fontSizePt: 11,
		fontWeight: 400,
		color: "#000000",
		align: "left",
		wrap: true,
		visible: true,
	},
];

const tokens = [
	"bottle.number",
	"bottle.displayName",
	"batch.number",
	"beer.name",
	"beer.style",
	"beer.abv",
	"fill.date",
	"fill.expectedReadyDate",
	"qr.shortCode",
];

const sample: Record<string, string> = {
	"bottle.number": "#24",
	"bottle.displayName": "Cellar bottle",
	"batch.number": "#108",
	"beer.name": "Jantarový ležák",
	"beer.style": "Czech Amber Lager",
	"beer.abv": "5.2 %",
	"fill.date": "2026-07-27",
	"fill.expectedReadyDate": "2026-08-17",
	"qr.shortCode": "ab3d5f7h",
};

function clamp(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), max);
}

async function fileBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(reader.error);
		reader.onload = () =>
			resolve(String(reader.result).replace(/^data:[^,]+,/, ""));
		reader.readAsDataURL(file);
	});
}

export function LabelStudio() {
	const templates = api.label.listTemplates.useQuery();
	const runs = api.label.listPrintRuns.useQuery();
	const bottleQuery = api.bottle.getAll.useQuery();
	const batchQuery = api.batch.getAll.useQuery();
	const [name, setName] = useState("Bottle identity");
	const [type, setType] = useState<"identity" | "batch">("identity");
	const [file, setFile] = useState<File>();
	const [backgroundUrl, setBackgroundUrl] = useState<string>();
	const [elements, setElements] = useState<Element[]>(initialElements);
	const [selectedId, setSelectedId] = useState("qr");
	const [undo, setUndo] = useState<Element[][]>([]);
	const [redo, setRedo] = useState<Element[][]>([]);
	const [selectedTemplate, setSelectedTemplate] = useState("");
	const [selectedBatch, setSelectedBatch] = useState("none");
	const [selectedBottles, setSelectedBottles] = useState<string[]>([]);
	const [confirmDuplicate, setConfirmDuplicate] = useState(false);
	const editorRef = useRef<HTMLDivElement>(null);
	const drag = useRef<{
		id: string;
		startX: number;
		startY: number;
		before: Element[];
	} | null>(null);

	const createTemplate = api.label.createTemplate.useMutation({
		onSuccess: async () => {
			toast.success("Label template created");
			await templates.refetch();
		},
		onError(error) {
			toast.error(error.message);
		},
	});
	const createRuns = api.label.createPrintRuns.useMutation({
		onSuccess: async (created) => {
			toast.success(
				`Created ${created.length} print run${created.length === 1 ? "" : "s"}`,
			);
			await runs.refetch();
		},
		onError(error) {
			if (error.message.toLowerCase().includes("printed before")) {
				setConfirmDuplicate(true);
			}
			toast.error(error.message);
		},
	});

	useEffect(() => {
		if (!file) {
			setBackgroundUrl(undefined);
			return;
		}
		const url = URL.createObjectURL(file);
		setBackgroundUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [file]);

	useEffect(() => {
		const onMove = (event: PointerEvent) => {
			const state = drag.current;
			const rect = editorRef.current?.getBoundingClientRect();
			if (!state || !rect) return;
			const dx = ((event.clientX - state.startX) / rect.width) * 80;
			const dy = ((event.clientY - state.startY) / rect.height) * 80;
			setElements(
				state.before.map((element) =>
					element.id === state.id
						? {
								...element,
								xMm: clamp(element.xMm + dx, 0, 80 - element.widthMm),
								yMm: clamp(element.yMm + dy, 0, 80 - element.heightMm),
							}
						: element,
				),
			);
		};
		const onUp = () => {
			const completedDrag = drag.current;
			if (completedDrag) {
				setUndo((history) => [...history.slice(-49), completedDrag.before]);
				setRedo([]);
			}
			drag.current = null;
		};
		window.addEventListener("pointermove", onMove);
		window.addEventListener("pointerup", onUp);
		return () => {
			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("pointerup", onUp);
		};
	}, []);

	useEffect(() => {
		if (type === "identity") {
			setElements((current) =>
				current.filter(
					(element) =>
						element.type === "qr" ||
						(!element.token.startsWith("batch.") &&
							!element.token.startsWith("beer.") &&
							!element.token.startsWith("fill.")),
				),
			);
		}
	}, [type]);

	const selected = elements.find((element) => element.id === selectedId);
	const qr = elements.find((element) => element.type === "qr") as
		| QrElement
		| undefined;
	const qrSafe =
		!!qr &&
		qr.widthMm >= 20 &&
		qr.heightMm >= 20 &&
		Math.abs(qr.widthMm - qr.heightMm) < 0.01;
	const availableTokens =
		type === "identity"
			? tokens.filter(
					(token) =>
						!token.startsWith("batch.") &&
						!token.startsWith("beer.") &&
						!token.startsWith("fill."),
				)
			: tokens;

	function mutateElements(next: Element[]) {
		setUndo((history) => [...history.slice(-49), elements]);
		setRedo([]);
		setElements(next);
	}

	function updateSelected(patch: Partial<Element>) {
		mutateElements(
			elements.map((element) =>
				element.id === selectedId
					? ({ ...element, ...patch } as Element)
					: element,
			),
		);
	}

	function undoAction() {
		const previous = undo.at(-1);
		if (!previous) return;
		setRedo((history) => [elements, ...history].slice(0, 50));
		setElements(previous);
		setUndo((history) => history.slice(0, -1));
	}

	function redoAction() {
		const next = redo[0];
		if (!next) return;
		setUndo((history) => [...history, elements].slice(-50));
		setElements(next);
		setRedo((history) => history.slice(1));
	}

	async function saveTemplate() {
		if (!file) {
			toast.error("Choose a one-page square PDF background");
			return;
		}
		if (!qrSafe) {
			toast.error("QR must be square and at least 20 mm");
			return;
		}
		createTemplate.mutate({
			name,
			type,
			backgroundPdfBase64: await fileBase64(file),
			elements,
		});
	}

	const selectedBottleSet = useMemo(
		() => new Set(selectedBottles),
		[selectedBottles],
	);

	return (
		<div className="space-y-8">
			<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
				<Card>
					<CardHeader>
						<div className="flex flex-wrap items-start justify-between gap-3">
							<div>
								<CardTitle>80 × 80 mm overlay editor</CardTitle>
								<CardDescription>
									The PDF background stays locked; output embeds its vector
									page.
								</CardDescription>
							</div>
							<div className="flex gap-1">
								<Button
									variant="outline"
									size="sm"
									onClick={undoAction}
									disabled={undo.length === 0}
								>
									<Undo2 className="h-4 w-4" />
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={redoAction}
									disabled={redo.length === 0}
								>
									<Redo2 className="h-4 w-4" />
								</Button>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<div
							ref={editorRef}
							className="relative mx-auto aspect-square w-full max-w-[640px] overflow-hidden border bg-white shadow-sm"
						>
							{backgroundUrl ? (
								<object
									data={`${backgroundUrl}#toolbar=0&navpanes=0&scrollbar=0`}
									type="application/pdf"
									aria-label="Locked PDF background"
									className="pointer-events-none absolute inset-0 h-full w-full"
								/>
							) : (
								<div className="absolute inset-0 flex items-center justify-center bg-[length:20px_20px] bg-[linear-gradient(45deg,#f4f4f5_25%,transparent_25%),linear-gradient(-45deg,#f4f4f5_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f4f4f5_75%),linear-gradient(-45deg,transparent_75%,#f4f4f5_75%)] text-muted-foreground">
									<Upload className="mr-2 h-5 w-5" />
									Choose a square PDF
								</div>
							)}
							<svg
								viewBox="0 0 80 80"
								className="absolute inset-0 h-full w-full select-none"
								aria-label="Label overlays in millimetres"
							>
								<title>Label overlays in millimetres</title>
								{elements.map((element) => (
									<g
										key={element.id}
										onPointerDown={(event) => {
											event.preventDefault();
											setSelectedId(element.id);
											drag.current = {
												id: element.id,
												startX: event.clientX,
												startY: event.clientY,
												before: elements,
											};
										}}
										className="cursor-move"
									>
										{element.type === "qr" ? (
											<>
												<rect
													x={element.xMm}
													y={element.yMm}
													width={element.widthMm}
													height={element.heightMm}
													fill="white"
													stroke={
														element.id === selectedId
															? qrSafe
																? "#2563eb"
																: "#dc2626"
															: "#111827"
													}
													strokeWidth="0.4"
												/>
												<rect
													x={element.xMm + element.widthMm * 0.14}
													y={element.yMm + element.heightMm * 0.14}
													width={element.widthMm * 0.72}
													height={element.heightMm * 0.72}
													fill="#111827"
												/>
												<rect
													x={element.xMm + element.widthMm * 0.03}
													y={element.yMm + element.heightMm * 0.03}
													width={element.widthMm * 0.94}
													height={element.heightMm * 0.94}
													fill="none"
													stroke="#f97316"
													strokeWidth="0.25"
													strokeDasharray="1 0.6"
												/>
												<text
													x={element.xMm + element.widthMm / 2}
													y={element.yMm + element.heightMm / 2 + 0.8}
													textAnchor="middle"
													fontSize="2.4"
													fill="white"
												>
													QR · M
												</text>
											</>
										) : (
											<>
												<rect
													x={element.xMm}
													y={element.yMm}
													width={element.widthMm}
													height={element.heightMm}
													fill="rgba(255,255,255,.75)"
													stroke={
														element.id === selectedId ? "#2563eb" : "#64748b"
													}
													strokeWidth="0.3"
													strokeDasharray="1 0.6"
												/>
												<text
													x={
														element.align === "center"
															? element.xMm + element.widthMm / 2
															: element.align === "right"
																? element.xMm + element.widthMm - 1
																: element.xMm + 1
													}
													y={element.yMm + Math.min(element.heightMm - 1, 4)}
													textAnchor={
														element.align === "center"
															? "middle"
															: element.align === "right"
																? "end"
																: "start"
													}
													fontSize={clamp(element.fontSizePt * 0.35, 1.5, 7)}
													fontWeight={element.fontWeight}
													fill={element.color}
												>
													{sample[element.token] ?? element.token}
												</text>
											</>
										)}
									</g>
								))}
								<line
									x1="40"
									y1="0"
									x2="40"
									y2="80"
									stroke="#0ea5e9"
									strokeWidth=".12"
									strokeDasharray=".8 .8"
									opacity=".45"
								/>
								<line
									x1="0"
									y1="40"
									x2="80"
									y2="40"
									stroke="#0ea5e9"
									strokeWidth=".12"
									strokeDasharray=".8 .8"
									opacity=".45"
								/>
							</svg>
						</div>
						<div className="mt-3 flex items-center justify-center gap-2 text-xs">
							<Move className="h-3.5 w-3.5" />
							Drag overlays · coordinates are stored in millimetres
							<Badge variant={qrSafe ? "outline" : "destructive"}>
								QR {qrSafe ? "scan-safe" : "unsafe"}
							</Badge>
						</div>
					</CardContent>
				</Card>

				<div className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Template</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid gap-2">
								<Label htmlFor="template-name">Name</Label>
								<Input
									id="template-name"
									value={name}
									onChange={(event) => setName(event.target.value)}
								/>
							</div>
							<div className="grid gap-2">
								<Label>Type</Label>
								<Select
									value={type}
									onValueChange={(value) =>
										setType(value as "identity" | "batch")
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="identity">Identity</SelectItem>
										<SelectItem value="batch">Batch</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="background">Square PDF background</Label>
								<Input
									id="background"
									type="file"
									accept="application/pdf,.pdf"
									onChange={(event) => setFile(event.target.files?.[0])}
								/>
							</div>
							<Button
								className="w-full"
								onClick={saveTemplate}
								disabled={!file || !qrSafe || createTemplate.isPending}
							>
								<Save className="mr-2 h-4 w-4" />
								Save template version
							</Button>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="text-base">Selected overlay</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							{selected ? (
								<>
									<div className="grid grid-cols-2 gap-2">
										{(["xMm", "yMm", "widthMm", "heightMm"] as const).map(
											(key) => (
												<div key={key} className="grid gap-1">
													<Label htmlFor={key} className="text-xs">
														{key.replace("Mm", "")} (mm)
													</Label>
													<Input
														id={key}
														type="number"
														step="0.1"
														value={selected[key]}
														onChange={(event) =>
															updateSelected({
																[key]: Number(event.target.value),
															})
														}
													/>
												</div>
											),
										)}
									</div>
									{selected.type === "text" && (
										<>
											<div className="grid gap-1">
												<Label className="text-xs">Token</Label>
												<Select
													value={selected.token}
													onValueChange={(token) => updateSelected({ token })}
												>
													<SelectTrigger>
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														{availableTokens.map((token) => (
															<SelectItem key={token} value={token}>
																{token}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</div>
											<div className="grid grid-cols-2 gap-2">
												<div className="grid gap-1">
													<Label className="text-xs">Font size (pt)</Label>
													<Input
														type="number"
														value={selected.fontSizePt}
														onChange={(event) =>
															updateSelected({
																fontSizePt: Number(event.target.value),
															})
														}
													/>
												</div>
												<div className="grid gap-1">
													<Label className="text-xs">Color</Label>
													<Input
														type="color"
														value={selected.color}
														onChange={(event) =>
															updateSelected({ color: event.target.value })
														}
													/>
												</div>
											</div>
										</>
									)}
								</>
							) : (
								<p className="text-muted-foreground text-sm">
									Select an overlay.
								</p>
							)}
							<Button
								variant="outline"
								className="w-full"
								onClick={() => {
									const element: TextElement = {
										id: crypto.randomUUID(),
										type: "text",
										token: availableTokens[0] ?? "bottle.number",
										xMm: 4,
										yMm: 35,
										widthMm: 40,
										heightMm: 8,
										fontFamily: "Noto Sans",
										fontSizePt: 10,
										fontWeight: 400,
										color: "#000000",
										align: "left",
										wrap: true,
										visible: true,
									};
									mutateElements([...elements, element]);
									setSelectedId(element.id);
								}}
							>
								<Plus className="mr-2 h-4 w-4" />
								Add text field
							</Button>
						</CardContent>
					</Card>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Printer className="h-5 w-5" />
						Print-run wizard
					</CardTitle>
					<CardDescription>
						Each generated page is exactly 80 × 80 mm. Roll imposition is left
						to the printer.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-5">
					<div className="grid gap-4 md:grid-cols-2">
						<div className="grid gap-2">
							<Label>Template</Label>
							<Select
								value={selectedTemplate}
								onValueChange={setSelectedTemplate}
							>
								<SelectTrigger>
									<SelectValue placeholder="Choose a template" />
								</SelectTrigger>
								<SelectContent>
									{templates.data?.map(({ template }) => (
										<SelectItem key={template.id} value={template.id}>
											{template.name} · {template.type}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="grid gap-2">
							<Label>Batch fields</Label>
							<Select value={selectedBatch} onValueChange={setSelectedBatch}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">Use each active fill</SelectItem>
									{batchQuery.data?.map((batch) => (
										<SelectItem key={batch.id} value={batch.id}>
											#{batch.batchNumber} {batch.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<div>
						<div className="mb-2 flex items-center justify-between">
							<Label>Bottles ({selectedBottles.length} selected)</Label>
							<Button
								variant="ghost"
								size="sm"
								onClick={() =>
									setSelectedBottles(
										selectedBottles.length === bottleQuery.data?.length
											? []
											: (bottleQuery.data?.map((bottle) => bottle.id) ?? []),
									)
								}
							>
								Toggle all
							</Button>
						</div>
						<div className="grid max-h-72 gap-2 overflow-y-auto rounded border p-3 sm:grid-cols-2 lg:grid-cols-4">
							{bottleQuery.data?.map((bottle) => (
								<label
									key={bottle.id}
									className="flex items-center gap-2 rounded border p-2 text-sm"
								>
									<input
										type="checkbox"
										checked={selectedBottleSet.has(bottle.id)}
										onChange={(event) =>
											setSelectedBottles((current) =>
												event.target.checked
													? [...current, bottle.id]
													: current.filter((id) => id !== bottle.id),
											)
										}
									/>
									<span className="truncate">
										{bottle.displayName ??
											bottle.label ??
											`#${bottle.bottleNumber}`}
									</span>
									{bottle.retiredAt && (
										<Badge variant="destructive">retired</Badge>
									)}
								</label>
							))}
						</div>
					</div>
					{confirmDuplicate && (
						<label className="flex items-center gap-2 rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
							<input
								type="checkbox"
								checked={confirmDuplicate}
								onChange={(event) => setConfirmDuplicate(event.target.checked)}
							/>
							I explicitly confirm duplicate identity-label printing.
						</label>
					)}
					<Button
						disabled={
							!selectedTemplate ||
							selectedBottles.length === 0 ||
							createRuns.isPending
						}
						onClick={() =>
							createRuns.mutate({
								templateId: selectedTemplate,
								bottleIds: selectedBottles,
								batchId: selectedBatch === "none" ? null : selectedBatch,
								confirmDuplicateIdentity: confirmDuplicate,
							})
						}
					>
						<Printer className="mr-2 h-4 w-4" />
						Create print run
					</Button>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Download history</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						{runs.data?.map((run) => (
							<div
								key={run.id}
								className="flex flex-wrap items-center justify-between gap-3 rounded border p-3"
							>
								<div>
									<p className="font-medium">
										Run {run.runNumber}/{run.runCount}
									</p>
									<p className="text-muted-foreground text-sm">
										{run.itemCount} stickers ·{" "}
										{new Date(run.createdAt).toLocaleString()}
									</p>
								</div>
								<div className="flex gap-2">
									<Button variant="outline" size="sm" asChild>
										<a
											href={`/api/v1/print-runs/${run.id}/download?format=pdf`}
										>
											<Download className="mr-2 h-4 w-4" />
											PDF
										</a>
									</Button>
									<Button variant="outline" size="sm" asChild>
										<a
											href={`/api/v1/print-runs/${run.id}/download?format=zip`}
										>
											<Download className="mr-2 h-4 w-4" />
											ZIP + CSV
										</a>
									</Button>
								</div>
							</div>
						))}
						{runs.data?.length === 0 && (
							<p className="text-muted-foreground text-sm">
								No print runs yet.
							</p>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
