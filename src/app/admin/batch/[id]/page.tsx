import { BatchMeasurements } from "@/components/batch-measurements";
import { BottleManager } from "@/components/bottle-manager";
import { PageHeader } from "@/components/page-header";

export default async function AdminBatchBottlesPage(props: {
	params: Promise<{ id: string }>;
}) {
	const params = await props.params;
	return (
		<div className="flex flex-col gap-6 p-4 md:p-7">
			<PageHeader
				title="Bottle Management"
				description="Manage bottles for this batch"
			/>
			<BottleManager batchId={params.id} />
			<BatchMeasurements batchId={params.id} />
		</div>
	);
}
