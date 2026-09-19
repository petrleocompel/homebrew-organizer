import type { Locale } from "@/lib/status-labels";

export const LOCALE_COOKIE = "ho_lang";
export const LOCALES: readonly Locale[] = ["cs", "en"];

export function isLocale(value: string | undefined | null): value is Locale {
	return value === "cs" || value === "en";
}

/** Cookie wins, then the first supported language from Accept-Language. */
export function resolveLocale(
	cookieValue: string | undefined,
	acceptLanguage: string | null,
): Locale {
	if (isLocale(cookieValue)) return cookieValue;
	for (const part of (acceptLanguage ?? "").split(",")) {
		const tag = part.split(";")[0]?.trim().toLowerCase().slice(0, 2);
		if (tag === "sk") return "cs";
		if (isLocale(tag)) return tag;
	}
	return "en";
}

const intlLocale: Record<Locale, string> = { cs: "cs-CZ", en: "en-GB" };

export function formatDate(
	value: string | null,
	locale: Locale,
	style: "numeric" | "long" = "numeric",
): string {
	if (!value) return "—";
	return new Intl.DateTimeFormat(
		intlLocale[locale],
		style === "long"
			? { day: "numeric", month: "long" }
			: { day: "numeric", month: "numeric", year: "numeric" },
	).format(new Date(value));
}

export function formatAbv(abv: number, locale: Locale): string {
	const number = new Intl.NumberFormat(intlLocale[locale], {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1,
	}).format(abv);
	return locale === "cs" ? `${number} % ABV` : `${number}% ABV`;
}

export const publicBottleCopy = {
	en: {
		brand: "Homebrew Organizer",
		language: "Language",
		bottle: "Bottle",
		filled: "Filled",
		volume: "Volume",
		ready: "Ready",
		privateBatch: "Private batch",
		privateHero:
			"The brewery has not published this batch. Only the person who gave you the bottle knows what is inside.",
		privateNote:
			"The fill status is always public: it belongs to the bottle, not to the batch. The name, style, ABV and description of a private batch are never shown.",
		about: "About this beer",
		batchStory: (number: number) => `Batch #${number} — the whole story`,
		history: "What this bottle has held",
		lastHeld: "Last held",
		noHistory: "No public fill history yet.",
		since: (date: string) => `since ${date}`,
		status: {
			filled: "Just bottled",
			conditioning: "Conditioning in the bottle",
			ready: "Ready to drink",
			emptied: "Emptied",
		},
		sentence: {
			filled: (date: string | null) =>
				date
					? `Ready to drink around ${date}. It has only just been bottled.`
					: "It has only just been bottled. Give it some time.",
			conditioning: (date: string | null) =>
				date
					? `Ready to drink around ${date}. Let it rest in the cellar a little longer.`
					: "Let it rest in the cellar a little longer.",
			ready: (date: string | null) =>
				date ? `Ready since ${date}. Enjoy.` : "Good to open. Enjoy.",
			emptied: () => "This fill is finished.",
		},
		emptyTitle: "This bottle is free right now",
		emptyBody:
			"There is nothing in it. The code on the label stays the same, so a new beer will appear here after the next bottling.",
		emptyAction: "What is ready to drink",
		retiredBadge: "Retired",
		retiredTitle: "This bottle is out of service",
		retiredBody: (number: number, date: string) =>
			`Bottle ${number} was retired on ${date}. It is no longer filled, but what it held stays here.`,
		unknownTitle: "We don't know this code",
		unknownBody:
			"Try scanning the QR code again, or see what is ready to drink.",
		catalog: "Beer catalog",
		app: "App",
		privacy: "Privacy",
		support: "Support",
		team: "Team",
	},
	cs: {
		brand: "Homebrew Organizer",
		language: "Jazyk",
		bottle: "Lahev",
		filled: "Plněno",
		volume: "Objem",
		ready: "Zralost",
		privateBatch: "Soukromá várka",
		privateHero:
			"Tuhle várku pivovar nezveřejnil. Co je v lahvi, ví jen ten, kdo ji dal.",
		privateNote:
			"Stav náplně je veřejný vždy — je to vlastnost lahve, ne várky. Název, styl, ABV ani popis se u soukromé várky neukážou nikde.",
		about: "O tomhle pivu",
		batchStory: (number: number) => `Várka #${number} — celý příběh`,
		history: "Co v téhle lahvi bylo",
		lastHeld: "Naposledy v ní bylo",
		noHistory: "Zatím žádná veřejná historie.",
		since: (date: string) => `od ${date}`,
		status: {
			filled: "Čerstvě stočeno",
			conditioning: "Zraje v lahvi",
			ready: "Připraveno k pití",
			emptied: "Vypito",
		},
		sentence: {
			filled: (date: string | null) =>
				date
					? `Připraveno k pití kolem ${date}. Zatím je čerstvě stočená.`
					: "Je čerstvě stočená. Dej jí čas.",
			conditioning: (date: string | null) =>
				date
					? `Připraveno k pití kolem ${date}. Nech ji ještě chvíli ležet ve sklepě.`
					: "Nech ji ještě chvíli ležet ve sklepě.",
			ready: (date: string | null) =>
				date ? `Zralé od ${date}. Na zdraví.` : "Dá se otevřít. Na zdraví.",
			emptied: () => "Tahle náplň je vypitá.",
		},
		emptyTitle: "Lahev je právě volná",
		emptyBody:
			"Nic v ní není. Kód na štítku zůstává stejný, takže po příštím stáčení tu bude nové pivo.",
		emptyAction: "Co je teď k pití",
		retiredBadge: "Vyřazeno",
		retiredTitle: "Tahle lahev už neslouží",
		retiredBody: (number: number, date: string) =>
			`Lahev č. ${number} byla vyřazena ${date}. Už se neplní, ale co v ní bylo, tu zůstává.`,
		unknownTitle: "Tenhle kód neznáme",
		unknownBody:
			"Zkuste QR naskenovat znovu, nebo se podívejte, co je právě k pití.",
		catalog: "Katalog piv",
		app: "Aplikace",
		privacy: "Soukromí",
		support: "Podpora",
		team: "Tým",
	},
} as const;

export type PublicBottleCopy = (typeof publicBottleCopy)[Locale];
