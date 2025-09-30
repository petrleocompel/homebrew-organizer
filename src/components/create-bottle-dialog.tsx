"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import type { BottleStatus } from "@/lib/types";
import { api } from "@/trpc/react";

interface CreateBottleDialogProps {
  onCreated: () => void;
}

export function CreateBottleDialog({ onCreated }: CreateBottleDialogProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<BottleStatus>("empty");

  const { data: bottles = [] } = api.bottle.getAll.useQuery();
  const createMutation = api.bottle.create.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const maxBottleNumber = bottles.reduce(
      (max, b) => Math.max(max, b.bottleNumber),
      0
    );

    await createMutation.mutateAsync({
      status,
      bottleNumber: maxBottleNumber + 1,
    });

    setStatus("empty");
    setOpen(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Bottle
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Bottle</DialogTitle>
            <DialogDescription>
              Add a new bottle to your inventory
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="status">Initial Status</Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as BottleStatus)}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="empty">Empty</SelectItem>
                  <SelectItem value="filled">Filled</SelectItem>
                  <SelectItem value="conditioning">Conditioning</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Create Bottle</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
