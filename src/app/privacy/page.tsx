import type { Metadata } from "next";
import { PublicFooter } from "@/components/public-footer";
import { PublicInfoHeader } from "@/components/public-info-header";
import { SupportContact } from "@/components/support-contact";
import { env } from "@/env";

export const metadata: Metadata = {
	title: "Privacy · Homebrew Scan",
	description: "Privacy information for Homebrew Scan and Homebrew Organizer.",
};

export const dynamic = "force-dynamic";

export default function PrivacyPage() {
	return (
		<div className="flex min-h-screen flex-col bg-muted/20">
			<PublicInfoHeader
				title="Privacy"
				subtitle="Homebrew Scan and Homebrew Organizer"
			/>
			<main className="container mx-auto max-w-3xl flex-1 space-y-12 px-4 py-10">
				<article id="english" lang="en" className="scroll-mt-6 space-y-6">
					<header>
						<p className="font-medium text-primary">English</p>
						<h1 className="mt-2 font-bold text-4xl">Privacy policy</h1>
						<p className="mt-3 text-muted-foreground">
							{env.OPERATOR_NAME && `Provider: ${env.OPERATOR_NAME} · `}
							Effective 27 July 2026
						</p>
					</header>
					<section className="space-y-3">
						<h2 className="font-semibold text-2xl">Data we process</h2>
						<p>
							Homebrew Organizer retains your name, email address, account ID,
							membership and permissions, and authenticated actions. Bottle
							actions are linked to your account in the organisation’s audit
							history. Session IP address and user agent are retained for
							authentication, abuse prevention, and security diagnostics.
						</p>
						<p>
							Homebrew Scan stores the Organizer server preference and caches
							recent bottle details locally on your device. QR camera frames
							stay on the device; only the decoded bottle code is requested from
							the server.
						</p>
					</section>
					<section className="space-y-3">
						<h2 className="font-semibold text-2xl">Purposes and retention</h2>
						<p>
							We use this information only to provide accounts, bottle and batch
							management, bottling workflows, audit history, support, and
							service security. Account and brewery records are retained while
							needed by the organisation and for legitimate audit and security
							purposes. Local cached bottle data can be removed by deleting the
							app.
						</p>
					</section>
					<section className="space-y-3">
						<h2 className="font-semibold text-2xl">
							Tracking, sharing, and security
						</h2>
						<p>
							There are no advertising or third-party tracking SDKs. We do not
							sell personal data. The service uses platform HTTPS and Keychain
							protection, access controls, and operational safeguards. No online
							service can guarantee absolute security.
						</p>
					</section>
					<section className="space-y-3">
						<h2 className="font-semibold text-2xl">Your rights</h2>
						<p>
							You may request access, correction, deletion, restriction, or a
							copy of your personal data, subject to applicable law and
							necessary audit retention. Send account or privacy requests to{" "}
							<SupportContact lang="en" />.
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
						<h2 className="mt-2 font-bold text-4xl">Zásady ochrany soukromí</h2>
						<p className="mt-3 text-muted-foreground">
							{env.OPERATOR_NAME && `Poskytovatel: ${env.OPERATOR_NAME} · `}
							Účinnost od 27. července 2026
						</p>
					</header>
					<section className="space-y-3">
						<h3 className="font-semibold text-2xl">Zpracovávané údaje</h3>
						<p>
							Homebrew Organizer uchovává jméno, e-mailovou adresu, ID účtu,
							členství, oprávnění a ověřené akce. Akce s lahvemi jsou v historii
							auditu propojeny s účtem. IP adresa relace a user agent se
							uchovávají kvůli přihlášení, ochraně před zneužitím a diagnostice
							bezpečnosti.
						</p>
						<p>
							Homebrew Scan ukládá volbu serveru Organizeru a místně uchovává
							nedávné údaje o lahvích. Snímky z kamery pro QR kód zůstávají v
							zařízení; na server se odesílá pouze rozpoznaný kód lahve.
						</p>
					</section>
					<section className="space-y-3">
						<h3 className="font-semibold text-2xl">Účely a doba uchování</h3>
						<p>
							Údaje používáme pouze pro účty, správu lahví a várek, stáčení,
							auditní historii, podporu a bezpečnost služby. Účetní a pivovarské
							záznamy se uchovávají po dobu potřebnou pro organizaci a oprávněné
							auditní či bezpečnostní účely. Místní mezipaměť odstraníte
							smazáním aplikace.
						</p>
					</section>
					<section className="space-y-3">
						<h3 className="font-semibold text-2xl">
							Sledování, sdílení a zabezpečení
						</h3>
						<p>
							Nepoužíváme reklamy ani sledovací SDK třetích stran a osobní údaje
							neprodáváme. Služba využívá HTTPS, systémovou Klíčenku, řízení
							přístupu a provozní bezpečnostní opatření. Žádná online služba
							nemůže zaručit absolutní bezpečnost.
						</p>
					</section>
					<section className="space-y-3">
						<h3 className="font-semibold text-2xl">Vaše práva</h3>
						<p>
							Můžete požádat o přístup, opravu, smazání, omezení nebo kopii
							osobních údajů s ohledem na platné právo a nutné auditní záznamy.
							Žádosti o účet nebo soukromí posílejte na{" "}
							<SupportContact lang="cs" />.
						</p>
					</section>
				</article>
			</main>
			<PublicFooter />
		</div>
	);
}
