"use client"

import { useEffect, useState } from "react"
import {
  getBatchById,
  getBottles,
  getBottlesByBatchId,
  assignBottleToBatch,
  unassignBottleFromBatch,
  deleteBottle,
} from "@/lib/storage"
import type { Batch, Bottle } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, ExternalLink } from "lucide-react"
import { CreateBottleDialog } from "./create-bottle-dialog"
import { EditBottleDialog } from "./edit-bottle-dialog"
import { AssignBottleDialog } from "./assign-bottle-dialog"

const bottleStatusColors = {
  empty: "bg-muted text-muted-foreground",
  filled: "bg-chart-4 text-primary-foreground",
  conditioning: "bg-chart-2 text-primary-foreground",
  ready: "bg-chart-1 text-primary-foreground",
}

interface BottleManagerProps {
  batchId: string
}

export function BottleManager({ batchId }: BottleManagerProps) {
  const [batch, setBatch] = useState<Batch | null>(null)
  const [assignedBottles, setAssignedBottles] = useState<Bottle[]>([])
  const [allBottles, setAllBottles] = useState<Bottle[]>([])
  const [editingBottle, setEditingBottle] = useState<Bottle | null>(null)
  const [showAssignDialog, setShowAssignDialog] = useState(false)

  useEffect(() => {
    loadData()
  }, [batchId])

  const loadData = () => {
    const batchData = getBatchById(batchId)
    setBatch(batchData || null)
    setAssignedBottles(getBottlesByBatchId(batchId))
    setAllBottles(getBottles())
  }

  const handleUnassign = (bottleId: string) => {
    if (confirm("Remove this bottle from the batch?")) {
      unassignBottleFromBatch(bottleId)
      loadData()
    }
  }

  const handleDelete = (bottleId: string) => {
    if (confirm("Are you sure you want to delete this bottle?")) {
      deleteBottle(bottleId)
      loadData()
    }
  }

  const handleAssign = (bottleId: string) => {
    assignBottleToBatch(bottleId, batchId)
    setShowAssignDialog(false)
    loadData()
  }

  if (!batch) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Batch not found</p>
      </div>
    )
  }

  const availableBottles = allBottles.filter((b) => !b.currentBatchId)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="font-mono">
                  #{batch.batchNumber}
                </Badge>
                <Badge className="bg-primary text-primary-foreground">{batch.status}</Badge>
              </div>
              <CardTitle className="text-balance">{batch.name}</CardTitle>
              <CardDescription className="text-pretty">{batch.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        {batch.note && (
          <CardContent>
            <p className="text-sm text-muted-foreground text-pretty">{batch.note}</p>
          </CardContent>
        )}
      </Card>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Bottles in this Batch</h2>
          <p className="text-sm text-muted-foreground">{assignedBottles.length} bottles assigned</p>
        </div>
        <div className="flex gap-2">
          <CreateBottleDialog onCreated={loadData} />
          <Button variant="outline" onClick={() => setShowAssignDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Assign Existing
          </Button>
        </div>
      </div>

      {assignedBottles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground mb-4">No bottles assigned to this batch yet</p>
            <div className="flex gap-2">
              <CreateBottleDialog onCreated={loadData} />
              <Button variant="outline" onClick={() => setShowAssignDialog(true)}>
                Assign Existing Bottle
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {assignedBottles.map((bottle) => (
            <Card key={bottle.id} className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="font-mono">
                        #{bottle.bottleNumber}
                      </Badge>
                      <Badge className={bottleStatusColors[bottle.status]}>{bottle.status}</Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" asChild className="flex-1 bg-transparent">
                    <a href={`/bottle/${bottle.id}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Public
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setEditingBottle(bottle)}>
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleUnassign(bottle.id)}>
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editingBottle && (
        <EditBottleDialog
          bottle={editingBottle}
          open={!!editingBottle}
          onOpenChange={(open) => !open && setEditingBottle(null)}
          onSave={loadData}
          onDelete={handleDelete}
        />
      )}

      {showAssignDialog && (
        <AssignBottleDialog
          availableBottles={availableBottles}
          open={showAssignDialog}
          onOpenChange={setShowAssignDialog}
          onAssign={handleAssign}
        />
      )}
    </div>
  )
}
