"use client"

import { useEffect, useState } from "react"
import { getBatches, deleteBatch } from "@/lib/storage"
import type { Batch } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Pencil, Trash2, Bold as Bottle } from "lucide-react"
import Link from "next/link"
import { EditBatchDialog } from "./edit-batch-dialog"

const statusColors = {
  planning: "bg-secondary text-secondary-foreground",
  brewing: "bg-chart-4 text-primary-foreground",
  fermenting: "bg-chart-2 text-primary-foreground",
  bottled: "bg-chart-1 text-primary-foreground",
  completed: "bg-muted text-muted-foreground",
}

export function BatchList() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null)

  useEffect(() => {
    loadBatches()
  }, [])

  const loadBatches = () => {
    setBatches(getBatches())
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this batch?")) {
      deleteBatch(id)
      loadBatches()
    }
  }

  if (batches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
          <Bottle className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">No batches yet</h2>
        <p className="text-muted-foreground mb-6">Create your first brewing batch to get started</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {batches.map((batch) => (
          <Card key={batch.id} className="hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="font-mono">
                      #{batch.batchNumber}
                    </Badge>
                    <Badge className={statusColors[batch.status]}>{batch.status}</Badge>
                  </div>
                  <CardTitle className="text-balance">{batch.name}</CardTitle>
                  <CardDescription className="text-pretty">{batch.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {batch.note && <p className="text-sm text-muted-foreground mb-4 text-pretty">{batch.note}</p>}
              <div className="flex items-center gap-2">
                <Button asChild variant="default" size="sm" className="flex-1">
                  <Link href={`/batch/${batch.id}`}>
                    <Bottle className="h-4 w-4 mr-2" />
                    Manage Bottles
                  </Link>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditingBatch(batch)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDelete(batch.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {editingBatch && (
        <EditBatchDialog
          batch={editingBatch}
          open={!!editingBatch}
          onOpenChange={(open) => !open && setEditingBatch(null)}
          onSave={loadBatches}
        />
      )}
    </>
  )
}
