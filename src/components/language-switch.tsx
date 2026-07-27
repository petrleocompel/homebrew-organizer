export function LanguageSwitch() {
	return (
		<nav
			aria-label="Language / Jazyk"
			className="flex items-center gap-2 text-sm"
		>
			<a
				className="rounded-md border px-3 py-1.5 hover:bg-muted"
				href="#english"
			>
				English
			</a>
			<a
				className="rounded-md border px-3 py-1.5 hover:bg-muted"
				href="#cestina"
			>
				Čeština
			</a>
		</nav>
	);
}
