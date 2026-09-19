"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALE_COOKIE, LOCALES } from "@/lib/public-i18n";
import type { Locale } from "@/lib/status-labels";
import { cn } from "@/lib/utils";

/** A real language switch: stores the choice and re-renders the server page. */
export function LocaleToggle({
	locale,
	label,
}: {
	locale: Locale;
	label: string;
}) {
	const router = useRouter();
	const [pending, startTransition] = useTransition();

	const choose = (next: Locale) => {
		if (next === locale) return;
		// biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API is not available in all supported browsers
		document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
		startTransition(() => router.refresh());
	};

	return (
		<fieldset
			aria-label={label}
			disabled={pending}
			className="flex overflow-hidden rounded-md border bg-muted"
		>
			{LOCALES.map((option) => (
				<button
					key={option}
					type="button"
					lang={option}
					aria-pressed={option === locale}
					onClick={() => choose(option)}
					className={cn(
						"min-h-11 min-w-11 px-2 text-xs uppercase outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
						option === locale
							? "bg-card font-semibold text-foreground"
							: "font-medium text-muted-foreground hover:text-foreground",
					)}
				>
					{option}
				</button>
			))}
		</fieldset>
	);
}
