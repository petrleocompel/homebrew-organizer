import { ShieldCheck } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { auth } from "@/server/auth";
import { getMembership } from "@/server/domain/permissions";

export default async function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		redirect("/sign-in");
	}
	const membership = await getMembership(session.user.id);
	if (!membership || membership.disabledAt) {
		redirect("/sign-in");
	}

	return (
		<div className="min-h-screen bg-background">
			<div className="border-amber-500/30 border-b bg-amber-500/10">
				<div className="container mx-auto flex items-center justify-between px-4 py-2">
					<div className="flex items-center gap-2 text-amber-700 text-sm dark:text-amber-400">
						<ShieldCheck className="h-4 w-4" />
						<span className="font-medium">Team workspace</span>
						<span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-medium text-xs uppercase">
							{membership.role}
						</span>
						<span className="text-muted-foreground">·</span>
						<span className="text-muted-foreground">{session.user.email}</span>
					</div>
					<SignOutButton />
				</div>
			</div>
			<AdminNav />
			{children}
		</div>
	);
}
