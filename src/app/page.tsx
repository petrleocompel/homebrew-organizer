import { BatchList } from "@/components/batch-list"
import { CreateBatchDialog } from "@/components/create-batch-dialog"
import { Beer } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Beer className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-balance">Homebrew Organizer</h1>
                <p className="text-sm text-muted-foreground">Manage your brewing batches and bottles</p>
              </div>
            </div>
            <CreateBatchDialog />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <BatchList />
      </main>
    </div>
  )
}
