import { env } from "@/env";

const fallback = {
	en: "the operator of this server",
	cs: "provozovatele tohoto serveru",
};

/** Support address link, or a neutral phrase when SUPPORT_EMAIL is unset. */
export function SupportContact({ lang }: { lang: "en" | "cs" }) {
	if (!env.SUPPORT_EMAIL) return fallback[lang];
	return (
		<a className="underline" href={`mailto:${env.SUPPORT_EMAIL}`}>
			{env.SUPPORT_EMAIL}
		</a>
	);
}
