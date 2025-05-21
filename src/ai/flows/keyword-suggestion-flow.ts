
'use server';
/**
 * @fileOverview A keyword suggestion AI agent.
 *
 * - suggestKeywords - A function that handles the keyword suggestion process.
 * - KeywordSuggestionInput - The input type for the suggestKeywords function.
 * - KeywordSuggestionOutput - The return type for the suggestKeywords function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const KeywordSuggestionInputSchema = z.object({
  topic: z.string().min(3, { message: "Topic must be at least 3 characters long."}).describe('The central topic or seed keyword for which suggestions are needed.'),
  language: z.string().optional().describe('The language for the keywords (e.g., "en", "es"). Defaults to English if not provided.'),
  country: z.string().optional().describe('The target country for the keywords (e.g., "US", "GB"). Helps in generating region-specific suggestions.'),
});
export type KeywordSuggestionInput = z.infer<typeof KeywordSuggestionInputSchema>;

const KeywordSuggestionOutputSchema = z.object({
  suggestions: z.array(z.object({
    keyword: z.string().describe("The suggested keyword."),
    potentialUse: z.string().describe("A brief explanation of why this keyword might be useful or in what context.").optional(),
    relevanceScore: z.number().min(0).max(1).optional().describe("An estimated relevance score from 0 (low) to 1 (high)."),
  })).describe('A list of keyword suggestions with potential uses and relevance scores.'),
});
export type KeywordSuggestionOutput = z.infer<typeof KeywordSuggestionOutputSchema>;

export async function suggestKeywords(input: KeywordSuggestionInput): Promise<KeywordSuggestionOutput> {
  return keywordSuggestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'keywordSuggestionPrompt',
  input: {schema: KeywordSuggestionInputSchema},
  output: {schema: KeywordSuggestionOutputSchema},
  prompt: `You are a world-class SEO and keyword research expert.
Your task is to generate a list of 10-15 highly relevant keyword suggestions based on the provided topic.
For each keyword, provide its potential use case or context. If possible, also provide an estimated relevance score (0.0 to 1.0).

Topic: {{{topic}}}
{{#if language}}Language: {{{language}}}{{/if}}
{{#if country}}Target Country: {{{country}}}{{/if}}

Please provide a diverse set of keywords, including long-tail variations, question-based keywords, and related terms.
Focus on keywords that would be valuable for content creation, SEO optimization, or PPC campaigns.
Ensure your output strictly adheres to the JSON schema provided for the suggestions list.
`,
});

const keywordSuggestionFlow = ai.defineFlow(
  {
    name: 'keywordSuggestionFlow',
    inputSchema: KeywordSuggestionInputSchema,
    outputSchema: KeywordSuggestionOutputSchema,
  },
  async (input: KeywordSuggestionInput) => {
    // Provide default language if not specified
    const fullInput = {
      language: 'en', // Default to English
      ...input,
    };
    
    const {output} = await prompt(fullInput);
    if (!output) {
      throw new Error('AI failed to generate keyword suggestions.');
    }
    // Ensure suggestions is always an array, even if AI returns null/undefined
    return { suggestions: output.suggestions || [] };
  }
);

