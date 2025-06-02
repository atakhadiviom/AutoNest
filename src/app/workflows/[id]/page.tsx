
"use client";

import type { ComponentType } from 'react';
import { useEffect, useState, lazy, Suspense, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { format, parseISO } from 'date-fns';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, Timestamp as FirestoreTimestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';

import AppLayout from "@/components/layout/app-layout";
import { mockWorkflows } from "@/components/../lib/mock-data";
import type { Workflow, WorkflowStep, WorkflowRunLog, AudioTranscriptSummaryOutput, LinkedInPostGeneratorOutput } from "@/lib/types";
import type { KeywordSuggestionOutput } from '@/ai/flows/keyword-suggestion-flow';

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/loader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Textarea } from '@/components/ui/textarea'; // For displaying post text
import { Input } from '@/components/ui/input'; // For displaying image prompt
import { AlertTriangle, ArrowLeft, CalendarDays, Layers, ListChecks, UserCircle, CreditCard, Repeat, History, Activity, Settings2, Database, FileText, AlertCircleIcon, UserRoundCheck, FileAudio, CheckCircle, MessageSquare, BookOpen, Tag, Users, Link as LinkIcon, List, PlayCircle, Copy, Image as ImageIcon, Tags } from "lucide-react";
import Link from 'next/link'; // For external links
import { useToast } from '@/hooks/use-toast';

const runnerComponents: Record<string, ComponentType<any>> = {
  KeywordSuggesterRunner: lazy(() =>
    import('@/components/tools/keyword-suggester-runner').then(module => ({ default: module.KeywordSuggesterRunner }))
  ),
  AudioTranscriberRunner: lazy(() =>
    import('@/components/tools/audio-transcriber-runner').then(module => ({ default: module.AudioTranscriberRunner }))
  ),
  LinkedinPostGeneratorRunner: lazy(() => // Added new runner
    import('@/components/tools/linkedin-post-generator-runner').then(module => ({ default: module.LinkedinPostGeneratorRunner }))
  ),
};

// Helper to check if output is KeywordSuggestionOutput
function isKeywordSuggestionOutput(output: any): output is KeywordSuggestionOutput['suggestions'] {
    return Array.isArray(output) && (output.length === 0 || (output[0] && typeof output[0].keyword === 'string'));
}

function isAudioTranscriptSummaryOutput(output: any): output is AudioTranscriptSummaryOutput {
  return output && typeof output.transcriptSummary === 'object' && output.transcriptSummary !== null && typeof output.transcriptSummary.title === 'string';
}

function isLinkedInPostGeneratorOutput(output: any): output is LinkedInPostGeneratorOutput {
  return output && typeof output.postText === 'string';
}


