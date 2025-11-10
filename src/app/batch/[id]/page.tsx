import { BottleManager } from "@/components/bottle-manager";
import { Beer, ArrowLeft, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function BatchBottlesPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/" className="h-16">
                <ChevronLeft className="h-8 w-8" />
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Beer className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-balance">
                  Bottle Management
                </h1>
                <p className="text-sm text-muted-foreground">
                  Manage bottles for this batch
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <BottleManager batchId={params.id} />
      </main>
    </div>
  );
}
