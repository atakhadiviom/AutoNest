
"use client";

import type { FC, ChangeEvent } from "react";
import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { app as firebaseApp, db } from "@/lib/firebase";

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
import { AlertCircle, Loader2, Info, CreditCard, List, CheckCircle, MessageSquare, BookOpen, Tag, Activity, Users, UploadCloud, FileAudio, PlayCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
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
    .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE, `Max file size is 10MB.`)
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
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, deductCredits, loading: authLoading } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const hasEnoughCredits = user ? user.credits >= creditCost : false;

  // Cleanup object URL when component unmounts or audioPreviewUrl changes
  useEffect(() => {
    return () => {
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
        console.log("[AudioTranscriberRunner] Revoked old audio preview URL:", audioPreviewUrl);
      }
    };
  }, [audioPreviewUrl]);


  const logRunToFirestore = async (
    status: 'Completed' | 'Failed',
    inputFile: File | null,
    output: AudioTranscriptSummaryOutput | null,
    audioStorageUrl?: string,
    errorMessage?: string
  ) => {
    if (!user) {
      console.error("[AudioTranscriberRunner] Cannot log run: user not available.");
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
      console.log("[AudioTranscriberRunner] Audio transcription run logged to Firestore. Log ID (client-side, not actual Firestore ID):", Date.now(), "Details:", logEntry);
    } catch (e: any)  {
      console.error("[AudioTranscriberRunner] Error logging audio transcription run to Firestore:", e.message, e);
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
      console.log("[AudioTranscriberRunner] Starting file upload to Firebase Storage for:", audioFile.name);
      toast({ title: "Uploading audio...", description: "Please wait while your file is being uploaded.", duration: 5000 });
      const filePath = `user_audio_uploads/${user.uid}/${workflowId}/${Date.now()}-${audioFile.name}`;
      const fileRef = storageRef(storage, filePath);
      
      await uploadBytes(fileRef, audioFile);
      audioStorageUrl = await getDownloadURL(fileRef);
      console.log(`[AudioTranscriberRunner] Firebase upload successful. URL: ${audioStorageUrl}`);
      toast({ title: "Upload Complete!", description: "Now processing your audio for transcription and summary.", duration: 5000 });

      console.log("[AudioTranscriberRunner] Attempting to call transcribeAndSummarizeAudio with file:", audioFile.name);
      try {
        const result = await transcribeAndSummarizeAudio(audioFile);
        console.log("[AudioTranscriberRunner] transcribeAndSummarizeAudio call SUCCEEDED. Result preview:", JSON.stringify(result, null, 2).substring(0, 300));
        setSummaryOutput(result);
        await deductCredits(creditCost);
        await logRunToFirestore('Completed', audioFile, result, audioStorageUrl);
        onSuccessfulRun();
        toast({
          title: "Transcription & Summary Complete!",
          description: `Processed "${audioFile.name}". ${creditCost} credits used.`,
        });
        form.reset();
        setSelectedFileName(null);
        if (audioPreviewUrl) { // Clean up preview URL after successful submission
            URL.revokeObjectURL(audioPreviewUrl);
            setAudioPreviewUrl(null);
        }
      } catch (serverActionError: any) {
        console.error("[AudioTranscriberRunner] Call to 'transcribeAndSummarizeAudio' FAILED. Error object received by client:", serverActionError);
        let detailedErrorMessage = "An unexpected response was received from the server.";

        if (serverActionError && typeof serverActionError === 'object') {
            if (serverActionError.message) {
                detailedErrorMessage = serverActionError.message;
            }
             // Additional logging of common error properties
            if ('name' in serverActionError) console.error("[AudioTranscriberRunner] serverActionError.name:", serverActionError.name);
            if ('stack' in serverActionError) console.error("[AudioTranscriberRunner] serverActionError.stack (first 300 chars):", String(serverActionError.stack).substring(0,300));
            if ('digest' in serverActionError) console.error("[AudioTranscriberRunner] serverActionError.digest (Next.js specific):", serverActionError.digest);
        }
        console.error("[AudioTranscriberRunner] CHECK SERVER LOGS (Next.js console) FOR THE ORIGINAL ERROR FROM 'audio-transcription-flow.ts'.");
        console.error("[AudioTranscriberRunner] Client-side constructed detailed error message:", detailedErrorMessage);
        // Re-throw to be caught by the outer catch, which handles UI updates and Firestore logging
        throw new Error(`Server processing error: ${detailedErrorMessage}`);
      }
    } catch (e: any) { 
      console.error("[AudioTranscriberRunner] Error in onSubmit (outer catch):", e);
      // Log the full error object `e` here as well for the outer catch, providing more structure if available.
      // Using Object.getOwnPropertyNames helps serialize non-enumerable properties of Error objects
      console.error("[AudioTranscriberRunner] Full error object in outer catch (stringified with Object.getOwnPropertyNames):", JSON.stringify(e, Object.getOwnPropertyNames(e || {})));

      const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred during the process.";
      setError(errorMessage);
      
      const fileToLog = values.audioFile?.[0] || (selectedFileName ? new File([], selectedFileName) : null);
      await logRunToFirestore('Failed', fileToLog, null, audioStorageUrl, errorMessage);
      
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

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (audioPreviewUrl) { // Revoke previous URL if exists
      URL.revokeObjectURL(audioPreviewUrl);
      setAudioPreviewUrl(null); // Important to set to null before creating a new one
      console.log("[AudioTranscriberRunner] Revoked old audio preview URL in handleFileChange.");
    }
    if (files && files.length > 0) {
      const file = files[0];
      setSelectedFileName(file.name);
      const newPreviewUrl = URL.createObjectURL(file);
      setAudioPreviewUrl(newPreviewUrl);
      console.log("[AudioTranscriberRunner] Created new audio preview URL:", newPreviewUrl);
      form.setValue("audioFile", files, { shouldValidate: true });
    } else {
      setSelectedFileName(null);
      const emptyFileList = new DataTransfer().files;
      form.setValue("audioFile", emptyFileList, { shouldValidate: true }); 
    }
  };

  return (
    <div className="space-y-6 mt-6">
      <Card className="shadow-md border-border/50">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <CardTitle className="text-xl flex items-center">
                <FileAudio className="mr-2 h-5 w-5 text-primary" />
                Audio Transcription & Summarization
              </CardTitle>
              <CardDescription>
                Upload an audio file (MP3, OGG, WAV, AAC, FLAC, M4A - max 10MB).
                The file will be stored, transcribed, and summarized.
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
                render={({ field }) => ( 
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
              {audioPreviewUrl && (
                <div className="mt-4 p-4 border rounded-md bg-muted/30">
                  <h4 className="text-sm font-medium mb-2 flex items-center">
                    <PlayCircle className="mr-2 h-4 w-4 text-primary" />
                    Audio Preview
                  </h4>
                  <audio controls src={audioPreviewUrl} className="w-full">
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}
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
                  Not enough credits. You need ${creditCost}, but have ${user.credits}.
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

    