
"use client";

import type { ComponentType, ReactNode} from 'react';
import { useEffect, useState, lazy, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { format, parseISO } from 'date-fns';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, Timestamp as FirestoreTimestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';

import AppLayout from "@/components/layout/app-layout";
import { mockWorkflows } from "@/lib/mock-data";
import type { Workflow, WorkflowStep, WorkflowRunLog } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/ui/loader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, ArrowLeft, CalendarDays, Layers, ListChecks, UserCircle, CreditCard, Repeat, History, Activity, Settings2, Database } from "lucide-react";

// Dynamically import runner components
const runnerComponents: Record<string, ComponentType<any>> = {
  KeywordSuggesterRunner: lazy(() => 
    import('@/components/tools/keyword-suggester-runner').then(module => ({ default: module.KeywordSuggesterRunner }))
  ),
  // Add other runners here as needed
};

export default function WorkflowDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { user, loading: authLoading } = useAuth();

  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loadingWorkflow, setLoadingWorkflow] = useState(true);
  const [RunnerComponent, setRunnerComponent] = useState<ComponentType<any> | null>(null);
  
  const [runHistory, setRunHistory] = useState<WorkflowRunLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      const foundWorkflow = mockWorkflows.find((wf) => wf.id === id);
      setWorkflow(foundWorkflow || null);
      if (foundWorkflow?.isTool && foundWorkflow.runComponent && runnerComponents[foundWorkflow.runComponent]) {
        setRunnerComponent(() => runnerComponents[foundWorkflow.runComponent!]);
      } else {
        setRunnerComponent(null);
      }
    }
    setLoadingWorkflow(false);
  }, [id]);

  useEffect(() => {
    if (!id || !user || authLoading) {
      // If no ID, user not loaded, or auth is still loading, don't fetch yet or clear history
      if (!user && !authLoading) setHistoryError("User not authenticated.");
      setRunHistory([]); // Clear history if user logs out or workflow ID changes
      return;
    }

    const fetchHistory = async () => {
      setHistoryLoading(true);
      setHistoryError(null);
      try {
        const q = query(
          collection(db, "workflowRunLogs"),
          where("workflowId", "==", id),
          where("userId", "==", user.uid),
          orderBy("timestamp", "desc")
        );
        const querySnapshot = await getDocs(q);
        const history: WorkflowRunLog[] = [];
        querySnapshot.forEach((doc) => {
          history.push({ id: doc.id, ...doc.data() } as WorkflowRunLog);
        });
        setRunHistory(history);
      } catch (err) {
        console.error("Error fetching workflow history:", err);
        setHistoryError("Failed to load run history. Please try again later.");
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchHistory();
  }, [id, user, authLoading]);


  if (loadingWorkflow || authLoading) {
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

  const formatFirestoreTimestamp = (timestamp: FirestoreTimestamp | Date): string => {
    if (!timestamp) return "N/A";
    const date = timestamp instanceof FirestoreTimestamp ? timestamp.toDate() : timestamp;
    return format(date, "PPpp");
  };

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
                {workflow.isTool && RunnerComponent && (
                    <Button variant="default" size="lg" onClick={() => document.getElementById('runner-section')?.scrollIntoView({ behavior: 'smooth' })}>
                        <Settings2 className="mr-2 h-5 w-5" /> Run Tool
                    </Button>
                )}
              </div>
              <Separator className="my-4" />
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-sm text-muted-foreground">
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
                  <div className="flex items-center">
                    <Repeat className="h-4 w-4 mr-2 text-primary" />
                    <span>Usage: {workflow.usageCount} times</span>
                  </div>
                  {workflow.lastRunDate && (
                    <div className="flex items-center">
                        <History className="h-4 w-4 mr-2 text-primary" />
                        <span>Last Run: {format(parseISO(workflow.lastRunDate), "PPpp")}</span>
                    </div>
                  )}
              </div>
            </CardHeader>

            <CardContent className="p-6">
              {RunnerComponent && workflow.isTool ? (
                <section id="runner-section" className="mt-4">
                  <Suspense fallback={<div className="flex justify-center items-center p-8"><Spinner size={32} /> Loading Tool...</div>}>
                    <RunnerComponent 
                        creditCost={workflow.creditCost} 
                        workflowId={workflow.id} 
                        workflowName={workflow.name} 
                    />
                  </Suspense>
                </section>
              ) : (
                <>
                  <h2 className="text-2xl font-semibold mb-4 text-foreground flex items-center">
                    <ListChecks className="mr-3 h-6 w-6 text-primary" /> Workflow Steps
                  </h2>
                  {workflow.steps.length > 0 ? (
                    <ScrollArea className="h-[300px] rounded-md">
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
                </>
              )}
            </CardContent>
          </Card>
        </div>
        
        <Card className="shadow-lg mt-8">
            <CardHeader>
                <CardTitle className="text-xl flex items-center">
                  <Activity className="mr-3 h-6 w-6 text-primary" />
                  Activity & History
                </CardTitle>
                <CardDescription>Recent executions and logs for this {workflow.isTool ? 'tool' : 'workflow'}.</CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex justify-center items-center py-8"><Spinner size={32}/> Loading history...</div>
              ) : historyError ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error Loading History</AlertTitle>
                  <AlertDescription>{historyError}</AlertDescription>
                </Alert>
              ) : runHistory.length > 0 ? (
                <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Input</TableHead>
                      <TableHead>Output/Error</TableHead>
                      <TableHead className="text-right">Credits</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runHistory.map((run) => (
                      <TableRow key={run.id}>
                        <TableCell className="text-xs">{formatFirestoreTimestamp(run.timestamp)}</TableCell>
                        <TableCell>
                          <Badge variant={run.status === "Completed" ? "default" : "destructive"}>
                            {run.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{run.inputDetails?.topic || '-'}</TableCell>
                        <TableCell className="text-xs max-w-xs truncate">
                          {run.status === 'Completed' ? run.outputSummary : run.errorDetails || '-'}
                        </TableCell>
                        <TableCell className="text-right text-xs">{run.creditCostAtRun}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <Database className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No run history available for this {workflow.isTool ? 'tool' : 'workflow'} yet.</p>
                  <p className="text-sm text-muted-foreground">Executions will appear here once the {workflow.isTool ? 'tool' : 'workflow'} is run.</p>
                </div>
              )}
            </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
