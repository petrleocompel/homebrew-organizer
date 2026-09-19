import { BatchList } from "@/components/batch-list";
import { CreateBatchDialog } from "@/components/create-batch-dialog";
import { PageHeader } from "@/components/page-header";

export default function AdminHomePage() {
	return (
		<div className="flex flex-col gap-6 p-4 md:p-7">
			<PageHeader
				title="Dashboard"
				description="Brewery status and recent batches. Mutations are audited; public data is curated separately."
				actions={<CreateBatchDialog />}
			/>
			<BatchList />
		</div>
	);
}
