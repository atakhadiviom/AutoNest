"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { generateWorkflow } from "@/ai/flows/workflow-generator";
import type { WorkflowStep } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ListChecks, AlertCircle, Wand2, ChevronRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  processDescription: z.string().min(50, {
    message: "Please provide a detailed description of at least 50 characters.",
  }),
});

export function WorkflowGeneratorForm() {
  const [generatedSteps, setGeneratedSteps] = useState<WorkflowStep[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      processDescription: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setError(null);
    setGeneratedSteps(null);

    try {
      const result = await generateWorkflow({ processDescription: values.processDescription });
      if (result.workflow) {
        const parsedSteps = JSON.parse(result.workflow) as Partial<WorkflowStep>[];
        // Ensure steps have required fields or provide defaults
        const validatedSteps: WorkflowStep[] = parsedSteps.map((step, index) => ({
          id: step.id || `step-${index + 1}`,
          description: step.description || "No description provided",
          requiredInputs: Array.isArray(step.requiredInputs) ? step.requiredInputs : [],
        }));
        setGeneratedSteps(validatedSteps);
        toast({
          title: "Workflow Generated!",
          description: "Review the steps below. You can now save this workflow.",
        });
      } else {
        throw new Error("AI did not return a workflow. Please try refining your description.");
      }
    } catch (e) {
      console.error("Error generating workflow:", e);
      const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred during workflow generation.";
      setError(errorMessage);
      toast({
        title: "Generation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center">
            <Wand2 className="mr-2 h-6 w-6 text-primary" />
            AI Workflow Generator
          </CardTitle>
          <CardDescription>
            Describe a manual process, and our AI will help structure it into a workflow.
            Be as detailed as possible for the best results.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="processDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg">Process Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., To onboard a new client, first we send a welcome email. Then, we schedule a kickoff call..."
                        className="min-h-[150px] resize-y text-base"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading} size="lg" className="w-full sm:w-auto">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-5 w-5" />
                    Generate Workflow
                  </>
                )}
              </Button>
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

      {generatedSteps && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center">
              <ListChecks className="mr-2 h-6 w-6 text-primary" />
              Generated Workflow Steps
            </CardTitle>
            <CardDescription>
              Review the steps generated by the AI. You can refine them and then save the workflow.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {generatedSteps.length > 0 ? (
              <ScrollArea className="h-[400px] rounded-md border p-4">
                <ul className="space-y-4">
                  {generatedSteps.map((step, index) => (
                    <li key={step.id || index} className="p-4 bg-muted/50 rounded-lg shadow-sm">
                      <p className="font-semibold text-foreground mb-1">
                        Step {index + 1}: {step.description}
                      </p>
                      {step.requiredInputs && step.requiredInputs.length > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground font-medium">Required Inputs:</p>
                          <ul className="list-disc list-inside pl-2 text-sm text-muted-foreground">
                            {step.requiredInputs.map((input, i) => (
                              <li key={i}>{input}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            ) : (
               <p className="text-muted-foreground">No steps were generated. Try refining your description.</p>
            )}
             <Button className="mt-6 w-full sm:w-auto" size="lg" disabled> {/* TODO: Implement save functionality */}
                Save Workflow <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
