
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
import type { KeywordSuggestionOutput } from '@/ai/flows/keyword-suggestion-flow'; // For typing fullOutput
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/loader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, ArrowLeft, CalendarDays, Layers, ListChecks, UserCircle, CreditCard, Repeat, History, Activity, Settings2, Database, FileText, AlertCircleIcon } from "lucide-react";

const runnerComponents: Record<string, ComponentType<any>> = {
  KeywordSuggesterRunner: lazy(() => 
    import('@/components/tools/keyword-suggester-runner').then(module => ({ default: module.KeywordSuggesterRunner }))
  ),
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

  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [selectedHistoryLog, setSelectedHistoryLog] = useState<WorkflowRunLog | null>(null);

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
      if (!user && !authLoading) setHistoryError("User not authenticated.");
      setRunHistory([]);
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

  const handleHistoryCardClick = (log: WorkflowRunLog) => {
    setSelectedHistoryLog(log);
    setIsHistoryDialogOpen(true);
  };

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
    return format(date, "PPpp 'at' HH:mm:ss"); // More precise time
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
                <CardDescription>Recent executions and logs for this {workflow.isTool ? 'tool' : 'workflow'}. Click a card to view details.</CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex justify-center items-center py-8"><Spinner size={32}/> Loading history...</div>
              ) : historyError ? (
                <Alert variant="destructive">
                  <AlertCircleIcon className="h-4 w-4" />
                  <AlertTitle>Error Loading History</AlertTitle>
                  <AlertDescription>{historyError}</AlertDescription>
                </Alert>
              ) : runHistory.length > 0 ? (
                <ScrollArea className="h-[400px] pr-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {runHistory.map((run) => (
                      <Card 
                        key={run.id} 
                        className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => handleHistoryCardClick(run)}
                      >
                        <CardHeader className="pb-3">
                          <CardTitle className="text-md flex justify-between items-center">
                            Run: {formatFirestoreTimestamp(run.timestamp).split(' at')[0]}
                            <Badge variant={run.status === "Completed" ? "default" : "destructive"}>
                              {run.status}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {formatFirestoreTimestamp(run.timestamp).split('at ')[1]}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="text-sm space-y-1 pb-4">
                          {run.inputDetails?.topic && <p><span className="font-medium">Input:</span> {run.inputDetails.topic}</p>}
                          <p><span className="font-medium">Credits:</span> {run.creditCostAtRun}</p>
                          <p className="truncate"><span className="font-medium">Summary:</span> {run.status === 'Completed' ? run.outputSummary : run.errorDetails || 'N/A'}</p>
                        </CardContent>
                        <CardFooter className="text-xs text-primary pt-2 pb-3">
                          Click to view details
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
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

      {selectedHistoryLog && (
        <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
          <DialogContent className="sm:max-w-lg md:max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5 text-primary" />
                Workflow Run Details
              </DialogTitle>
              <DialogDescription>
                Detailed log for {selectedHistoryLog.workflowName} run on {formatFirestoreTimestamp(selectedHistoryLog.timestamp)}.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] p-1 pr-3">
            <div className="space-y-4 py-4">
              <div>
                <h3 className="font-semibold text-foreground mb-1">Run Information</h3>
                <p className="text-sm"><span className="text-muted-foreground">Status:</span> <Badge variant={selectedHistoryLog.status === "Completed" ? "default" : "destructive"}>{selectedHistoryLog.status}</Badge></p>
                <p className="text-sm"><span className="text-muted-foreground">Credits Used:</span> {selectedHistoryLog.creditCostAtRun}</p>
                <p className="text-sm"><span className="text-muted-foreground">User:</span> {selectedHistoryLog.userEmail || 'N/A'}</p>
              </div>
              <Separator />
              <div>
                <h3 className="font-semibold text-foreground mb-1">Input</h3>
                {selectedHistoryLog.inputDetails?.topic ? (
                  <p className="text-sm bg-muted p-2 rounded-md">Topic: {selectedHistoryLog.inputDetails.topic}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No input details recorded.</p>
                )}
              </div>
              <Separator />
              <div>
                <h3 className="font-semibold text-foreground mb-1">Output</h3>
                {selectedHistoryLog.status === 'Completed' ? (
                  <>
                    <p className="text-sm text-muted-foreground mb-1">{selectedHistoryLog.outputSummary}</p>
                    {Array.isArray(selectedHistoryLog.fullOutput) && selectedHistoryLog.fullOutput.length > 0 ? (
                        <Card className="bg-muted/50 p-3 text-sm">
                          <CardHeader className="p-0 pb-2">
                             <CardTitle className="text-base">Suggested Keywords:</CardTitle>
                          </CardHeader>
                          <CardContent className="p-0">
                            <ul className="list-disc pl-5 space-y-1 max-h-60 overflow-y-auto">
                              {(selectedHistoryLog.fullOutput as KeywordSuggestionOutput['suggestions']).map((item, index) => (
                                <li key={index}>
                                  <strong>{item.keyword}</strong>
                                  {item.potentialUse && <span className="text-xs text-muted-foreground"> - {item.potentialUse}</span>}
                                  {item.relevanceScore !== undefined && <Badge variant="outline" className="ml-2 text-xs">{(item.relevanceScore * 100).toFixed(0)}%</Badge>}
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                    ) : typeof selectedHistoryLog.fullOutput === 'string' ? (
                        <pre className="text-xs bg-muted p-2 rounded-md whitespace-pre-wrap">{selectedHistoryLog.fullOutput}</pre>
                    ) : (
                      <p className="text-sm text-muted-foreground">No detailed output recorded.</p>
                    )}
                  </>
                ) : (
                  <Alert variant="destructive">
                    <AlertCircleIcon className="h-4 w-4" />
                    <AlertTitle>Error Details</AlertTitle>
                    <AlertDescription>{selectedHistoryLog.errorDetails || 'No specific error message recorded.'}</AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
            </ScrollArea>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  );
}
