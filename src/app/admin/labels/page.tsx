import { LabelStudio } from "@/components/label-studio";
import { PageHeader } from "@/components/page-header";

export default function LabelsPage() {
	return (
		<div className="flex flex-col gap-6 p-4 md:p-7">
			<PageHeader
				title="Labels"
				description="PDF templates, scan-safe QR overlays, and 80 × 80 mm exports"
			/>
			<LabelStudio />
		</div>
	);
}
