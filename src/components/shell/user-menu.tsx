"use client";

import { Ellipsis, LogOut, Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import type { ShellUser } from "@/components/shell/app-sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";

function initials(name: string, email: string) {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	const letters =
		parts.length > 1
			? `${parts[0]?.[0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`
			: (parts[0] ?? email).slice(0, 2);
	return letters.toUpperCase();
}

export function UserMenu({ user }: { user: ShellUser }) {
	const router = useRouter();
	const { isMobile } = useSidebar();
	const { resolvedTheme, setTheme } = useTheme();
	const isDark = resolvedTheme === "dark";

	const handleSignOut = async () => {
		await authClient.signOut();
		router.push("/sign-in");
	};

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton size="lg" aria-label="User menu">
							<Avatar className="size-8">
								<AvatarFallback className="font-semibold text-xs">
									{initials(user.name, user.email)}
								</AvatarFallback>
							</Avatar>
							<span className="grid flex-1 text-left leading-tight">
								<span className="truncate font-semibold text-sm">
									{user.name || user.email}
								</span>
								<span className="truncate text-muted-foreground text-xs capitalize">
									{user.role}
								</span>
							</span>
							<Ellipsis className="ml-auto size-4" aria-hidden="true" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="min-w-56"
						side={isMobile ? "top" : "right"}
						align="end"
					>
						<DropdownMenuLabel className="font-normal">
							<span className="block truncate font-medium text-sm">
								{user.email}
							</span>
							<span className="block text-muted-foreground text-xs capitalize">
								{user.role}
							</span>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onSelect={() => setTheme(isDark ? "light" : "dark")}
						>
							{isDark ? (
								<Sun aria-hidden="true" />
							) : (
								<Moon aria-hidden="true" />
							)}
							{isDark ? "Light mode" : "Dark mode"}
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem onSelect={handleSignOut}>
							<LogOut aria-hidden="true" />
							Sign out
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
