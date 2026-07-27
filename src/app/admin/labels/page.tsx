import { PanelsTopLeft } from "lucide-react";
import { LabelStudio } from "@/components/label-studio";

export default function LabelsPage() {
	return (
		<div>
			<header className="border-border border-b bg-card">
				<div className="container mx-auto flex items-center gap-3 px-4 py-6">
					<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
						<PanelsTopLeft className="h-6 w-6 text-primary-foreground" />
					</div>
					<div>
						<h1 className="font-bold text-2xl">Labels</h1>
						<p className="text-muted-foreground text-sm">
							PDF templates, scan-safe QR overlays, and 80 × 80 mm exports
						</p>
					</div>
				</div>
			</header>
			<main className="container mx-auto px-4 py-8">
				<LabelStudio />
			</main>
		</div>
	);
}
