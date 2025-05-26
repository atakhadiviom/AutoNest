
"use client";

import type { FC } from "react";
import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { app as firebaseApp, db } from "@/lib/firebase"; // Ensure 'app' is exported and db is imported

import { transcribeAndSummarizeAudio } from "@/ai/flows/audio-transcription-flow";
import type { AudioTranscriptSummaryOutput, WorkflowRunLog } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Mic, FileAudio, AlertCircle, Loader2, Info, CreditCard, List, CheckCircle, MessageSquare, BookOpen, Tag, Activity, Users, UploadCloud } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const ACCEPTED_AUDIO_TYPES = [
  "audio/mpeg", // .mp3
  "audio/ogg",  // .ogg
  "audio/wav",  // .wav
  "audio/aac",  // .aac
  "audio/flac", // .flac
  "audio/webm", // .webm
  "audio/mp4",  // .m4a (often mp4 container)
];

const formSchema = z.object({
  audioFile: z
    .custom<FileList>((val) => val instanceof FileList && val.length > 0, "Please select an audio file.")
    .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE, `Max file size is 15MB.`)
    .refine(
      (files) => ACCEPTED_AUDIO_TYPES.includes(files?.[0]?.type),
      "Unsupported file type. Please upload an MP3, OGG, WAV, AAC, FLAC, or M4A file."
    ),
});

interface AudioTranscriberRunnerProps {
  creditCost?: number;
  workflowId: string;
  workflowName: string;
  onSuccessfulRun: () => void;
}

const storage = getStorage(firebaseApp);

