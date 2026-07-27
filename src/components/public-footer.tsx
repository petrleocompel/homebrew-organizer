import Link from "next/link";

export function PublicFooter() {
	return (
		<footer className="mt-auto border-border border-t bg-card">
			<div className="container mx-auto flex flex-col gap-4 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between">
				<div>
					<p className="font-medium">Homebrew Organizer · PEELCO</p>
					<a
						className="text-muted-foreground hover:text-foreground"
						href="mailto:support@example.com"
					>
						support@example.com
					</a>
				</div>
				<nav aria-label="Public information" className="flex flex-wrap gap-4">
					<Link href="/app">Homebrew Scan</Link>
					<Link href="/privacy">Privacy / Soukromí</Link>
					<Link href="/support">Support / Podpora</Link>
				</nav>
			</div>
		</footer>
	);
}