export default function WorkflowDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loadingWorkflow, setLoadingWorkflow] = useState(true);
  const [RunnerComponent, setRunnerComponent] = useState<ComponentType<any> | null>(null);

  const [runHistory, setRunHistory] = useState<WorkflowRunLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [selectedHistoryLog, setSelectedHistoryLog] = useState<WorkflowRunLog | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!id || !user || authLoading) {
      if (!user && !authLoading) setHistoryError("User not authenticated.");
      setRunHistory([]);
      return;
    }
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
        const data = doc.data();
        let timestamp: Date;
        if (data.timestamp instanceof FirestoreTimestamp) {
          timestamp = data.timestamp.toDate();
        } else if (data.timestamp && typeof data.timestamp.toDate === 'function') { 
          timestamp = data.timestamp.toDate();
        } else if (typeof data.timestamp === 'string') {
           timestamp = new Date(data.timestamp); 
        } else {
           timestamp = new Date(); 
           console.warn("Timestamp was not a Firestore Timestamp or recognizable date format, used current date as fallback for log:", doc.id, data.timestamp);
        }
        history.push({ id: doc.id, ...data, timestamp } as WorkflowRunLog);
      });
      setRunHistory(history);
    } catch (err) {
      console.error("Error fetching workflow history:", err);
      setHistoryError("Failed to load run history. Please try again later.");
    } finally {
      setHistoryLoading(false);
    }
  }, [id, user, authLoading]);


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
    fetchHistory();
  }, [fetchHistory]);

  const handleHistoryCardClick = (log: WorkflowRunLog) => {
    setSelectedHistoryLog(log);
    setIsHistoryDialogOpen(true);
  };

  const handleSuccessfulRun = useCallback(() => {
    setWorkflow(prev => prev ? ({
      ...prev,
      usageCount: prev.usageCount + 1, 
      lastRunDate: new Date().toISOString()
    }) : null);
    fetchHistory(); 
  }, [fetchHistory]);

  const handleCopyToClipboard = async (text: string, type: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied!", description: `${type} copied to clipboard.` });
    } catch (err) {
      toast({ title: "Copy Failed", description: `Could not copy ${type}.`, variant: "destructive" });
    }
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

  const formatFirestoreTimestampOrDate = (timestamp: FirestoreTimestamp | Date): string => {
    if (!timestamp) return "N/A";
    const date = timestamp instanceof FirestoreTimestamp ? timestamp.toDate() : (timestamp instanceof Date ? timestamp : new Date());
    return format(date, "PPpp 'at' HH:mm:ss");
  };

  const renderSummaryList = (title: string, items: string[] | undefined, icon: React.ReactNode) => {
    if (!items || items.length === 0 || (items.length === 1 && items[0] === "Nothing found for this summary list type.")) return null;
    return (
      <div>
        <h4 className="font-semibold text-md mb-1 flex items-center">{icon} {title}</h4>
        <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
          {items.map((item, index) => <li key={index}>{item}</li>)}
        </ul>
      </div>
    );
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
                    <span>Total Usage: {workflow.usageCount} times</span>
                  </div>
                   <div className="flex items-center">
                    <UserRoundCheck className="h-4 w-4 mr-2 text-primary" />
                    <span>Your Usage: {historyLoading ? '...' : runHistory.length} times</span>
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
                        onSuccessfulRun={handleSuccessfulRun}
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
                            Run: {formatFirestoreTimestampOrDate(run.timestamp).split(' at')[0]}
                            <Badge variant={run.status === "Completed" ? "default" : "destructive"}>
                              {run.status}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {formatFirestoreTimestampOrDate(run.timestamp).split('at ')[1]}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="text-sm space-y-1 pb-4">
                          {run.inputDetails?.topic && <p><span className="font-medium">Topic:</span> {run.inputDetails.topic}</p>}
                          {run.inputDetails?.audioFileName && <p><span className="font-medium">Audio:</span> {run.inputDetails.audioFileName}</p>}
                           {run.inputDetails?.linkedinKeyword && <p><span className="font-medium">Keyword:</span> {run.inputDetails.linkedinKeyword || 'N/A'}</p>}
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
          <DialogContent className="sm:max-w-lg md:max-w-2xl lg:max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5 text-primary" />
                Workflow Run Details
              </DialogTitle>
              <DialogDescription>
                Detailed log for {selectedHistoryLog.workflowName} run on {formatFirestoreTimestampOrDate(selectedHistoryLog.timestamp)}.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] p-1 pr-3">
            <div className="space-y-4 py-4">
              <div>
                <h3 className="font-semibold text-foreground mb-1">Run Information</h3>
                <div className="text-sm"><span className="text-muted-foreground">Status:</span> <Badge variant={selectedHistoryLog.status === "Completed" ? "default" : "destructive"}>{selectedHistoryLog.status}</Badge></div>
                <p className="text-sm"><span className="text-muted-foreground">Credits Used:</span> {selectedHistoryLog.creditCostAtRun}</p>
                <p className="text-sm"><span className="text-muted-foreground">User:</span> {selectedHistoryLog.userEmail || 'N/A'}</p>
              </div>
              <Separator />
              <div>
                <h3 className="font-semibold text-foreground mb-1">Input Details</h3>
                {selectedHistoryLog.inputDetails?.topic && (
                  <p className="text-sm bg-muted p-2 rounded-md">Topic: {selectedHistoryLog.inputDetails.topic}</p>
                )}
                 {selectedHistoryLog.inputDetails?.audioFileName && (
                    <div className="text-sm bg-muted p-2 rounded-md space-y-1">
                        <p><span className="font-semibold">Audio File:</span> {selectedHistoryLog.inputDetails.audioFileName}</p>
                        {selectedHistoryLog.inputDetails.audioFileType && <p><span className="font-semibold">Type:</span> {selectedHistoryLog.inputDetails.audioFileType}</p>}
                        {selectedHistoryLog.inputDetails.audioFileSize && <p><span className="font-semibold">Size:</span> {(selectedHistoryLog.inputDetails.audioFileSize / (1024*1024)).toFixed(2)} MB</p>}
                        {selectedHistoryLog.inputDetails.audioStorageUrl && (
                           <div className="mt-2 space-y-2">
                             <p className="flex items-center">
                               <span className="font-semibold">Stored Audio:</span>
                               <Link href={selectedHistoryLog.inputDetails.audioStorageUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-primary hover:underline inline-flex items-center">
                                 Download Original <LinkIcon className="ml-1 h-3 w-3" />
                               </Link>
                             </p>
                             <audio controls src={selectedHistoryLog.inputDetails.audioStorageUrl} className="w-full">
                               Your browser does not support the audio element.
                             </audio>
                           </div>
                        )}
                    </div>
                 )}
                 {selectedHistoryLog.inputDetails?.linkedinKeyword !== undefined && (
                    <p className="text-sm bg-muted p-2 rounded-md">LinkedIn Keyword: {selectedHistoryLog.inputDetails.linkedinKeyword || '(Not provided)'}</p>
                 )}
                {!selectedHistoryLog.inputDetails?.topic && !selectedHistoryLog.inputDetails?.audioFileName && selectedHistoryLog.inputDetails?.linkedinKeyword === undefined && (
                  <p className="text-sm text-muted-foreground">No specific input details recorded for this run type.</p>
                )}
              </div>
              <Separator />
              <div>
                <h3 className="font-semibold text-foreground mb-1">Output</h3>
                {selectedHistoryLog.status === 'Completed' ? (
                  <>
                    {isKeywordSuggestionOutput(selectedHistoryLog.fullOutput) && (
                        <Card className="bg-muted/50 p-3 text-sm">
                          <CardHeader className="p-0 pb-2">
                             <CardTitle className="text-base">Suggested Keywords:</CardTitle>
                          </CardHeader>
                          <CardContent className="p-0">
                            <ul className="list-disc pl-5 space-y-1 max-h-60 overflow-y-auto">
                              {selectedHistoryLog.fullOutput.map((item, index) => (
                                <li key={index}>
                                  <strong>{item.keyword}</strong>
                                  {item.potentialUse && <span className="text-xs text-muted-foreground"> - {item.potentialUse}</span>}
                                  {item.relevanceScore !== undefined && <Badge variant="outline" className="ml-2 text-xs">{(item.relevanceScore * 100).toFixed(0)}%</Badge>}
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                    )}
                    {isAudioTranscriptSummaryOutput(selectedHistoryLog.fullOutput) && selectedHistoryLog.fullOutput.transcriptSummary && (
                        <Card className="bg-muted/50 p-3 text-sm">
                            <CardHeader className="p-0 pb-2">
                                <CardTitle className="text-base">Transcript Summary: {selectedHistoryLog.fullOutput.transcriptSummary.title}</CardTitle>
                                <CardDescription>Sentiment: <Badge variant={selectedHistoryLog.fullOutput.transcriptSummary.sentiment === "optimistic" ? "default" : "secondary"}>{selectedHistoryLog.fullOutput.transcriptSummary.sentiment}</Badge></CardDescription>
                            </CardHeader>
                            <CardContent className="p-0 space-y-3">
                                <div>
                                    <h4 className="font-semibold text-sm mt-2 mb-1">Full Summary:</h4>
                                    <p className="text-xs text-muted-foreground whitespace-pre-line">{selectedHistoryLog.fullOutput.transcriptSummary.summary}</p>
                                </div>
                                <Accordion type="single" collapsible className="w-full text-xs">
                                  <AccordionItem value="main-points"><AccordionTrigger className="text-xs py-2">Main Points</AccordionTrigger><AccordionContent className="pt-1 pb-2">{renderSummaryList("", selectedHistoryLog.fullOutput.transcriptSummary.main_points, <CheckCircle className="mr-2 h-3 w-3 text-green-500" />)}</AccordionContent></AccordionItem>
                                  <AccordionItem value="action-items"><AccordionTrigger className="text-xs py-2">Action Items</AccordionTrigger><AccordionContent className="pt-1 pb-2">{renderSummaryList("", selectedHistoryLog.fullOutput.transcriptSummary.action_items, <List className="mr-2 h-3 w-3 text-blue-500" />)}</AccordionContent></AccordionItem>
                                  <AccordionItem value="follow-up"><AccordionTrigger className="text-xs py-2">Follow Up</AccordionTrigger><AccordionContent className="pt-1 pb-2">{renderSummaryList("", selectedHistoryLog.fullOutput.transcriptSummary.follow_up, <Activity className="mr-2 h-3 w-3 text-purple-500" />)}</AccordionContent></AccordionItem>
                                  <AccordionItem value="stories"><AccordionTrigger className="text-xs py-2">Stories</AccordionTrigger><AccordionContent className="pt-1 pb-2">{renderSummaryList("", selectedHistoryLog.fullOutput.transcriptSummary.stories, <BookOpen className="mr-2 h-3 w-3 text-orange-500" />)}</AccordionContent></AccordionItem>
                                  <AccordionItem value="references"><AccordionTrigger className="text-xs py-2">References</AccordionTrigger><AccordionContent className="pt-1 pb-2">{renderSummaryList("", selectedHistoryLog.fullOutput.transcriptSummary.references, <Users className="mr-2 h-3 w-3 text-teal-500" />)}</AccordionContent></AccordionItem>
                                  <AccordionItem value="arguments"><AccordionTrigger className="text-xs py-2">Arguments</AccordionTrigger><AccordionContent className="pt-1 pb-2">{renderSummaryList("", selectedHistoryLog.fullOutput.transcriptSummary.arguments, <MessageSquare className="mr-2 h-3 w-3 text-indigo-500" />)}</AccordionContent></AccordionItem>
                                  <AccordionItem value="related-topics"><AccordionTrigger className="text-xs py-2">Related Topics</AccordionTrigger><AccordionContent className="pt-1 pb-2">{renderSummaryList("", selectedHistoryLog.fullOutput.transcriptSummary.related_topics, <Tag className="mr-2 h-3 w-3 text-pink-500" />)}</AccordionContent></AccordionItem>
                                </Accordion>
                            </CardContent>
                        </Card>
                    )}
                    {isLinkedInPostGeneratorOutput(selectedHistoryLog.fullOutput) && (
                        <Card className="bg-muted/50 p-3 text-sm space-y-3">
                            <div>
                                <Label className="text-xs font-medium flex items-center">Post Text <Button variant="ghost" size="icon" className="ml-auto h-6 w-6" onClick={() => handleCopyToClipboard(selectedHistoryLog.fullOutput!.postText, "Post text")}><Copy className="h-3 w-3" /></Button></Label>
                                <Textarea readOnly value={selectedHistoryLog.fullOutput.postText} className="min-h-[100px] bg-background text-xs mt-1"/>
                            </div>
                            {selectedHistoryLog.fullOutput.suggestedImagePrompt && (
                            <div>
                                <Label className="text-xs font-medium flex items-center">Suggested Image Prompt <Button variant="ghost" size="icon" className="ml-auto h-6 w-6" onClick={() => handleCopyToClipboard(selectedHistoryLog.fullOutput!.suggestedImagePrompt!, "Image prompt")}><Copy className="h-3 w-3" /></Button></Label>
                                <Input readOnly value={selectedHistoryLog.fullOutput.suggestedImagePrompt} className="bg-background text-xs mt-1"/>
                            </div>
                            )}
                            {selectedHistoryLog.fullOutput.hashtags && selectedHistoryLog.fullOutput.hashtags.length > 0 && (
                            <div>
                                <Label className="text-xs font-medium flex items-center">Hashtags <Button variant="ghost" size="icon" className="ml-auto h-6 w-6" onClick={() => handleCopyToClipboard(selectedHistoryLog.fullOutput!.hashtags!.join(' '), "Hashtags")}><Copy className="h-3 w-3" /></Button></Label>
                                <div className="mt-1 flex flex-wrap gap-1">
                                {selectedHistoryLog.fullOutput.hashtags.map((tag, idx) => <Badge key={idx} variant="secondary" className="text-xs">{tag}</Badge>)}
                                </div>
                            </div>
                            )}
                        </Card>
                    )}
                    {!isKeywordSuggestionOutput(selectedHistoryLog.fullOutput) && !isAudioTranscriptSummaryOutput(selectedHistoryLog.fullOutput) && !isLinkedInPostGeneratorOutput(selectedHistoryLog.fullOutput) && typeof selectedHistoryLog.fullOutput === 'string' && (
                        <pre className="text-xs bg-muted p-2 rounded-md whitespace-pre-wrap">{selectedHistoryLog.fullOutput}</pre>
                    )}
                     {!isKeywordSuggestionOutput(selectedHistoryLog.fullOutput) && !isAudioTranscriptSummaryOutput(selectedHistoryLog.fullOutput) && !isLinkedInPostGeneratorOutput(selectedHistoryLog.fullOutput) && typeof selectedHistoryLog.fullOutput !== 'string' && selectedHistoryLog.fullOutput && (
                        <p className="text-sm text-muted-foreground">Output recorded (type: {typeof selectedHistoryLog.fullOutput}). No specific display for this format. Summary: {selectedHistoryLog.outputSummary}</p>
                     )}
                     {!selectedHistoryLog.fullOutput && (
                        <p className="text-sm text-muted-foreground">No full output recorded. Summary: {selectedHistoryLog.outputSummary || 'N/A'}</p>
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
