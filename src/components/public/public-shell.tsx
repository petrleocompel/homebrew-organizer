import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { LocaleToggle } from "@/components/locale-toggle";
import type { PublicBottleCopy } from "@/lib/public-i18n";
import type { Locale } from "@/lib/status-labels";

/** Lighter public layout: no sidebar, related to the workspace but clearly not it. */
export function PublicShell({
	locale,
	copy,
	children,
}: {
	locale: Locale;
	copy: PublicBottleCopy;
	children: React.ReactNode;
}) {
	const links = [
		{ href: "/", label: copy.catalog },
		{ href: "/app", label: copy.app },
		{ href: "/privacy", label: copy.privacy },
		{ href: "/support", label: copy.support },
	];

	return (
		<div lang={locale} className="flex min-h-screen flex-col bg-background">
			<header className="border-b">
				<div className="flex items-center gap-4 px-4 py-1.5 lg:px-10 lg:py-2">
					<Link
						href="/"
						className="flex min-h-11 items-center font-semibold text-xs tracking-tight lg:text-sm"
					>
						{copy.brand}
					</Link>
					<nav
						aria-label={copy.brand}
						className="ml-6 hidden gap-5 text-muted-foreground text-sm lg:flex"
					>
						{links.slice(0, 2).map((link) => (
							<Link
								key={link.href}
								href={link.href}
								className="hover:text-foreground"
							>
								{link.label}
							</Link>
						))}
						<Link href="/support" className="hover:text-foreground">
							{copy.support}
						</Link>
					</nav>
					<div className="ml-auto flex items-center gap-3.5">
						<LocaleToggle locale={locale} label={copy.language} />
					</div>
				</div>
			</header>
			<div className="flex-1">{children}</div>
			<footer className="border-t bg-muted/60">
				<nav
					aria-label={copy.brand}
					className="flex flex-wrap items-center gap-x-4 px-4 py-1 text-muted-foreground text-xs lg:px-10"
				>
					{links.map((link) => (
						<Link
							key={link.href}
							href={link.href}
							className="flex min-h-11 items-center hover:text-foreground"
						>
							{link.label}
						</Link>
					))}
					<Link
						href="/sign-in"
						className="ml-auto flex min-h-11 items-center gap-0.5 hover:text-foreground"
					>
						{copy.team}
						<ArrowUpRight className="size-3" aria-hidden="true" />
					</Link>
				</nav>
			</footer>
		</div>
	);
}

export function MonoLabel({
	children,
	className = "text-muted-foreground",
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<p
			className={`font-medium font-mono text-[0.625rem] uppercase leading-none tracking-widest ${className}`}
		>
			{children}
		</p>
	);
}
