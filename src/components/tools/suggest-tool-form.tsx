
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lightbulb, AlertCircle, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import type { ToolSuggestion } from "@/lib/types";

const formSchema = z.object({
  toolName: z.string().min(3, "Tool name must be at least 3 characters.").max(100, "Tool name must be 100 characters or less."),
  description: z.string().min(20, "Description must be at least 20 characters.").max(1000, "Description must be 1000 characters or less."),
  category: z.string().max(50, "Category must be 50 characters or less.").optional(),
  userEmail: z.string().email("Please enter a valid email address."),
});

export function SuggestToolForm() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      toolName: "",
      description: "",
      category: "",
      userEmail: user?.email || "",
    },
  });

  useEffect(() => {
    if (user && !form.getValues("userEmail")) {
      form.setValue("userEmail", user.email || "");
    }
  }, [user, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setSubmissionError(null);

    const suggestionData: Omit<ToolSuggestion, "id" | "submittedAt" | "status"> & { submittedAt: any } = {
      toolName: values.toolName,
      description: values.description,
      category: values.category || undefined,
      userEmail: values.userEmail,
      userId: user?.uid || undefined,
      submittedAt: serverTimestamp(),
      status: "New",
    };

    try {
      await addDoc(collection(db, "toolSuggestions"), suggestionData);
      toast({
        title: "Suggestion Submitted!",
        description: "Thank you for your idea. We'll review it soon.",
      });
      form.reset({ toolName: "", description: "", category: "", userEmail: user?.email || "" });
    } catch (e: any) {
      console.error("Error submitting suggestion:", e);
      const errorMessage = e.message || "An unexpected error occurred. Please try again.";
      setSubmissionError(errorMessage);
      toast({
        title: "Submission Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center">
          <Lightbulb className="mr-3 h-6 w-6 text-primary" />
          Suggest a New Tool
        </CardTitle>
        <CardDescription>
          Have an idea for a tool that would make AutoNest even better? Let us know!
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="toolName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tool Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., AI Image Caption Generator" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tool Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what the tool would do, its benefits, and any key features."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category/Use Case (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Content Creation, SEO, Social Media" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="userEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" {...field} disabled={authLoading || (!!user && !!user.email)} />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    We'll use this to contact you if we have questions about your suggestion.
                  </p>
                </FormItem>
              )}
            />

            {submissionError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{submissionError}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={isLoading || authLoading} className="w-full sm:w-auto">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit Suggestion
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
