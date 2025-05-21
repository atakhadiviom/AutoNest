
"use client";

import type { FC} from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { generateBlogPost, type BlogFactoryInput, type BlogFactoryOutput } from "@/ai/flows/blog-factory-flow";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileText, AlertCircle, Wand2, Loader2, Info, CreditCard, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import type { WorkflowRunLog } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const formSchema = z.object({
  researchQuery: z.string().min(10, { message: "Research query must be at least 10 characters long." }),
});

interface BlogFactoryRunnerProps {
  creditCost?: number;
  workflowId: string;
  workflowName: string;
}

export const BlogFactoryRunner: FC<BlogFactoryRunnerProps> = ({ creditCost = 0, workflowId, workflowName }) => {
  const [blogPost, setBlogPost] = useState<BlogFactoryOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, deductCredits, loading: authLoading } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      researchQuery: "",
    },
  });

  const hasEnoughCredits = user ? user.credits >= creditCost : false;

  const logRunToFirestore = async (
    status: 'Completed' | 'Failed',
    inputQuery: string,
    outputPost: BlogFactoryOutput | null,
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
        inputDetails: { researchQuery: inputQuery },
        creditCostAtRun: creditCost,
        ...(status === 'Completed' && outputPost && {
          outputSummary: `Blog post "${outputPost.title.substring(0,50)}..." generated.`,
          fullOutput: outputPost
        }),
        ...(status === 'Failed' && errorMessage && { errorDetails: errorMessage }),
      };

      await addDoc(collection(db, "workflowRunLogs"), logEntry);
      console.log("Blog factory run logged to Firestore.");
    } catch (e) {
      console.error("Error logging blog factory run to Firestore:", e);
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
        description: `You need ${creditCost} credits for this tool, but you have ${user.credits}.`,
        variant: "destructive",
      });
      setError(`Insufficient credits. You need ${creditCost}, you have ${user.credits}.`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setBlogPost(null);

    const input: BlogFactoryInput = { researchQuery: values.researchQuery };

    try {
      const result = await generateBlogPost(input);
      
      if (result && result.title) { // Assuming title is a good indicator of success
        await deductCredits(creditCost);
      }

      setBlogPost(result);
      await logRunToFirestore('Completed', values.researchQuery, result);
      toast({
        title: "Blog Post Generated!",
        description: `The blog post "${result.title.substring(0,50)}..." is ready. ${creditCost} credits used.`,
      });
    } catch (e) {
      console.error("[BlogFactoryRunner] Error generating blog post:", e);
      const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred.";
      setError(errorMessage);
      await logRunToFirestore('Failed', values.researchQuery, null, errorMessage);
      toast({
        title: "Blog Generation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleCopyToClipboard = async (textToCopy: string, type: string) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      toast({ title: `${type} Copied!`, description: `${type} copied to clipboard.`});
    } catch (err) {
      toast({ title: `Copy Failed`, description: `Could not copy ${type.toLowerCase()} to clipboard.`, variant: "destructive"});
    }
  };

  return (
    <div className="space-y-6 mt-6">
      <Card className="shadow-md border-border/50">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl flex items-center">
                <Wand2 className="mr-2 h-5 w-5 text-primary" />
                Run Blog Factory Tool
              </CardTitle>
              <CardDescription>
                Enter your research query or topic to generate a blog post.
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
                name="researchQuery"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Research Query / Topic</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., What are the benefits of a morning routine?"
                        className="min-h-[100px] resize-y"
                        {...field}
                      />
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
                    Generating Blog Post...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Blog Post
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

      {blogPost && (
        <Card className="shadow-md border-border/50">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl">{blogPost.title}</CardTitle>
              <Button variant="outline" size="sm" onClick={() => handleCopyToClipboard(blogPost.title, "Title")}>
                <Copy className="mr-2 h-4 w-4" /> Copy Title
              </Button>
            </div>
            {blogPost.subtitle && <CardDescription className="text-lg text-muted-foreground pt-1">{blogPost.subtitle}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-4">
            <Separator />
            <div>
              <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-1">Meta Description</h3>
              <div className="flex items-start justify-between">
                <p className="text-sm bg-muted/50 p-2 rounded-md flex-grow mr-2">{blogPost.meta}</p>
                <Button variant="ghost" size="sm" onClick={() => handleCopyToClipboard(blogPost.meta, "Meta Description")}>
                    <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-1">Slug</h3>
               <div className="flex items-start justify-between">
                <p className="text-sm bg-muted/50 p-2 rounded-md font-mono flex-grow mr-2">{blogPost.slug}</p>
                 <Button variant="ghost" size="sm" onClick={() => handleCopyToClipboard(blogPost.slug, "Slug")}>
                    <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
             {blogPost.hashtags && blogPost.hashtags.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-1">Hashtags</h3>
                <div className="flex items-start justify-between">
                    <div className="flex flex-wrap gap-2 bg-muted/50 p-2 rounded-md flex-grow mr-2">
                    {blogPost.hashtags.map((tag, index) => (
                        <Badge key={index} variant="secondary">{tag}</Badge>
                    ))}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleCopyToClipboard(blogPost.hashtags!.join(', '), "Hashtags")}>
                        <Copy className="h-4 w-4" />
                    </Button>
                </div>
              </div>
            )}
            <Separator />
            <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Content</h3>
                <ScrollArea className="h-[400px] border rounded-md p-4 bg-muted/20">
                  <div className="prose prose-sm max-w-none whitespace-pre-line" dangerouslySetInnerHTML={{ __html: blogPost.content.replace(/\n/g, '<br />') }} />
                </ScrollArea>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
             <Button variant="default" onClick={() => handleCopyToClipboard(blogPost.content, "Content")}>
                <Copy className="mr-2 h-4 w-4" /> Copy Full Content
              </Button>
          </CardFooter>
        </Card>
      )}
      
      {blogPost?.rawResponse && (
         <Card className="shadow-sm border-border/30 mt-4">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Raw Service Response (for debugging)</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[150px] bg-muted/20 p-2 rounded">
              <pre className="text-xs whitespace-pre-wrap">{blogPost.rawResponse}</pre>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
      {!blogPost && isLoading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Generating your blog post...</p>
        </div>
      )}
      {!blogPost && !isLoading && !error && (
        <Alert className="mt-6">
          <Info className="h-4 w-4" />
          <AlertTitle>Ready to Generate</AlertTitle>
          <AlertDescription>
            Enter your research query above and click "Generate Blog Post" to get started.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
