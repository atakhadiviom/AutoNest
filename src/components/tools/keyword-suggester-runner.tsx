
"use client";

import type { FC} from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { suggestKeywords, type KeywordSuggestionInput, type KeywordSuggestionOutput } from "@/ai/flows/keyword-suggestion-flow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lightbulb, AlertCircle, Search, Loader2, Info, CreditCard, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase"; // Import db
import { collection, addDoc, serverTimestamp } from "firebase/firestore"; // Import Firestore functions
import type { WorkflowRunLog } from "@/lib/types"; // Import WorkflowRunLog type

const formSchema = z.object({
  topic: z.string().min(3, { message: "Topic must be at least 3 characters." }),
});

interface KeywordSuggesterRunnerProps {
  creditCost?: number;
  workflowId: string;
  workflowName: string;
}

export const KeywordSuggesterRunner: FC<KeywordSuggesterRunnerProps> = ({ creditCost = 0, workflowId, workflowName }) => {
  const [suggestions, setSuggestions] = useState<KeywordSuggestionOutput['suggestions'] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, deductCredits, loading: authLoading } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: "",
    },
  });

  const hasEnoughCredits = user ? user.credits >= creditCost : false;

  const logRunToFirestore = async (
    status: 'Completed' | 'Failed', 
    inputTopic: string, 
    outputSuggestions: KeywordSuggestionOutput['suggestions'] | null, 
    errorMessage?: string
  ) => {
    if (!user) {
      console.error("Cannot log run: user not available.");
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
        inputDetails: { topic: inputTopic },
        creditCostAtRun: creditCost,
        ...(status === 'Completed' && outputSuggestions && { 
          outputSummary: `${outputSuggestions.length} suggestion${outputSuggestions.length === 1 ? '' : 's'} found`,
          fullOutput: outputSuggestions 
        }),
        ...(status === 'Failed' && errorMessage && { errorDetails: errorMessage }),
      };

      await addDoc(collection(db, "workflowRunLogs"), logEntry);
      console.log("Workflow run logged to Firestore.");
    } catch (e) {
      console.error("Error logging workflow run to Firestore:", e);
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
        description: `You need ${creditCost} credits to run this tool, but you only have ${user.credits}. Please add more credits.`,
        variant: "destructive",
      });
      setError(`Insufficient credits. You need ${creditCost}, you have ${user.credits}.`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuggestions(null);

    const input: KeywordSuggestionInput = {
      topic: values.topic,
    };

    try {
      const result = await suggestKeywords(input);
      console.log("[KeywordSuggesterRunner] Received result from suggestKeywords:", result);
      
      if (result && typeof result.suggestions !== 'undefined') {
        await deductCredits(creditCost); 
      }
      
      if (result.suggestions) {
        setSuggestions(result.suggestions);
        await logRunToFirestore('Completed', values.topic, result.suggestions);
        if (result.suggestions.length === 0) {
            toast({
            title: "No Suggestions Found",
            description: "The service couldn't find any specific suggestions for this topic. Try being more specific or broader.",
            variant: "default",
            });
        } else {
            toast({
            title: "Keywords Suggested!",
            description: `Found ${result.suggestions.length} keyword ideas. ${creditCost} credits used.`,
            });
        }
      }
    } catch (e) {
      console.error("[KeywordSuggesterRunner] Error suggesting keywords:", e);
      const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred.";
      setError(errorMessage);
      await logRunToFirestore('Failed', values.topic, null, errorMessage);
      toast({
        title: "Suggestion Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleCopyAllSuggestions = async () => {
    if (!suggestions || suggestions.length === 0) {
      toast({ title: "No suggestions to copy", variant: "default" });
      return;
    }
    const keywordsString = suggestions.map(s => s.keyword).join(", ");
    try {
      await navigator.clipboard.writeText(keywordsString);
      toast({ title: "Copied to clipboard!", description: `${suggestions.length} keywords copied.` });
    } catch (err) {
      console.error("Failed to copy keywords: ", err);
      toast({ title: "Copy Failed", description: "Could not copy keywords to clipboard.", variant: "destructive" });
    }
  };


  return (
    <div className="space-y-6 mt-6">
      <Card className="shadow-md border-border/50">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl flex items-center">
                <Lightbulb className="mr-2 h-5 w-5 text-primary" />
                Run Keyword Suggestion Tool
              </CardTitle>
              <CardDescription>
                Enter a topic to get keyword suggestions from our service.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="flex items-center whitespace-nowrap">
              <CreditCard className="mr-1.5 h-4 w-4" /> Cost: {creditCost} Credits
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="topic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Topic / Seed Keyword</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., sustainable gardening, digital marketing trends" {...field} />
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
                    Generating Ideas...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Get Keyword Ideas
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

      {suggestions && suggestions.length > 0 && (
        <Card className="shadow-md border-border/50">
          <CardHeader>
            <CardTitle className="text-xl">Generated Keyword Suggestions</CardTitle>
            <CardDescription>These suggestions have been processed by the application.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Keyword</TableHead>
                    <TableHead>Potential Use / Context</TableHead>
                    <TableHead className="text-right">Relevance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suggestions.map((suggestion, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{suggestion.keyword}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{suggestion.potentialUse || "-"}</TableCell>
                      <TableCell className="text-right">
                        {suggestion.relevanceScore !== undefined ? (
                           <Badge variant={suggestion.relevanceScore > 0.7 ? "default" : suggestion.relevanceScore > 0.4 ? "secondary" : "outline"}>
                             {(suggestion.relevanceScore * 100).toFixed(0)}%
                           </Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
          <CardFooter className="flex justify-end pt-4">
            <Button onClick={handleCopyAllSuggestions} variant="outline">
              <Copy className="mr-2 h-4 w-4" />
              Copy All Suggestions
            </Button>
          </CardFooter>
        </Card>
      )}
      {suggestions && suggestions.length === 0 && !isLoading && !error && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>No Processed Suggestions Found</AlertTitle>
          <AlertDescription>
            The service was called, but no keyword suggestions were processed or returned in the expected format.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
