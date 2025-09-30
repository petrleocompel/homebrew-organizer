"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Beer, Calendar, Info } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useParams } from "next/navigation";
import { api } from "@/trpc/react";

const bottleStatusColors = {
  empty: "bg-muted text-muted-foreground",
  filled: "bg-chart-4 text-primary-foreground",
  conditioning: "bg-chart-2 text-primary-foreground",
  ready: "bg-chart-1 text-primary-foreground",
};

const batchStatusColors = {
  planning: "bg-secondary text-secondary-foreground",
  brewing: "bg-chart-4 text-primary-foreground",
  fermenting: "bg-chart-2 text-primary-foreground",
  bottled: "bg-chart-1 text-primary-foreground",
  completed: "bg-muted text-muted-foreground",
};

export default function PublicBottlePage() {
  const { id } = useParams<{ id: string }>();
  const { data: bottle, isLoading } = api.bottle.getById.useQuery({
    id: id,
  });
  const { data: batch } = api.batch.getById.useQuery(
    { id: bottle?.currentBatchId || "" },
    { enabled: !!bottle?.currentBatchId }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!bottle) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
                <Beer className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Bottle Not Found</h2>
              <p className="text-muted-foreground">
                This bottle does not exist or has been removed.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
              <Beer className="h-7 w-7 text-primary-foreground" />
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-bold text-balance">
                Bottle #{bottle.bottleNumber}
              </h1>
              <p className="text-sm text-muted-foreground">
                Public Bottle Information
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Bottle Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Bottle Number
                  </p>
                  <Badge variant="outline" className="font-mono text-base">
                    #{bottle.bottleNumber}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Current Status
                  </p>
                  <Badge className={bottleStatusColors[bottle.status]}>
                    {bottle.status}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Created</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">
                      {new Date(bottle.created).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Last Updated
                  </p>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">
                      {new Date(bottle.updated).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {batch ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Beer className="h-5 w-5" />
                  Current Batch
                </CardTitle>
                <CardDescription>
                  This bottle is currently assigned to a batch
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="font-mono">
                      Batch #{batch.batchNumber}
                    </Badge>
                    <Badge className={batchStatusColors[batch.status]}>
                      {batch.status}
                    </Badge>
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-balance">
                    {batch.name}
                  </h3>
                  <p className="text-muted-foreground text-pretty">
                    {batch.description}
                  </p>
                </div>

                {batch.note && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium mb-2">Batch Notes</p>
                      <p className="text-sm text-muted-foreground text-pretty">
                        {batch.note}
                      </p>
                    </div>
                  </>
                )}

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Batch Created
                    </p>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">
                        {new Date(batch.created).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Batch Updated
                    </p>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">
                        {new Date(batch.updated).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                  <Beer className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  No Batch Assigned
                </h3>
                <p className="text-sm text-muted-foreground">
                  This bottle is not currently assigned to any batch.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
