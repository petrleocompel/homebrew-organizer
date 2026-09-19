"use client";

import { Beer } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserMenu } from "@/components/shell/user-menu";
import { Badge } from "@/components/ui/badge";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
	useSidebar,
} from "@/components/ui/sidebar";
import { isNavItemActive, visibleNavGroups } from "@/lib/admin-nav";
import type { BreweryRole } from "@/server/db/schema";
import type { Permission } from "@/server/domain/permissions";

export interface ShellUser {
	name: string;
	email: string;
	role: BreweryRole;
}

export function AppSidebar({
	user,
	permissions,
}: {
	user: ShellUser;
	permissions: Permission[];
}) {
	const pathname = usePathname();
	const { isMobile, setOpenMobile } = useSidebar();
	const groups = visibleNavGroups(permissions);
	const readOnly = !permissions.includes("bottle:fill");

	return (
		<Sidebar collapsible="icon">
			<SidebarHeader className="border-sidebar-border border-b">
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size="lg" asChild>
							<Link href="/admin">
								<span className="flex aspect-square size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
									<Beer className="size-4" aria-hidden="true" />
								</span>
								<span className="grid flex-1 text-left leading-tight">
									<span className="truncate font-semibold text-sm">
										Homebrew Organizer
									</span>
									<span className="truncate font-mono text-[0.6875rem] text-muted-foreground">
										Team workspace
									</span>
								</span>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				{groups.map((group) => (
					<SidebarGroup key={group.label}>
						<SidebarGroupLabel className="font-mono text-[0.625rem] uppercase tracking-widest">
							{group.label}
						</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								{group.items.map((item) => (
									<SidebarMenuItem key={item.href}>
										<SidebarMenuButton
											asChild
											isActive={isNavItemActive(item.href, pathname)}
											tooltip={item.label}
											className="h-9 font-medium data-[active=true]:font-semibold max-md:h-12 max-md:text-base"
										>
											<Link
												href={item.href}
												onClick={() => {
													if (isMobile) setOpenMobile(false);
												}}
											>
												<item.icon aria-hidden="true" />
												<span>{item.label}</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								))}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				))}
				{readOnly ? (
					<div className="px-4 group-data-[collapsible=icon]:hidden">
						<Badge className="border-transparent bg-foreground/10 text-foreground">
							Read only
						</Badge>
					</div>
				) : null}
			</SidebarContent>
			<SidebarFooter className="border-sidebar-border border-t">
				<UserMenu user={user} />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
