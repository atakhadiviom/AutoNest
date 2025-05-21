// This file is machine-generated - edit with care!

'use server';

/**
 * @fileOverview Workflow generator AI agent.
 *
 * - generateWorkflow - A function that handles the workflow generation process.
 * - GenerateWorkflowInput - The input type for the generateWorkflow function.
 * - GenerateWorkflowOutput - The return type for the generateWorkflow function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateWorkflowInputSchema = z.object({
  processDescription: z
    .string()
    .describe('A description of the manual process to be converted into a structured workflow.'),
});

export type GenerateWorkflowInput = z.infer<typeof GenerateWorkflowInputSchema>;

const GenerateWorkflowOutputSchema = z.object({
  workflow: z
    .string()
    .describe(
      'A structured workflow representation, as a JSON array of steps, where each step includes a description and required inputs.'
    ),
});

export type GenerateWorkflowOutput = z.infer<typeof GenerateWorkflowOutputSchema>;

export async function generateWorkflow(input: GenerateWorkflowInput): Promise<GenerateWorkflowOutput> {
  return generateWorkflowFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateWorkflowPrompt',
  input: {schema: GenerateWorkflowInputSchema},
  output: {schema: GenerateWorkflowOutputSchema},
  prompt: `You are an AI expert in converting manual processes into structured workflows.

  I will provide you with a description of the manual process, and you will respond with a structured workflow.

  The workflow should be a JSON array of steps, where each step includes a description and required inputs.

  Process Description: {{{processDescription}}}`,
});

const generateWorkflowFlow = ai.defineFlow(
  {
    name: 'generateWorkflowFlow',
    inputSchema: GenerateWorkflowInputSchema,
    outputSchema: GenerateWorkflowOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
