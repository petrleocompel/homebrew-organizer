"use client";

import { Activity, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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

type Kind = "gravity" | "temperature" | "ph" | "volume";
const defaults: Record<Kind, string> = {
	gravity: "sg",
	temperature: "C",
	ph: "pH",
	volume: "l",
};

export function BatchMeasurements({ batchId }: { batchId: string }) {
	const measurements = api.batch.getMeasurements.useQuery({ batchId });
	const [kind, setKind] = useState<Kind>("gravity");
	const [value, setValue] = useState("");
	const [unit, setUnit] = useState("sg");
	const [note, setNote] = useState("");
	const add = api.batch.addMeasurement.useMutation({
		onSuccess: async () => {
			setValue("");
			setNote("");
			await measurements.refetch();
			toast.success("Measurement recorded");
		},
		onError(error) {
			toast.error(error.message);
		},
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Activity className="h-5 w-5" />
					Measurements
				</CardTitle>
				<CardDescription>
					Original units are retained alongside normalized metric values.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-5">
				<div className="grid items-end gap-3 md:grid-cols-[1fr_1fr_1fr_2fr_auto]">
					<div className="grid gap-2">
						<Label>Kind</Label>
						<Select
							value={kind}
							onValueChange={(next) => {
								const typed = next as Kind;
								setKind(typed);
								setUnit(defaults[typed]);
							}}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="gravity">Gravity</SelectItem>
								<SelectItem value="temperature">Temperature</SelectItem>
								<SelectItem value="ph">pH</SelectItem>
								<SelectItem value="volume">Volume</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="measurement-value">Value</Label>
						<Input
							id="measurement-value"
							type="number"
							step="any"
							value={value}
							onChange={(event) => setValue(event.target.value)}
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="measurement-unit">Unit</Label>
						<Input
							id="measurement-unit"
							value={unit}
							onChange={(event) => setUnit(event.target.value)}
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="measurement-note">Note</Label>
						<Input
							id="measurement-note"
							value={note}
							onChange={(event) => setNote(event.target.value)}
						/>
					</div>
					<Button
						disabled={!value || add.isPending}
						onClick={() =>
							add.mutate({
								batchId,
								kind,
								value: Number(value),
								unit,
								note: note || null,
							})
						}
					>
						<Plus className="mr-2 h-4 w-4" />
						Add
					</Button>
				</div>
				<div className="space-y-2">
					{measurements.data?.map((measurement) => (
						<div
							key={measurement.id}
							className="grid gap-2 rounded border p-3 text-sm sm:grid-cols-[120px_1fr_1fr_2fr]"
						>
							<span className="font-medium">{measurement.kind}</span>
							<span>
								{measurement.originalValue} {measurement.originalUnit}
							</span>
							<span className="text-muted-foreground">
								{measurement.normalizedValue.toFixed(4)}{" "}
								{measurement.normalizedUnit}
							</span>
							<span className="text-muted-foreground">
								{new Date(measurement.measuredAt).toLocaleString()}
								{measurement.note ? ` · ${measurement.note}` : ""}
							</span>
						</div>
					))}
					{measurements.data?.length === 0 && (
						<p className="text-muted-foreground text-sm">
							No measurements recorded.
						</p>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
