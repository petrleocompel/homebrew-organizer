import { Beer } from "lucide-react";
import { BatchList } from "@/components/batch-list";
import { CreateBatchDialog } from "@/components/create-batch-dialog";

export default function AdminBatchesPage() {
	return (
		<div>
			<header className="border-border border-b bg-card">
				<div className="container mx-auto flex items-center justify-between px-4 py-6">
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
							<Beer className="h-6 w-6 text-primary-foreground" />
						</div>
						<div>
							<h1 className="font-bold text-2xl">Batches</h1>
							<p className="text-muted-foreground text-sm">
								Lifecycle, measurements, recipe revisions, and packaging
							</p>
						</div>
					</div>
					<CreateBatchDialog />
				</div>
			</header>
			<main className="container mx-auto px-4 py-8">
				<BatchList />
			</main>
		</div>
	);
}
