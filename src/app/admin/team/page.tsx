import { PageHeader } from "@/components/page-header";
import { TeamManager } from "@/components/team-manager";

export default function TeamPage() {
	return (
		<div className="flex flex-col gap-6 p-4 md:p-7">
			<PageHeader
				title="Team"
				description="Roles, invitations, session revocation, and actor activity"
			/>
			<TeamManager />
		</div>
	);
}
