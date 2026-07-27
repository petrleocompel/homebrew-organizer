"use client";

import { Download, FileJson, Plus, Save, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";

const blankRecipe = {
	beerjson: {
		version: 1,
		recipes: [
			{
				name: "New recipe",
				type: "all grain",
				author: "",
				batch_size: { unit: "l", value: 20 },
				efficiency: { brewhouse: { unit: "%", value: 75 } },
				ingredients: { fermentable_additions: [] },
			},
		],
	},
};

function recipeName(document: Record<string, unknown>): string {
	const root = document.beerjson;
	if (!root || typeof root !== "object") return "Recipe";
	const recipes = (root as { recipes?: unknown }).recipes;
	if (!Array.isArray(recipes) || !recipes[0] || typeof recipes[0] !== "object")
		return "Recipe";
	return String((recipes[0] as { name?: unknown }).name ?? "Recipe");
}

export function RecipeWorkbench() {
	const recipes = api.recipe.list.useQuery();
	const [selectedId, setSelectedId] = useState<string | undefined>();
	const detail = api.recipe.get.useQuery(
		{ id: selectedId ?? "" },
		{ enabled: !!selectedId },
	);
	const [editor, setEditor] = useState(JSON.stringify(blankRecipe, null, 2));
	const [revisionMessage, setRevisionMessage] = useState("");
	const [fileName, setFileName] = useState("");
	const [fileContent, setFileContent] = useState("");
	const [selectedImports, setSelectedImports] = useState<number[]>([]);

	const preview = api.recipe.previewImport.useMutation({
		onSuccess(data) {
			setSelectedImports(
				data.items.filter((item) => item.valid).map((item) => item.index),
			);
		},
		onError(error) {
			toast.error(error.message);
		},
	});
	const commit = api.recipe.commitImport.useMutation({
		onSuccess: async () => {
			toast.success("Recipes imported");
			await recipes.refetch();
			preview.reset();
			setFileContent("");
			setFileName("");
		},
		onError(error) {
			toast.error(error.message);
		},
	});
	const save = api.recipe.saveRevision.useMutation({
		onSuccess: async () => {
			toast.success(selectedId ? "Recipe revision saved" : "Recipe created");
			await recipes.refetch();
			if (selectedId) await detail.refetch();
		},
		onError(error) {
			toast.error(error.message);
		},
	});

	useEffect(() => {
		if (!selectedId && recipes.data?.[0]?.id) {
			setSelectedId(recipes.data[0].id);
		}
	}, [recipes.data, selectedId]);

	useEffect(() => {
		const revision = detail.data?.revisions[0];
		if (revision) {
			setEditor(JSON.stringify(revision.beerJson, null, 2));
			setRevisionMessage("");
		}
	}, [detail.data]);

	const sections = useMemo(() => {
		try {
			const document = JSON.parse(editor) as {
				beerjson?: { recipes?: Array<Record<string, unknown>> };
			};
			return Object.entries(document.beerjson?.recipes?.[0] ?? {});
		} catch {
			return [];
		}
	}, [editor]);

	async function chooseFile(file: File | undefined) {
		if (!file) return;
		const content = await file.text();
		setFileName(file.name);
		setFileContent(content);
		preview.mutate({ fileName: file.name, content });
	}

	function saveRevision() {
		let beerJson: Record<string, unknown>;
		try {
			beerJson = JSON.parse(editor) as Record<string, unknown>;
		} catch {
			toast.error("Editor content is not valid JSON");
			return;
		}
		save.mutate({
			documentId: selectedId,
			name: recipeName(beerJson),
			beerJson,
			revisionMessage: revisionMessage || null,
		});
	}

	return (
		<div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
			<div className="space-y-4">
				<Button
					className="w-full"
					onClick={() => {
						setSelectedId(undefined);
						setEditor(JSON.stringify(blankRecipe, null, 2));
					}}
				>
					<Plus className="mr-2 h-4 w-4" />
					New recipe
				</Button>
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Recipe documents</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						{recipes.data?.map((recipe) => (
							<button
								key={recipe.id}
								type="button"
								onClick={() => setSelectedId(recipe.id)}
								className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
									selectedId === recipe.id
										? "border-primary bg-primary/5"
										: "hover:border-primary/40"
								}`}
							>
								<span className="block truncate font-medium">
									{recipe.name}
								</span>
								<span className="text-muted-foreground text-xs">
									Revision {recipe.revision ?? "—"}
								</span>
							</button>
						))}
						{recipes.data?.length === 0 && (
							<p className="text-muted-foreground text-sm">No recipes yet.</p>
						)}
					</CardContent>
				</Card>
			</div>

			<div className="space-y-6">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Upload className="h-5 w-5" />
							BeerJSON / BeerXML import
						</CardTitle>
						<CardDescription>
							Validate up to 100 recipes before committing any selected item.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<Input
							type="file"
							accept=".json,.beer.json,.xml,application/json,application/xml,text/xml"
							onChange={(event) => chooseFile(event.target.files?.[0])}
						/>
						{preview.data && (
							<div className="space-y-2 rounded-lg border p-3">
								<div className="flex items-center justify-between">
									<p className="font-medium">
										{fileName} · {preview.data.format}
									</p>
									<Badge variant="outline">
										{preview.data.items.length} recipe(s)
									</Badge>
								</div>
								{preview.data.items.map((item) => (
									<label
										key={item.index}
										className="flex items-start gap-3 rounded border p-2"
									>
										<input
											type="checkbox"
											className="mt-1"
											disabled={!item.valid}
											checked={selectedImports.includes(item.index)}
											onChange={(event) =>
												setSelectedImports((current) =>
													event.target.checked
														? [...current, item.index]
														: current.filter((index) => index !== item.index),
												)
											}
										/>
										<span className="min-w-0">
											<span className="block font-medium text-sm">
												{item.name}
											</span>
											<span
												className={
													item.valid
														? "text-emerald-600 text-xs"
														: "text-destructive text-xs"
												}
											>
												{item.valid
													? "Valid"
													: item.errors.join(" · ") || "Invalid"}
											</span>
										</span>
									</label>
								))}
								<Button
									disabled={selectedImports.length === 0 || commit.isPending}
									onClick={() =>
										commit.mutate({
											fileName,
											content: fileContent,
											selectedIndexes: selectedImports,
											revisionMessage: "Imported from Organizer",
										})
									}
								>
									Import selected
								</Button>
							</div>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<div className="flex flex-wrap items-start justify-between gap-3">
							<div>
								<CardTitle className="flex items-center gap-2">
									<FileJson className="h-5 w-5" />
									Complete canonical recipe
								</CardTitle>
								<CardDescription>
									All official sections, units, timings, and optional fields
									remain editable in the pinned BeerJSON document.
								</CardDescription>
							</div>
							{selectedId && (
								<div className="flex gap-2">
									<Button variant="outline" size="sm" asChild>
										<a
											href={`/api/v1/recipes/${selectedId}/export?format=beerjson`}
										>
											<Download className="mr-2 h-4 w-4" />
											BeerJSON
										</a>
									</Button>
									<Button variant="outline" size="sm" asChild>
										<a
											href={`/api/v1/recipes/${selectedId}/export?format=beerxml`}
										>
											<Download className="mr-2 h-4 w-4" />
											BeerXML
										</a>
									</Button>
								</div>
							)}
						</div>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-2">
							<Label htmlFor="recipe-document">BeerJSON document</Label>
							<Textarea
								id="recipe-document"
								value={editor}
								onChange={(event) => setEditor(event.target.value)}
								className="min-h-[420px] font-mono text-xs"
								spellCheck={false}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="revision-message">Revision message</Label>
							<Input
								id="revision-message"
								value={revisionMessage}
								onChange={(event) => setRevisionMessage(event.target.value)}
								placeholder="What changed?"
							/>
						</div>
						<div className="flex justify-end">
							<Button onClick={saveRevision} disabled={save.isPending}>
								<Save className="mr-2 h-4 w-4" />
								{selectedId ? "Save immutable revision" : "Create recipe"}
							</Button>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">Section preview</CardTitle>
						<CardDescription>
							Collapsible view of the document currently in the editor.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2">
						{sections.map(([name, value]) => (
							<details key={name} className="rounded border p-3">
								<summary className="cursor-pointer font-medium">{name}</summary>
								<pre className="mt-3 overflow-x-auto text-xs">
									{JSON.stringify(value, null, 2)}
								</pre>
							</details>
						))}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
