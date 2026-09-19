import "@/styles/globals.css";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TRPCReactProvider } from "@/trpc/react";

export const metadata: Metadata = {
	title: "Homebrew Organizer",
	description: "",
	icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
	subsets: ["latin", "latin-ext"],
	variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
	subsets: ["latin", "latin-ext"],
	variable: "--font-geist-mono",
});

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html
			lang="en"
			className={`${geist.variable} ${geistMono.variable}`}
			suppressHydrationWarning
		>
			<body>
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
				>
					<TooltipProvider>
						<TRPCReactProvider>{children}</TRPCReactProvider>
					</TooltipProvider>
					<Toaster />
				</ThemeProvider>
			</body>
		</html>
	);
}
