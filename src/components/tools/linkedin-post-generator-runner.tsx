
"use client";

import type { FC } from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { generateLinkedInPost, type LinkedInPostGeneratorInput, type LinkedInPostGeneratorOutput } from "@/ai/flows/linkedin-post-generator-flow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Linkedin, AlertCircle, Loader2, Info, CreditCard, Copy, Wand2, Tags, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import type { WorkflowRunLog } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  keyword: z.string().optional(),
});

interface LinkedInPostGeneratorRunnerProps {
  creditCost?: number;
  workflowId: string;
  workflowName: string;
  onSuccessfulRun: () => void;
}

export const LinkedInPostGeneratorRunner: FC<LinkedInPostGeneratorRunnerProps> = ({
  creditCost = 2, // Default credit cost
  workflowId,
  workflowName,
  onSuccessfulRun,
}) => {
  const [generatedPost, setGeneratedPost] = useState<LinkedInPostGeneratorOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, deductCredits, loading: authLoading } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      keyword: "",
    },
  });

  const hasEnoughCredits = user ? user.credits >= creditCost : false;

  const logRunToFirestore = async (
    status: 'Completed' | 'Failed',
    inputKeyword: string | undefined,
    output: LinkedInPostGeneratorOutput | null,
    errorMessage?: string
  ) => {
    if (!user) {
      console.error("[LinkedInPostGeneratorRunner] Cannot log run: user not available.");
      return;
    }
    try {
      const logEntry: Omit<WorkflowRunLog, 'id' | 'timestamp'> & { timestamp: any } = {
        workflowId,
        workflowName,
        userId: user.uid,
        userEmail: user.email,
        timestamp: serverTimestamp(),
        status,
        inputDetails: { linkedinKeyword: inputKeyword },
        creditCostAtRun: creditCost,
        ...(status === 'Completed' && output && {
          outputSummary: `LinkedIn post generated. Preview: ${output.postText.substring(0, 50)}...`,
          fullOutput: output,
        }),
        ...(status === 'Failed' && errorMessage && { errorDetails: errorMessage }),
      };
      await addDoc(collection(db, "workflowRunLogs"), logEntry);
      console.log("[LinkedInPostGeneratorRunner] LinkedIn post generation run logged to Firestore.");
    } catch (e) {
      console.error("[LinkedInPostGeneratorRunner] Error logging run to Firestore:", e);
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
        description: `You need ${creditCost} credits, but have ${user.credits}.`,
        variant: "destructive",
      });
      setError(`Insufficient credits. You need ${creditCost}, you have ${user.credits}.`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedPost(null);

    const input: LinkedInPostGeneratorInput = {
      keyword: values.keyword || undefined,
    };

    try {
      const result = await generateLinkedInPost(input);
      setGeneratedPost(result);
      await deductCredits(creditCost);
      await logRunToFirestore('Completed', values.keyword, result);
      onSuccessfulRun();
      toast({
        title: "LinkedIn Post Generated!",
        description: `Your AI-powered post is ready. ${creditCost} credits used.`,
      });
      // form.reset(); // Optionally reset form
    } catch (e: any) {
      console.error("[LinkedInPostGeneratorRunner] Error generating post:", e);
      const errorMessage = e.message || "An unexpected error occurred during post generation.";
      setError(errorMessage);
      await logRunToFirestore('Failed', values.keyword, null, errorMessage);
      toast({
        title: "Generation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleCopyToClipboard = async (text: string, type: string) => {
    if (!text) {
      toast({ title: `No ${type} to copy`, variant: "default" });
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied!", description: `${type} copied to clipboard.` });
    } catch (err) {
      console.error(`Failed to copy ${type}: `, err);
      toast({ title: "Copy Failed", description: `Could not copy ${type}.`, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 mt-6">
      <Card className="shadow-md border-border/50">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <CardTitle className="text-xl flex items-center">
                <Linkedin className="mr-2 h-5 w-5 text-primary" />
                AI-Powered LinkedIn Post Generator
              </CardTitle>
              <CardDescription>
                Enter an optional keyword to generate a LinkedIn post using Google Trends & Perplexity AI.
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
                name="keyword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Keyword (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., future of AI, sustainable tech" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                disabled={isLoading || authLoading || !hasEnoughCredits}
                className="w-full sm:w-auto"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Post...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Generate LinkedIn Post
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

      {generatedPost && (
        <Card className="shadow-md border-border/50">
          <CardHeader>
            <CardTitle className="text-xl">Generated LinkedIn Post</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Post Text</Label>
              <div className="relative mt-1">
                <Textarea
                  readOnly
                  value={generatedPost.postText}
                  className="min-h-[150px] bg-muted/30"
                  aria-label="Generated post text"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCopyToClipboard(generatedPost.postText, "Post text")}
                  className="absolute top-2 right-2 h-7 w-7"
                  aria-label="Copy post text"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {generatedPost.suggestedImagePrompt && (
              <div>
                <Label className="text-sm font-medium flex items-center">
                  <ImageIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                  Suggested Image Prompt
                </Label>
                <div className="relative mt-1">
                  <Input
                    readOnly
                    value={generatedPost.suggestedImagePrompt}
                    className="bg-muted/30"
                    aria-label="Suggested image prompt"
                  />
                   <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopyToClipboard(generatedPost.suggestedImagePrompt || '', "Image prompt")}
                    className="absolute top-1/2 right-2 transform -translate-y-1/2 h-7 w-7"
                    aria-label="Copy image prompt"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {generatedPost.hashtags && generatedPost.hashtags.length > 0 && (
              <div>
                <Label className="text-sm font-medium flex items-center">
                  <Tags className="mr-2 h-4 w-4 text-muted-foreground" />
                  Suggested Hashtags
                </Label>
                <div className="relative mt-1">
                  <div className="p-2 border rounded-md bg-muted/30 min-h-[40px] flex flex-wrap gap-2 items-center">
                    {generatedPost.hashtags.map((tag, index) => (
                      <Badge key={index} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopyToClipboard(generatedPost.hashtags!.join(" "), "Hashtags")}
                    className="absolute top-2 right-2 h-7 w-7"
                    aria-label="Copy hashtags"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground pt-4">
            Content generated by AI. Review and edit before posting.
          </CardFooter>
        </Card>
      )}
       {generatedPost === null && !isLoading && !error && form.formState.isSubmitted && (
         <Alert>
           <Info className="h-4 w-4" />
           <AlertTitle>No Post Generated</AlertTitle>
           <AlertDescription>
             The tool ran, but no post data was returned. This might happen if the keyword was too restrictive or an issue occurred with the generation service.
           </AlertDescription>
         </Alert>
      )}
    </div>
  );
};
