"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navLinks = [
	{ label: "Batches", href: "/admin" },
	{ label: "Bottles", href: "/admin/bottles" },
];

export function AdminNav() {
	const pathname = usePathname();

	return (
		<nav className="border-border border-b bg-card">
			<div className="container mx-auto flex gap-1 px-4">
				{navLinks.map((link) => {
					const isActive =
						link.href === "/admin"
							? pathname === "/admin"
							: pathname.startsWith(link.href);
					return (
						<Link
							key={link.href}
							href={link.href}
							className={cn(
								"border-b-2 px-3 py-2 font-medium text-sm transition-colors",
								isActive
									? "border-primary text-foreground"
									: "border-transparent text-muted-foreground hover:text-foreground",
							)}
						>
							{link.label}
						</Link>
					);
				})}
			</div>
		</nav>
	);
}
