import {
	History,
	Link2,
	PackageCheck,
	QrCode,
	ShieldCheck,
	WifiOff,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PublicFooter } from "@/components/public-footer";
import { PublicInfoHeader } from "@/components/public-info-header";

export const metadata: Metadata = {
	title: "Homebrew Scan",
	description:
		"Homebrew Scan for iPhone and iPad, connected to Homebrew Organizer.",
};

const features = [
	{
		icon: QrCode,
		en: "Scan permanent bottle QR labels",
		cs: "Skenujte trvalé QR štítky lahví",
	},
	{
		icon: History,
		en: "See current beer and complete fill history",
		cs: "Zobrazte aktuální pivo a historii plnění",
	},
	{
		icon: PackageCheck,
		en: "Assign bottles during a continuous bottling session",
		cs: "Přiřazujte lahve během souvislého stáčení",
	},
	{
		icon: WifiOff,
		en: "Keep recently viewed bottle details available offline",
		cs: "Mějte nedávné údaje o lahvích dostupné offline",
	},
	{
		icon: Link2,
		en: "Open bottle links directly from the web or QR code",
		cs: "Otevírejte odkazy na lahve z webu i QR kódu",
	},
	{
		icon: ShieldCheck,
		en: "No advertising or third-party tracking SDKs",
		cs: "Bez reklam a sledovacích SDK třetích stran",
	},
];

const screenshots = [
	{ file: "01-Scan", en: "Scan", cs: "Skenování" },
	{ file: "02-Bottle", en: "Bottle details", cs: "Detail lahve" },
	{ file: "03-Assign", en: "Assign bottles", cs: "Přiřazení lahví" },
	{ file: "04-Batches", en: "Batches", cs: "Várky" },
	{ file: "05-Recent", en: "Recent bottles", cs: "Nedávné lahve" },
] as const;

export default function AppPage() {
	return (
		<div className="flex min-h-screen flex-col bg-muted/20">
			<PublicInfoHeader
				title="Homebrew Scan"
				subtitle="iPhone and iPad companion for Homebrew Organizer"
			/>
			<main className="container mx-auto max-w-5xl flex-1 space-y-14 px-4 py-10">
				<section className="flex flex-col gap-6 rounded-2xl border bg-card p-6 sm:flex-row sm:items-center">
					<Image
						src="/homebrew-scan/app-icon.png"
						width={160}
						height={160}
						priority
						alt="Homebrew Scan amber bottle and QR app icon"
						className="h-32 w-32 rounded-[28px] sm:h-40 sm:w-40"
					/>
					<div className="space-y-2">
						<h1 className="font-bold text-3xl">Homebrew Scan</h1>
						<p className="text-muted-foreground">
							The amber bottle-and-QR identity for the iPhone and iPad companion
							to Homebrew Organizer.
						</p>
						<p lang="cs" className="text-muted-foreground">
							Jantarová identita lahve a QR kódu pro aplikaci propojenou se
							službou Homebrew Organizer.
						</p>
					</div>
				</section>

				<section id="english" lang="en" className="scroll-mt-6 space-y-6">
					<div className="max-w-3xl space-y-4">
						<p className="font-medium text-primary">English</p>
						<h2 className="font-bold text-4xl tracking-tight">
							Know what is in every bottle.
						</h2>
						<p className="text-lg text-muted-foreground">
							Homebrew Scan is the iPhone and iPad companion for Homebrew
							Organizer. Scan a permanent bottle label, view its history, and
							keep bottling sessions moving.
						</p>
						<p className="rounded-lg border border-primary/30 bg-primary/5 p-4">
							Internal TestFlight availability is planned for the Homebrew Team.
							The public App Store release is not yet available.
						</p>
					</div>
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{features.map(({ icon: Icon, en }) => (
							<div key={en} className="rounded-xl border bg-card p-5">
								<Icon className="mb-3 h-6 w-6 text-primary" />
								<p className="font-medium">{en}</p>
							</div>
						))}
					</div>
					<div className="space-y-4">
						<h3 className="font-semibold text-2xl">Product screenshots</h3>
						<p className="text-muted-foreground">
							Raw, deterministic product captures from the English TestFlight
							build.
						</p>
						<div className="flex snap-x gap-4 overflow-x-auto pb-4">
							{screenshots.map(({ file, en }) => (
								<figure
									key={file}
									className="w-56 shrink-0 snap-start space-y-2"
								>
									<Image
										src={`/homebrew-scan/en-GB/${file}.png`}
										width={1320}
										height={2868}
										alt={`Homebrew Scan ${en} screen`}
										className="h-auto w-full rounded-2xl border"
									/>
									<figcaption className="text-center text-muted-foreground text-sm">
										{en}
									</figcaption>
								</figure>
							))}
						</div>
					</div>
					<p>
						<Link className="underline" href="/support">
							Get support
						</Link>{" "}
						or read the{" "}
						<Link className="underline" href="/privacy">
							privacy policy
						</Link>
						.
					</p>
				</section>

				<section
					id="cestina"
					lang="cs"
					className="scroll-mt-6 space-y-6 border-t pt-12"
				>
					<div className="max-w-3xl space-y-4">
						<p className="font-medium text-primary">Čeština</p>
						<h2 className="font-bold text-4xl tracking-tight">
							Vždy víte, co je v každé lahvi.
						</h2>
						<p className="text-lg text-muted-foreground">
							Homebrew Scan je aplikace pro iPhone a iPad propojená se službou
							Homebrew Organizer. Naskenujte trvalý štítek lahve, zobrazte její
							historii a zrychlete stáčení.
						</p>
						<p className="rounded-lg border border-primary/30 bg-primary/5 p-4">
							Interní verze v TestFlightu je připravována pro skupinu Homebrew
							Team. Veřejná verze v App Storu zatím není dostupná.
						</p>
					</div>
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{features.map(({ icon: Icon, cs }) => (
							<div key={cs} className="rounded-xl border bg-card p-5">
								<Icon className="mb-3 h-6 w-6 text-primary" />
								<p className="font-medium">{cs}</p>
							</div>
						))}
					</div>
					<div className="space-y-4">
						<h3 className="font-semibold text-2xl">Ukázky aplikace</h3>
						<p className="text-muted-foreground">
							Neupravené a reprodukovatelné snímky české verze pro TestFlight.
						</p>
						<div className="flex snap-x gap-4 overflow-x-auto pb-4">
							{screenshots.map(({ file, cs }) => (
								<figure
									key={file}
									className="w-56 shrink-0 snap-start space-y-2"
								>
									<Image
										src={`/homebrew-scan/cs/${file}.png`}
										width={1320}
										height={2868}
										alt={`Obrazovka Homebrew Scan: ${cs}`}
										className="h-auto w-full rounded-2xl border"
									/>
									<figcaption className="text-center text-muted-foreground text-sm">
										{cs}
									</figcaption>
								</figure>
							))}
						</div>
					</div>
					<p>
						<Link className="underline" href="/support#cestina">
							Kontaktujte podporu
						</Link>{" "}
						nebo si přečtěte{" "}
						<Link className="underline" href="/privacy#cestina">
							zásady ochrany soukromí
						</Link>
						.
					</p>
				</section>
			</main>
			<PublicFooter />
		</div>
	);
}
