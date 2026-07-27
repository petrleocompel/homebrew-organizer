import { Users } from "lucide-react";
import { TeamManager } from "@/components/team-manager";

export default function TeamPage() {
	return (
		<div>
			<header className="border-border border-b bg-card">
				<div className="container mx-auto flex items-center gap-3 px-4 py-6">
					<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
						<Users className="h-6 w-6 text-primary-foreground" />
					</div>
					<div>
						<h1 className="font-bold text-2xl">Team</h1>
						<p className="text-muted-foreground text-sm">
							Roles, invitations, session revocation, and actor activity
						</p>
					</div>
				</div>
			</header>
			<main className="container mx-auto px-4 py-8">
				<TeamManager />
			</main>
		</div>
	);
}
