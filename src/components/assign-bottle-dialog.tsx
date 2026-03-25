"use client";

import { Check, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BottleStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

interface AssignableBottle {
  id: string;
  bottleNumber: number;
  status: BottleStatus;
  label?: string | null;
  currentBatchId?: string | null;
}

interface AssignBottleDialogProps {
  availableBottles: AssignableBottle[];
  batchId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: (bottleIds: string[]) => void;
}

const bottleStatusColors = {
  empty: "bg-muted text-muted-foreground",
  filled: "bg-chart-4 text-primary-foreground",
  conditioning: "bg-chart-2 text-primary-foreground",
  ready: "bg-chart-1 text-primary-foreground",
};

export function AssignBottleDialog({
  availableBottles,
  batchId,
  open,
  onOpenChange,
  onAssign,
}: AssignBottleDialogProps) {
  const assignManyMutation = api.bottle.assignManyToBatch.useMutation();
  const [selectedBottleIds, setSelectedBottleIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      setSelectedBottleIds([]);
    }
  }, [open]);

  const selectedBottleSet = useMemo(
    () => new Set(selectedBottleIds),
    [selectedBottleIds],
  );

  const toggleBottle = (bottleId: string) => {
    setSelectedBottleIds((current) =>
      current.includes(bottleId)
        ? current.filter((id) => id !== bottleId)
        : [...current, bottleId],
    );
  };

  const handleAssign = async () => {
    if (selectedBottleIds.length === 0) {
      return;
    }

    try {
      await assignManyMutation.mutateAsync({
        bottleIds: selectedBottleIds,
        batchId,
      });
      onAssign(selectedBottleIds);
      setSelectedBottleIds([]);
      toast.success(
        `Assigned ${selectedBottleIds.length} bottle${selectedBottleIds.length === 1 ? "" : "s"}`,
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to assign bottles",
      );
    }
  };

  const selectedCount = selectedBottleIds.length;
  const assignButtonLabel =
    selectedCount === 0
      ? "Assign Bottles"
      : `Assign ${selectedCount} Bottle${selectedCount === 1 ? "" : "s"}`;
  const dialogDescription =
    selectedCount === 0
      ? "Select one or more bottles to assign to this batch"
      : `${selectedCount} bottle${selectedCount === 1 ? "" : "s"} selected`;

  if (availableBottles.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Assign Bottle</DialogTitle>
            <DialogDescription>
              No available bottles to assign
            </DialogDescription>
          </DialogHeader>
          <div className="py-8 text-center">
            <p className="text-muted-foreground">
              All bottles are currently assigned to batches.
            </p>
            <p className="mt-2 text-muted-foreground text-sm">
              Create a new bottle to continue.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Assign Bottle to Batch</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[400px] gap-3 overflow-y-auto py-4">
          {availableBottles.map((bottle) => {
            const isSelected = selectedBottleSet.has(bottle.id);

            return (
              <Card
                key={bottle.id}
                data-testid="assign-bottle-card"
                className={cn(
                  "cursor-pointer transition-colors hover:border-primary/50",
                  isSelected && "border-primary bg-primary/5",
                )}
              >
                <CardContent className="px-4">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 text-left"
                    data-testid="assign-bottle-toggle"
                    aria-pressed={isSelected}
                    onClick={() => toggleBottle(bottle.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded border",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background",
                        )}
                      >
                        {isSelected ? <Check className="h-3 w-3" /> : null}
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono">
                          {bottle.label ?? `#${bottle.bottleNumber}`}
                        </Badge>
                        <Badge className={bottleStatusColors[bottle.status]}>
                          {bottle.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-muted-foreground text-sm">
                      {isSelected ? "Selected" : "Select"}
                    </div>
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            data-testid="assign-bottles-submit"
            disabled={selectedCount === 0 || assignManyMutation.isPending}
            onClick={handleAssign}
          >
            <Plus className="mr-2 h-4 w-4" />
            {assignButtonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
