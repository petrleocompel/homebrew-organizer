"use client";

import { Beer, LoaderCircle } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

interface Invite {
	email: string;
	role: string;
	expiresAt: string;
}

export default function InvitePage() {
	const { token } = useParams<{ token: string }>();
	const router = useRouter();
	const [invite, setInvite] = useState<Invite>();
	const [name, setName] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		fetch(`/api/v1/invites/${encodeURIComponent(token)}`, {
			cache: "no-store",
		})
			.then(async (response) => {
				if (!response.ok)
					throw new Error("This invitation is invalid or expired.");
				return (await response.json()) as Invite;
			})
			.then(setInvite)
			.catch((reason: unknown) =>
				setError(reason instanceof Error ? reason.message : "Invite failed."),
			)
			.finally(() => setLoading(false));
	}, [token]);

	async function submit(event: React.FormEvent) {
		event.preventDefault();
		setSubmitting(true);
		setError("");
		const response = await fetch(
			`/api/v1/invites/${encodeURIComponent(token)}`,
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ name, password }),
			},
		);
		const body = (await response.json()) as {
			error?: { message?: string };
		};
		setSubmitting(false);
		if (!response.ok) {
			setError(body.error?.message ?? "Could not accept invitation.");
			return;
		}
		router.push("/sign-in?invited=1");
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-muted/20 px-4">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<div className="mb-2 flex justify-center">
						<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
							<Beer className="h-7 w-7 text-primary-foreground" />
						</div>
					</div>
					<CardTitle>Join the brewing team</CardTitle>
					<CardDescription>
						{invite
							? `${invite.email} · ${invite.role}`
							: "Validating your one-time invitation"}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{loading ? (
						<div className="flex justify-center py-8">
							<LoaderCircle className="h-6 w-6 animate-spin" />
						</div>
					) : invite ? (
						<form onSubmit={submit} className="space-y-4">
							<div className="grid gap-2">
								<Label htmlFor="name">Name</Label>
								<Input
									id="name"
									autoComplete="name"
									required
									value={name}
									onChange={(event) => setName(event.target.value)}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="password">Password</Label>
								<Input
									id="password"
									type="password"
									autoComplete="new-password"
									required
									minLength={8}
									value={password}
									onChange={(event) => setPassword(event.target.value)}
								/>
							</div>
							{error && <p className="text-destructive text-sm">{error}</p>}
							<Button className="w-full" disabled={submitting}>
								{submitting ? "Creating account…" : "Accept invitation"}
							</Button>
						</form>
					) : (
						<p className="py-6 text-center text-destructive">{error}</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
