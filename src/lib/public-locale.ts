import "server-only";

import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, resolveLocale } from "@/lib/public-i18n";
import type { Locale } from "@/lib/status-labels";

export async function getPublicLocale(): Promise<Locale> {
	const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
	return resolveLocale(
		cookieStore.get(LOCALE_COOKIE)?.value,
		headerStore.get("accept-language"),
	);
}
