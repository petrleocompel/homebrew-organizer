"use client";

import { Moon, Search, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { visibleNavGroups } from "@/lib/admin-nav";
import type { Permission } from "@/server/domain/permissions";
import { api } from "@/trpc/react";

export function CommandPalette({ permissions }: { permissions: Permission[] }) {
	const router = useRouter();
	const { resolvedTheme, setTheme } = useTheme();
	const [open, setOpen] = useState(false);
	// Lists are only fetched once the palette is opened for the first time.
	const [armed, setArmed] = useState(false);
	const { data: bottles = [] } = api.bottle.getAll.useQuery(undefined, {
		enabled: armed,
	});
	const { data: batches = [] } = api.batch.getAll.useQuery(undefined, {
		enabled: armed,
	});

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
				event.preventDefault();
				setArmed(true);
				setOpen((value) => !value);
			}
		};
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, []);

	const go = (href: string) => {
		setOpen(false);
		router.push(href);
	};
	const openPalette = () => {
		setArmed(true);
		setOpen(true);
	};
	const isDark = resolvedTheme === "dark";

	return (
		<>
			<Button
				type="button"
				variant="outline"
				onClick={openPalette}
				className="hidden h-8 w-62 justify-start gap-2 bg-muted/60 px-2.5 font-normal text-muted-foreground md:inline-flex"
			>
				<Search className="size-3.5" aria-hidden="true" />
				<span className="truncate text-xs">Search batch, bottle, code…</span>
				<kbd className="ml-auto rounded-xs border bg-card px-1 font-medium font-mono text-[0.625rem]">
					⌘K
				</kbd>
			</Button>
			<Button
				type="button"
				variant="outline"
				size="icon"
				onClick={openPalette}
				className="md:hidden"
			>
				<Search className="size-4" aria-hidden="true" />
				<span className="sr-only">Search</span>
			</Button>
			<CommandDialog
				open={open}
				onOpenChange={setOpen}
				title="Search"
				description="Find a bottle by number or short code, a batch, or jump to a page."
			>
				<CommandInput placeholder="Bottle number, short code, batch…" />
				<CommandList>
					<CommandEmpty>Nothing matches.</CommandEmpty>
					<CommandGroup heading="Bottles">
						{bottles.map((bottle) => (
							<CommandItem
								key={bottle.id}
								value={`bottle ${bottle.bottleNumber} ${bottle.shortPublicCode ?? ""} ${bottle.displayName ?? ""}`}
								onSelect={() => go(`/admin/bottle/${bottle.id}`)}
							>
								<span className="w-10 font-mono font-semibold">
									{bottle.bottleNumber}
								</span>
								<span className="truncate">
									{bottle.displayName ?? `Bottle ${bottle.bottleNumber}`}
									{bottle.shortPublicCode ? (
										<span className="ml-2 font-mono text-muted-foreground text-xs">
											{bottle.shortPublicCode}
										</span>
									) : null}
								</span>
								<span className="ml-auto">
									{bottle.status === "empty" ? (
										<StatusBadge kind="bottle" value={bottle.state} />
									) : (
										<StatusBadge kind="fill" value={bottle.status} />
									)}
								</span>
							</CommandItem>
						))}
					</CommandGroup>
					<CommandGroup heading="Batches">
						{batches.map((batch) => (
							<CommandItem
								key={batch.id}
								value={`batch #${batch.batchNumber} ${batch.name} ${batch.publicName ?? ""}`}
								onSelect={() => go(`/admin/batch/${batch.id}`)}
							>
								<span className="w-10 font-mono font-semibold">
									#{batch.batchNumber}
								</span>
								<span className="truncate">{batch.name}</span>
								<span className="ml-auto">
									<StatusBadge kind="batch" value={batch.status} />
								</span>
							</CommandItem>
						))}
					</CommandGroup>
					<CommandGroup heading="Go to">
						{visibleNavGroups(permissions)
							.flatMap((group) => group.items)
							.map((item) => (
								<CommandItem
									key={item.href}
									value={`go ${item.label}`}
									onSelect={() => go(item.href)}
								>
									<item.icon aria-hidden="true" />
									{item.label}
								</CommandItem>
							))}
					</CommandGroup>
					<CommandGroup heading="Actions">
						<CommandItem
							value="toggle dark light mode theme"
							onSelect={() => {
								setTheme(isDark ? "light" : "dark");
								setOpen(false);
							}}
						>
							{isDark ? (
								<Sun aria-hidden="true" />
							) : (
								<Moon aria-hidden="true" />
							)}
							Switch to {isDark ? "light" : "dark"} mode
						</CommandItem>
					</CommandGroup>
				</CommandList>
			</CommandDialog>
		</>
	);
}
