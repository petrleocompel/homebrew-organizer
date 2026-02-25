"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
	const router = useRouter();

	const handleSignOut = async () => {
		await authClient.signOut();
		router.push("/sign-in");
	};

	return (
		<Button variant="outline" size="sm" onClick={handleSignOut}>
			<LogOut className="mr-2 h-4 w-4" />
			Sign out
		</Button>
	);
}
