import type { Metadata } from "next";
import { PublicFooter } from "@/components/public-footer";
import { PublicInfoHeader } from "@/components/public-info-header";
import { SupportContact } from "@/components/support-contact";
import { env } from "@/env";

export const metadata: Metadata = {
	title: "Support · Homebrew Scan",
	description: "Support and account-deletion help for Homebrew Scan.",
};

export const dynamic = "force-dynamic";

export default function SupportPage() {
	const publicHost = new URL(env.PUBLIC_APP_URL).hostname;
	return (
		<div className="flex min-h-screen flex-col bg-muted/20">
			<PublicInfoHeader
				title="Support"
				subtitle="Help with Homebrew Scan and Organizer"
			/>
			<main className="container mx-auto max-w-3xl flex-1 space-y-12 px-4 py-10">
				<article id="english" lang="en" className="scroll-mt-6 space-y-6">
					<header>
						<p className="font-medium text-primary">English</p>
						<h1 className="mt-2 font-bold text-4xl">How can we help?</h1>
						<p className="mt-3 text-lg text-muted-foreground">
							Email <SupportContact lang="en" />. Include the app version,
							device model, and a description of what happened.
						</p>
					</header>
					<section className="space-y-3">
						<h2 className="font-semibold text-2xl">Troubleshooting</h2>
						<ul className="list-disc space-y-2 pl-6">
							<li>
								Confirm the device is online before signing in or changing data.
							</li>
							<li>
								Check that the QR code opens an HTTPS {publicHost} bottle link.
							</li>
							<li>
								Ask an Organizer owner to confirm your membership and
								permissions.
							</li>
							<li>
								Retry the scan in good light and keep the complete label in
								view.
							</li>
						</ul>
						<p className="font-medium">
							Never send us your password, bearer token, App Store key, or
							another secret.
						</p>
					</section>
					<section id="account-deletion" className="scroll-mt-6 space-y-3">
						<h2 className="font-semibold text-2xl">
							Account deletion and privacy requests
						</h2>
						<p>
							Email <SupportContact lang="en" /> from the address associated
							with your account and state whether you want the account deleted
							or are making a privacy request. We may verify your identity.
							Organisation-owned audit records may be retained where required
							for security, accountability, or law.
						</p>
					</section>
				</article>

				<article
					id="cestina"
					lang="cs"
					className="scroll-mt-6 space-y-6 border-t pt-12"
				>
					<header>
						<p className="font-medium text-primary">Čeština</p>
						<h2 className="mt-2 font-bold text-4xl">Jak můžeme pomoci?</h2>
						<p className="mt-3 text-lg text-muted-foreground">
							Napište na <SupportContact lang="cs" />. Uveďte verzi aplikace,
							model zařízení a popis situace.
						</p>
					</header>
					<section className="space-y-3">
						<h3 className="font-semibold text-2xl">Řešení potíží</h3>
						<ul className="list-disc space-y-2 pl-6">
							<li>Před přihlášením nebo změnou dat ověřte připojení k síti.</li>
							<li>
								Ověřte, že QR kód otevírá HTTPS odkaz {publicHost} na lahev.
							</li>
							<li>
								Požádejte vlastníka Organizeru o kontrolu členství a oprávnění.
							</li>
							<li>
								Skenování opakujte při dobrém světle s celým štítkem v záběru.
							</li>
						</ul>
						<p className="font-medium">
							Nikdy nám neposílejte heslo, bearer token, klíč App Storu ani jiné
							tajemství.
						</p>
					</section>
					<section id="smazani-uctu" className="scroll-mt-6 space-y-3">
						<h3 className="font-semibold text-2xl">
							Smazání účtu a žádosti o soukromí
						</h3>
						<p>
							Napište na <SupportContact lang="cs" /> z adresy propojené s účtem
							a uveďte, zda žádáte o smazání účtu nebo uplatňujete právo na
							ochranu soukromí. Můžeme ověřit vaši totožnost. Auditní záznamy
							vlastněné organizací mohou zůstat zachovány, vyžaduje-li to
							bezpečnost, odpovědnost nebo právo.
						</p>
					</section>
				</article>
			</main>
			<PublicFooter />
		</div>
	);
}
