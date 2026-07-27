"use client";

import { Clipboard, Shield, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { api } from "@/trpc/react";

type Role = "owner" | "brewer" | "cellar" | "viewer";

export function TeamManager() {
	const team = api.team.list.useQuery();
	const activity = api.team.recentActivity.useQuery();
	const [email, setEmail] = useState("");
	const [role, setRole] = useState<Role>("cellar");
	const [inviteUrl, setInviteUrl] = useState("");
	const invite = api.team.invite.useMutation({
		onSuccess: async (result) => {
			setInviteUrl(result.url);
			setEmail("");
			await team.refetch();
			toast.success("Seven-day invitation created");
		},
		onError(error) {
			toast.error(error.message);
		},
	});
	const setMemberRole = api.team.setRole.useMutation({
		onSuccess: () => team.refetch(),
		onError(error) {
			toast.error(error.message);
		},
	});
	const setDisabled = api.team.setDisabled.useMutation({
		onSuccess: () => team.refetch(),
		onError(error) {
			toast.error(error.message);
		},
	});

	if (team.error) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Owner access required</CardTitle>
					<CardDescription>
						Only Owners can manage members, roles, invitations, and session
						revocation.
					</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	return (
		<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
			<div className="space-y-6">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Users className="h-5 w-5" />
							Brewery members
						</CardTitle>
						<CardDescription>
							Disabling a member immediately revokes every active session.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						{team.data?.members.map((member) => (
							<div
								key={member.userId}
								className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
							>
								<div className="min-w-0">
									<p className="truncate font-medium">{member.name}</p>
									<p className="truncate text-muted-foreground text-sm">
										{member.email}
									</p>
								</div>
								<div className="flex items-center gap-2">
									{member.disabledAt && (
										<Badge variant="destructive">disabled</Badge>
									)}
									<Select
										value={member.role}
										onValueChange={(value) =>
											setMemberRole.mutate({
												userId: member.userId,
												role: value as Role,
											})
										}
									>
										<SelectTrigger className="w-32">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="owner">Owner</SelectItem>
											<SelectItem value="brewer">Brewer</SelectItem>
											<SelectItem value="cellar">Cellar</SelectItem>
											<SelectItem value="viewer">Viewer</SelectItem>
										</SelectContent>
									</Select>
									<Button
										size="sm"
										variant={member.disabledAt ? "outline" : "destructive"}
										onClick={() =>
											setDisabled.mutate({
												userId: member.userId,
												disabled: !member.disabledAt,
											})
										}
									>
										{member.disabledAt ? "Restore" : "Revoke"}
									</Button>
								</div>
							</div>
						))}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Shield className="h-5 w-5" />
							Recent actor activity
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							{activity.data?.map((event) => (
								<div
									key={`${event.id}-${event.timestamp.toString()}`}
									className="flex items-center justify-between gap-3 border-b py-2 text-sm last:border-0"
								>
									<span>
										{event.type}{" "}
										<span className="text-muted-foreground">
											via {event.source}
										</span>
									</span>
									<time className="text-muted-foreground text-xs">
										{new Date(event.timestamp).toLocaleString()}
									</time>
								</div>
							))}
							{activity.data?.length === 0 && (
								<p className="text-muted-foreground text-sm">
									No activity recorded yet.
								</p>
							)}
						</div>
					</CardContent>
				</Card>
			</div>

			<div className="space-y-6">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<UserPlus className="h-5 w-5" />
							Create invite
						</CardTitle>
						<CardDescription>
							Links are one-time and expire after seven days.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-2">
							<Label htmlFor="invite-email">Email</Label>
							<Input
								id="invite-email"
								type="email"
								value={email}
								onChange={(event) => setEmail(event.target.value)}
							/>
						</div>
						<div className="grid gap-2">
							<Label>Role</Label>
							<Select
								value={role}
								onValueChange={(value) => setRole(value as Role)}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="owner">Owner</SelectItem>
									<SelectItem value="brewer">Brewer</SelectItem>
									<SelectItem value="cellar">Cellar</SelectItem>
									<SelectItem value="viewer">Viewer</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<Button
							className="w-full"
							disabled={!email || invite.isPending}
							onClick={() => invite.mutate({ email, role })}
						>
							Create shareable link
						</Button>
						{inviteUrl && (
							<div className="space-y-2 rounded border bg-muted/40 p-3">
								<p className="break-all font-mono text-xs">{inviteUrl}</p>
								<Button
									size="sm"
									variant="outline"
									onClick={async () => {
										await navigator.clipboard.writeText(inviteUrl);
										toast.success("Invite copied");
									}}
								>
									<Clipboard className="mr-2 h-4 w-4" />
									Copy
								</Button>
							</div>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">Pending invitations</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						{team.data?.invites
							.filter((item) => !item.acceptedAt)
							.map((item) => (
								<div key={item.id} className="rounded border p-2 text-sm">
									<p className="truncate font-medium">{item.email}</p>
									<p className="text-muted-foreground text-xs">
										{item.role} · expires{" "}
										{new Date(item.expiresAt).toLocaleDateString()}
									</p>
								</div>
							))}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
