import type { Batch, Bottle, BatchBottle } from "./types"

const BATCHES_KEY = "homebrew_batches"
const BOTTLES_KEY = "homebrew_bottles"
const BATCH_BOTTLES_KEY = "homebrew_batch_bottles"

// Batch operations
export function getBatches(): Batch[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(BATCHES_KEY)
  return data ? JSON.parse(data) : []
}

export function saveBatch(batch: Batch): void {
  const batches = getBatches()
  const index = batches.findIndex((b) => b.id === batch.id)
  if (index >= 0) {
    batches[index] = batch
  } else {
    batches.push(batch)
  }
  localStorage.setItem(BATCHES_KEY, JSON.stringify(batches))
}

export function deleteBatch(id: string): void {
  const batches = getBatches().filter((b) => b.id !== id)
  localStorage.setItem(BATCHES_KEY, JSON.stringify(batches))
}

export function getBatchById(id: string): Batch | undefined {
  return getBatches().find((b) => b.id === id)
}

// Bottle operations
export function getBottles(): Bottle[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(BOTTLES_KEY)
  return data ? JSON.parse(data) : []
}

export function saveBottle(bottle: Bottle): void {
  const bottles = getBottles()
  const index = bottles.findIndex((b) => b.id === bottle.id)
  if (index >= 0) {
    bottles[index] = bottle
  } else {
    bottles.push(bottle)
  }
  localStorage.setItem(BOTTLES_KEY, JSON.stringify(bottles))
}

export function deleteBottle(id: string): void {
  const bottles = getBottles().filter((b) => b.id !== id)
  localStorage.setItem(BOTTLES_KEY, JSON.stringify(bottles))
}

export function getBottleById(id: string): Bottle | undefined {
  return getBottles().find((b) => b.id === id)
}

// BatchBottle operations
export function getBatchBottles(): BatchBottle[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(BATCH_BOTTLES_KEY)
  return data ? JSON.parse(data) : []
}

export function saveBatchBottle(batchBottle: BatchBottle): void {
  const batchBottles = getBatchBottles()
  const index = batchBottles.findIndex((bb) => bb.id === batchBottle.id)
  if (index >= 0) {
    batchBottles[index] = batchBottle
  } else {
    batchBottles.push(batchBottle)
  }
  localStorage.setItem(BATCH_BOTTLES_KEY, JSON.stringify(batchBottles))
}

export function getBottlesByBatchId(batchId: string): Bottle[] {
  const batchBottles = getBatchBottles().filter((bb) => bb.batchId === batchId)
  const bottles = getBottles()
  return batchBottles.map((bb) => bottles.find((b) => b.id === bb.bottleId)).filter((b): b is Bottle => b !== undefined)
}

export function assignBottleToBatch(bottleId: string, batchId: string): void {
  const bottle = getBottleById(bottleId)
  if (bottle) {
    bottle.currentBatchId = batchId
    bottle.updated = new Date().toISOString()
    saveBottle(bottle)
  }

  const batchBottle: BatchBottle = {
    id: `${batchId}-${bottleId}-${Date.now()}`,
    batchId,
    bottleId,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  }
  saveBatchBottle(batchBottle)
}

export function unassignBottleFromBatch(bottleId: string): void {
  const bottle = getBottleById(bottleId)
  if (bottle) {
    bottle.currentBatchId = undefined
    bottle.updated = new Date().toISOString()
    saveBottle(bottle)
  }
}
