export type BatchStatus = "planning" | "brewing" | "fermenting" | "bottled" | "completed"
export type BottleStatus = "empty" | "filled" | "conditioning" | "ready"

export interface Batch {
  id: string
  batchNumber: number
  name: string
  description: string
  note: string
  status: BatchStatus
  created: string
  updated: string
}

export interface Bottle {
  id: string
  status: BottleStatus
  bottleNumber: number
  currentBatchId?: string
  created: string
  updated: string
}

export interface BatchBottle {
  id: string
  batchId: string
  bottleId: string
  created: string
  updated: string
}
