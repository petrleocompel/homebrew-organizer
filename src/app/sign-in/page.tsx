"use client";

import { Beer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export default function SignInPage() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setLoading(true);
		const { error: signInError } = await authClient.signIn.email({
			email,
			password,
		});
		setLoading(false);
		if (signInError) {
			setError(
				signInError.message ?? "Sign in failed. Check your credentials.",
			);
			return;
		}
		router.push("/admin");
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-background px-4">
			<Card className="w-full max-w-sm">
				<CardHeader className="text-center">
					<div className="mb-2 flex justify-center">
						<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
							<Beer className="h-7 w-7 text-primary-foreground" />
						</div>
					</div>
					<CardTitle>Sign in</CardTitle>
					<CardDescription>Access the admin area</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								autoComplete="email"
								required
								value={email}
								onChange={(e) => setEmail(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="password">Password</Label>
							<Input
								id="password"
								type="password"
								autoComplete="current-password"
								required
								value={password}
								onChange={(e) => setPassword(e.target.value)}
							/>
						</div>
						{error && <p className="text-destructive text-sm">{error}</p>}
						<Button type="submit" className="w-full" disabled={loading}>
							{loading ? "Signing in…" : "Sign in"}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
