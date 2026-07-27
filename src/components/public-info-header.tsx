import { Beer } from "lucide-react";
import Link from "next/link";
import { LanguageSwitch } from "@/components/language-switch";

export function PublicInfoHeader({
	title,
	subtitle,
}: {
	title: string;
	subtitle: string;
}) {
	return (
		<header className="border-border border-b bg-card">
			<div className="container mx-auto flex flex-col gap-5 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
				<Link href="/" className="flex items-center gap-3">
					<span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary">
						<Beer className="h-6 w-6 text-primary-foreground" />
					</span>
					<span>
						<span className="block font-bold text-xl">{title}</span>
						<span className="block text-muted-foreground text-sm">
							{subtitle}
						</span>
					</span>
				</Link>
				<LanguageSwitch />
			</div>
		</header>
	);
}
