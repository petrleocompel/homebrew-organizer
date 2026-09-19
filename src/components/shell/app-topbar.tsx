"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { CommandPalette } from "@/components/shell/command-palette";
import { ThemeToggle } from "@/components/theme-toggle";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { crumbsForPath } from "@/lib/admin-nav";
import type { Permission } from "@/server/domain/permissions";

export function AppTopbar({ permissions }: { permissions: Permission[] }) {
	const pathname = usePathname();
	const crumbs = crumbsForPath(pathname);

	return (
		<header className="sticky top-0 z-20 flex h-13 shrink-0 items-center gap-3 border-b bg-background/90 px-3 backdrop-blur md:px-5">
			<SidebarTrigger className="size-9 md:size-8" />
			<Separator orientation="vertical" className="hidden h-5! md:block" />
			<Breadcrumb className="min-w-0">
				<BreadcrumbList className="flex-nowrap">
					{crumbs.map((crumb, index) => {
						const isLast = index === crumbs.length - 1;
						return (
							<Fragment key={crumb.label}>
								<BreadcrumbItem
									className={isLast ? "min-w-0" : "hidden md:inline-flex"}
								>
									{isLast || !crumb.href ? (
										<BreadcrumbPage className="truncate font-semibold">
											{crumb.label}
										</BreadcrumbPage>
									) : (
										<BreadcrumbLink asChild>
											<Link href={crumb.href}>{crumb.label}</Link>
										</BreadcrumbLink>
									)}
								</BreadcrumbItem>
								{isLast ? null : (
									<BreadcrumbSeparator className="hidden md:list-item" />
								)}
							</Fragment>
						);
					})}
				</BreadcrumbList>
			</Breadcrumb>
			<div className="ml-auto flex items-center gap-2">
				<CommandPalette permissions={permissions} />
				<ThemeToggle className="hidden size-8 md:inline-flex" />
			</div>
		</header>
	);
}
