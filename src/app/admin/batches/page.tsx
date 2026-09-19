import { BatchList } from "@/components/batch-list";
import { CreateBatchDialog } from "@/components/create-batch-dialog";
import { PageHeader } from "@/components/page-header";

export default function AdminBatchesPage() {
	return (
		<div className="flex flex-col gap-6 p-4 md:p-7">
			<PageHeader
				title="Batches"
				description="Lifecycle, measurements, recipe revisions, and packaging"
				actions={<CreateBatchDialog />}
			/>
			<BatchList />
		</div>
	);
}
