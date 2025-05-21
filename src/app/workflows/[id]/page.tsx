
"use client";

import AppLayout from "@/components/layout/app-layout";
import { mockWorkflows } from "@/lib/mock-data";
import type { Workflow, WorkflowStep } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, ArrowLeft, CalendarDays, Edit3, Layers, ListChecks, UserCircle, CreditCard } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { format, parseISO } from 'date-fns';
import { Spinner } from "@/components/ui/loader";

export default function WorkflowDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      const foundWorkflow = mockWorkflows.find((wf) => wf.id === id);
      setWorkflow(foundWorkflow || null);
    }
    setLoading(false);
  }, [id]);

  if (loading) {
    return <AppLayout><div className="flex justify-center items-center h-64"><Spinner size={36}/></div></AppLayout>;
  }

  if (!workflow) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center text-center py-12">
            <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Workflow Not Found</h1>
            <p className="text-muted-foreground mb-6">
              The workflow you are looking for does not exist or may have been moved.
            </p>
            <Button onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Go to Dashboard
            </Button>
        </div>
      </AppLayout>
    );
  }
  
  const IconComponent = workflow.icon || Layers;

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <Button variant="outline" onClick={() => router.back()} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Workflows
          </Button>
          <Card className="shadow-xl overflow-hidden">
            <CardHeader className="bg-card">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                   <IconComponent className="h-12 w-12 text-primary" />
                  <div>
                    <CardTitle className="text-3xl font-bold text-foreground">{workflow.name}</CardTitle>
                    <CardDescription className="text-base">{workflow.description}</CardDescription>
                  </div>
                </div>
                <Button variant="outline">
                  <Edit3 className="mr-2 h-4 w-4" /> Edit Workflow
                </Button>
              </div>
              <Separator className="my-4" />
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <CalendarDays className="h-4 w-4 mr-2 text-primary" />
                    <span>Created: {format(parseISO(workflow.createdAt), "PPpp")}</span>
                  </div>
                  <div className="flex items-center">
                    <CalendarDays className="h-4 w-4 mr-2 text-primary" />
                    <span>Updated: {format(parseISO(workflow.updatedAt), "PPpp")}</span>
                  </div>
                  {workflow.creatorEmail && (
                    <div className="flex items-center">
                      <UserCircle className="h-4 w-4 mr-2 text-primary" />
                      <span>Creator: {workflow.creatorEmail}</span>
                    </div>
                  )}
                  {workflow.creditCost !== undefined && (
                    <div className="flex items-center">
                      <CreditCard className="h-4 w-4 mr-2 text-primary" />
                      <span>Cost: {workflow.creditCost} credits</span>
                    </div>
                  )}
              </div>
            </CardHeader>

            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4 text-foreground flex items-center">
                <ListChecks className="mr-3 h-6 w-6 text-primary" /> Workflow Steps
              </h2>
              {workflow.steps.length > 0 ? (
                <ScrollArea className="h-[500px] rounded-md">
                  <div className="space-y-6 pr-4">
                    {workflow.steps.map((step: WorkflowStep, index: number) => (
                      <Card key={step.id} className="bg-muted/30 shadow-sm">
                        <CardHeader>
                          <CardTitle className="text-lg text-foreground">Step {index + 1}: {step.description}</CardTitle>
                        </CardHeader>
                        {step.requiredInputs && step.requiredInputs.length > 0 && (
                          <CardContent>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Required Inputs:</p>
                            <div className="flex flex-wrap gap-2">
                              {step.requiredInputs.map((input, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">{input}</Badge>
                              ))}
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-muted-foreground">No steps defined for this workflow.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Placeholder for Usage Statistics or Logs */}
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="text-xl">Usage Statistics</CardTitle>
                <CardDescription>Overview of how this workflow is being used.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Usage statistics will be displayed here in a future update.</p>
                {/* Example: Placeholder for a chart */}
                <div className="mt-4 h-48 w-full bg-muted/50 rounded-md flex items-center justify-center text-muted-foreground" data-ai-hint="graph chart">
                    Chart Placeholder
                </div>
            </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
