import {
	Beer,
	FlaskConical,
	LayoutDashboard,
	type LucideIcon,
	ScrollText,
	Tags,
	Users,
} from "lucide-react";
import type { Permission } from "@/server/domain/permissions";

export interface AdminNavItem {
	label: string;
	href: string;
	icon: LucideIcon;
	/** Every listed permission is needed, otherwise the item is not rendered. */
	requires: readonly Permission[];
}

export interface AdminNavGroup {
	label: string;
	items: readonly AdminNavItem[];
}

export const adminNavGroups: readonly AdminNavGroup[] = [
	{
		label: "Brewery",
		items: [
			{
				label: "Overview",
				href: "/admin",
				icon: LayoutDashboard,
				requires: ["private:read"],
			},
			{
				label: "Batches",
				href: "/admin/batches",
				icon: Beer,
				requires: ["private:read"],
			},
			{
				label: "Bottles",
				href: "/admin/bottles",
				icon: FlaskConical,
				requires: ["private:read"],
			},
			{
				label: "Recipes",
				href: "/admin/recipes",
				icon: ScrollText,
				requires: ["private:read"],
			},
		],
	},
	{
		label: "Labels",
		items: [
			{
				label: "Templates & print",
				href: "/admin/labels",
				icon: Tags,
				requires: ["label:manage"],
			},
		],
	},
	{
		label: "Administration",
		items: [
			{
				label: "Team",
				href: "/admin/team",
				icon: Users,
				requires: ["team:manage"],
			},
		],
	},
];

/** Navigation is generated from permissions, not from the role name. */
export function visibleNavGroups(
	permissions: readonly Permission[],
): AdminNavGroup[] {
	return adminNavGroups
		.map((group) => ({
			...group,
			items: group.items.filter((item) =>
				item.requires.every((permission) => permissions.includes(permission)),
			),
		}))
		.filter((group) => group.items.length > 0);
}

export function isNavItemActive(href: string, pathname: string): boolean {
	if (href === "/admin") return pathname === "/admin";
	if (pathname === href || pathname.startsWith(`${href}/`)) return true;
	// Detail routes are singular (/admin/batch/{id}) while lists are plural.
	const singular = href.replace(/s$/, "");
	return singular !== href && pathname.startsWith(`${singular}/`);
}

const sectionLabels: Record<string, { label: string; href: string }> = {
	batches: { label: "Batches", href: "/admin/batches" },
	batch: { label: "Batches", href: "/admin/batches" },
	bottles: { label: "Bottles", href: "/admin/bottles" },
	bottle: { label: "Bottles", href: "/admin/bottles" },
	recipes: { label: "Recipes", href: "/admin/recipes" },
	labels: { label: "Labels", href: "/admin/labels" },
	team: { label: "Team", href: "/admin/team" },
};

const detailLabels: Record<string, string> = {
	batch: "Batch detail",
	bottle: "Bottle detail",
};

export interface Crumb {
	label: string;
	href?: string;
}

export function crumbsForPath(pathname: string): Crumb[] {
	const [, , section, detail] = pathname.split("/");
	if (!section) return [{ label: "Overview" }];
	const known = sectionLabels[section];
	if (!known) return [{ label: "Overview", href: "/admin" }];
	if (detail && detailLabels[section]) {
		return [known, { label: detailLabels[section] }];
	}
	return [{ label: known.label }];
}