export const AudioTranscriberRunner: FC<AudioTranscriberRunnerProps> = ({
  creditCost = 10,
  workflowId,
  workflowName,
  onSuccessfulRun,
}) => {
  const [summaryOutput, setSummaryOutput] = useState<AudioTranscriptSummaryOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, deductCredits, loading: authLoading } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const hasEnoughCredits = user ? user.credits >= creditCost : false;

  const logRunToFirestore = async (
    status: 'Completed' | 'Failed',
    inputFile: File | null,
    output: AudioTranscriptSummaryOutput | null,
    audioStorageUrl?: string,
    errorMessage?: string
  ) => {
    if (!user) {
      console.error("Cannot log run: user not available.");
      return;
    }
    try {
      const inputDetails: WorkflowRunLog['inputDetails'] = inputFile ? {
        audioFileName: inputFile.name,
        audioFileType: inputFile.type,
        audioFileSize: inputFile.size,
      } : {};

      if (audioStorageUrl) {
        inputDetails.audioStorageUrl = audioStorageUrl;
      }

      const logEntry: Omit<WorkflowRunLog, 'id' | 'timestamp'> & { timestamp: any } = {
        workflowId,
        workflowName,
        userId: user.uid,
        userEmail: user.email,
        timestamp: serverTimestamp(),
        status,
        inputDetails,
        creditCostAtRun: creditCost,
        ...(status === 'Completed' && output?.transcriptSummary && {
          outputSummary: `Summary generated: "${output.transcriptSummary.title}"`,
          fullOutput: output,
        }),
        ...(status === 'Failed' && errorMessage && { errorDetails: errorMessage }),
      };

      await addDoc(collection(db, "workflowRunLogs"), logEntry);
      console.log("Audio transcription run logged to Firestore with input details:", inputDetails);
    } catch (e) {
      console.error("Error logging audio transcription run to Firestore:", e);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || authLoading) {
      toast({ title: "Authentication Error", description: "User not available. Please try again.", variant: "destructive" });
      return;
    }

    if (!hasEnoughCredits) {
      toast({
        title: "Insufficient Credits",
        description: `You need ${creditCost} credits, but you only have ${user.credits}.`,
        variant: "destructive",
      });
      setError(`Insufficient credits. You need ${creditCost}, you have ${user.credits}.`);
      return;
    }

    const audioFile = values.audioFile[0];
    if (!audioFile) {
      setError("No audio file selected.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSummaryOutput(null);
    let audioStorageUrl: string | undefined = undefined;

    try {
      // 1. Upload to Firebase Storage
      toast({ title: "Uploading audio...", description: "Please wait while your file is being uploaded.", duration: 5000 });
      const filePath = `user_audio_uploads/${user.uid}/${workflowId}/${Date.now()}-${audioFile.name}`;
      const fileRef = storageRef(storage, filePath);
      
      console.log(`[AudioTranscriberRunner] Attempting to upload to: ${filePath}`);
      await uploadBytes(fileRef, audioFile);
      audioStorageUrl = await getDownloadURL(fileRef);
      console.log(`[AudioTranscriberRunner] File uploaded successfully. URL: ${audioStorageUrl}`);
      toast({ title: "Upload Complete!", description: "Now processing your audio for transcription and summary.", duration: 5000 });

      // 2. Send to n8n for transcription/summary
      const result = await transcribeAndSummarizeAudio(audioFile);
      setSummaryOutput(result);

      // 3. Deduct credits & Log
      await deductCredits(creditCost);
      await logRunToFirestore('Completed', audioFile, result, audioStorageUrl);
      onSuccessfulRun();
      toast({
        title: "Transcription & Summary Complete!",
        description: `Processed "${audioFile.name}". ${creditCost} credits used.`,
      });
      form.reset();
      setSelectedFileName(null);
    } catch (e) {
      console.error("[AudioTranscriberRunner] Error in onSubmit:", e);
      const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred during processing.";
      setError(errorMessage);
      // Log failure even if storage upload succeeded but n8n failed, or if storage failed.
      await logRunToFirestore('Failed', audioFile, null, audioStorageUrl, errorMessage);
      toast({
        title: "Processing Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const renderList = (title: string, items: string[] | undefined, icon: React.ReactNode) => {
    if (!items || items.length === 0) return null;
    return (
      <div>
        <h4 className="font-semibold text-md mb-1 flex items-center">{icon} {title}</h4>
        <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
          {items.map((item, index) => <li key={index}>{item}</li>)}
        </ul>
      </div>
    );
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setSelectedFileName(files[0].name);
      form.setValue("audioFile", files, { shouldValidate: true });
    } else {
      setSelectedFileName(null);
      form.setValue("audioFile", new DataTransfer().files, { shouldValidate: true });
    }
  };

  return (
    <div className="space-y-6 mt-6">
      <Card className="shadow-md border-border/50">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <CardTitle className="text-xl flex items-center">
                <Mic className="mr-2 h-5 w-5 text-primary" />
                Audio Transcription & Summarization
              </CardTitle>
              <CardDescription>
                Upload an audio file (MP3, OGG, WAV, AAC, FLAC, M4A - max 15MB) to transcribe and summarize its content. The file will also be stored.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="flex items-center whitespace-nowrap shrink-0">
              <CreditCard className="mr-1.5 h-4 w-4" /> Cost: {creditCost} Credits
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="audioFile"
                render={({ field }) => ( // We don't use field directly due to custom onChange
                  <FormItem>
                    <FormLabel>Audio File</FormLabel>
                    <FormControl>
                       <Input
                          type="file"
                          accept={ACCEPTED_AUDIO_TYPES.join(",")}
                          onChange={handleFileChange}
                          className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                        />
                    </FormControl>
                    {selectedFileName && <p className="text-sm text-muted-foreground mt-1">Selected: {selectedFileName}</p>}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                disabled={isLoading || authLoading || !hasEnoughCredits || !form.formState.isValid}
                className="w-full sm:w-auto"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing Audio...
                  </>
                ) : (
                  <>
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Upload, Transcribe & Summarize
                  </>
                )}
              </Button>
              {!authLoading && !hasEnoughCredits && user && (
                <p className="text-sm text-destructive">
                  Not enough credits. You need {creditCost}, but have {user.credits}.
                </p>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {summaryOutput && summaryOutput.transcriptSummary && (
        <Card className="shadow-md border-border/50">
          <CardHeader>
            <CardTitle className="text-xl">{summaryOutput.transcriptSummary.title}</CardTitle>
            <CardDescription>Sentiment: <Badge variant={summaryOutput.transcriptSummary.sentiment === "optimistic" ? "default" : "secondary"}>{summaryOutput.transcriptSummary.sentiment}</Badge></CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] rounded-md p-1 pr-2">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Summary</h3>
                  <p className="text-muted-foreground whitespace-pre-line">{summaryOutput.transcriptSummary.summary}</p>
                </div>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="main-points">
                    <AccordionTrigger className="text-md font-semibold">Main Points</AccordionTrigger>
                    <AccordionContent>{renderList("", summaryOutput.transcriptSummary.main_points, <CheckCircle className="mr-2 h-4 w-4 text-green-500" />)}</AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="action-items">
                    <AccordionTrigger className="text-md font-semibold">Action Items</AccordionTrigger>
                    <AccordionContent>{renderList("", summaryOutput.transcriptSummary.action_items, <List className="mr-2 h-4 w-4 text-blue-500" />)}</AccordionContent>
                  </AccordionItem>
                   <AccordionItem value="follow-up">
                    <AccordionTrigger className="text-md font-semibold">Follow Up</AccordionTrigger>
                    <AccordionContent>{renderList("", summaryOutput.transcriptSummary.follow_up, <Activity className="mr-2 h-4 w-4 text-purple-500" />)}</AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="stories">
                    <AccordionTrigger className="text-md font-semibold">Stories</AccordionTrigger>
                    <AccordionContent>{renderList("", summaryOutput.transcriptSummary.stories, <BookOpen className="mr-2 h-4 w-4 text-orange-500" />)}</AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="references">
                    <AccordionTrigger className="text-md font-semibold">References</AccordionTrigger>
                    <AccordionContent>{renderList("", summaryOutput.transcriptSummary.references, <Users className="mr-2 h-4 w-4 text-teal-500" />)}</AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="arguments">
                    <AccordionTrigger className="text-md font-semibold">Arguments</AccordionTrigger>
                    <AccordionContent>{renderList("", summaryOutput.transcriptSummary.arguments, <MessageSquare className="mr-2 h-4 w-4 text-indigo-500" />)}</AccordionContent>
                  </AccordionItem>
                   <AccordionItem value="related-topics">
                    <AccordionTrigger className="text-md font-semibold">Related Topics</AccordionTrigger>
                    <AccordionContent>{renderList("", summaryOutput.transcriptSummary.related_topics, <Tag className="mr-2 h-4 w-4 text-pink-500" />)}</AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </ScrollArea>
          </CardContent>
           <CardFooter className="text-xs text-muted-foreground pt-4">
             Summary generated from audio. Audio file also stored.
          </CardFooter>
        </Card>
      )}
      {summaryOutput && !summaryOutput.transcriptSummary && !isLoading && !error && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>No Summary Found</AlertTitle>
          <AlertDescription>
            The service processed the audio, but no summary was returned in the expected format.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
