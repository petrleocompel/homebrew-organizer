"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle({ className }: { className?: string }) {
	const { resolvedTheme, setTheme } = useTheme();

	return (
		<Button
			type="button"
			variant="outline"
			size="icon"
			className={className}
			onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
		>
			<Sun className="size-4 dark:hidden" aria-hidden="true" />
			<Moon className="hidden size-4 dark:block" aria-hidden="true" />
			<span className="sr-only">Toggle dark mode</span>
		</Button>
	);
}
