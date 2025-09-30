"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"
import { saveBatch, getBatches } from "@/lib/storage"
import type { Batch, BatchStatus } from "@/lib/types"

export function CreateBatchDialog() {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    note: "",
    status: "planning" as BatchStatus,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const batches = getBatches()
    const maxBatchNumber = batches.reduce((max, b) => Math.max(max, b.batchNumber), 0)

    const newBatch: Batch = {
      id: `batch-${Date.now()}`,
      batchNumber: maxBatchNumber + 1,
      name: formData.name,
      description: formData.description,
      note: formData.note,
      status: formData.status,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    }

    saveBatch(newBatch)
    setFormData({ name: "", description: "", note: "", status: "planning" })
    setOpen(false)
    window.location.reload()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Batch
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Batch</DialogTitle>
            <DialogDescription>Add a new brewing batch to your collection</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Batch Name</Label>
              <Input
                id="name"
                placeholder="e.g., Summer Pale Ale"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Brief description of the beer"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as BatchStatus })}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="brewing">Brewing</SelectItem>
                  <SelectItem value="fermenting">Fermenting</SelectItem>
                  <SelectItem value="bottled">Bottled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="note">Notes</Label>
              <Textarea
                id="note"
                placeholder="Additional notes about this batch"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Batch</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
