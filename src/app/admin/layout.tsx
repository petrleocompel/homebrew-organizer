import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { AppTopbar } from "@/components/shell/app-topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { auth } from "@/server/auth";
import { getMembership, permissionsForRole } from "@/server/domain/permissions";

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
	const permissions = permissionsForRole(membership.role);

	return (
		<SidebarProvider>
			<AppSidebar
				user={{
					name: session.user.name,
					email: session.user.email,
					role: membership.role,
				}}
				permissions={permissions}
			/>
			<SidebarInset className="min-w-0">
				<AppTopbar permissions={permissions} />
				{children}
			</SidebarInset>
		</SidebarProvider>
	);
}
