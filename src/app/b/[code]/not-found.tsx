import { QrCode } from "lucide-react";
import Link from "next/link";
import { PublicShell } from "@/components/public/public-shell";
import { Button } from "@/components/ui/button";
import { publicBottleCopy } from "@/lib/public-i18n";
import { getPublicLocale } from "@/lib/public-locale";

/** A real 404 that never reveals whether the code ever existed. */
export default async function PublicBottleNotFound() {
	const locale = await getPublicLocale();
	const copy = publicBottleCopy[locale];

	return (
		<PublicShell locale={locale} copy={copy}>
			<main className="mx-auto max-w-md px-4 py-8 lg:py-16">
				<div className="rounded-lg border bg-card px-4 py-5 text-center">
					<span className="mx-auto flex size-9 items-center justify-center rounded-md border-2 text-muted-foreground">
						<QrCode className="size-4" aria-hidden="true" />
					</span>
					<h1 className="mt-3 font-semibold text-lg leading-tight">
						{copy.unknownTitle}
					</h1>
					<p className="mt-2 text-pretty text-muted-foreground text-sm leading-normal">
						{copy.unknownBody}
					</p>
					<Button asChild variant="outline" className="mt-3.5 h-11 w-full">
						<Link href="/">{copy.catalog}</Link>
					</Button>
				</div>
			</main>
		</PublicShell>
	);
}
