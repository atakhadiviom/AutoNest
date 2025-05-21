
'use server';
/**
 * @fileOverview A blog post generation agent that fetches data from an n8n webhook.
 *
 * - generateBlogPost - A function that handles the blog post generation process.
 * - BlogFactoryInput - The input type for the generateBlogPost function.
 * - BlogFactoryOutput - The return type for the generateBlogPost function.
 */

import {z} from 'genkit';

const BlogFactoryInputSchema = z.object({
  researchQuery: z.string().min(10, { message: "Research query must be at least 10 characters long."}).describe('The central query or topic for the blog post.'),
});
export type BlogFactoryInput = z.infer<typeof BlogFactoryInputSchema>;

const BlogFactoryOutputSchema = z.object({
  slug: z.string().describe("The generated slug for the blog post."),
  title: z.string().describe("The main title of the blog post."),
  meta: z.string().describe("The meta description for SEO purposes."),
  subtitle: z.string().optional().describe("The subtitle of the blog post."),
  content: z.string().describe("The main content/body of the blog post."),
  hashtags: z.array(z.string()).optional().describe("A list of relevant hashtags."),
  rawResponse: z.string().optional().describe('The raw JSON response from the n8n webhook for debugging.'),
});
export type BlogFactoryOutput = z.infer<typeof BlogFactoryOutputSchema>;

export async function generateBlogPost(input: BlogFactoryInput): Promise<BlogFactoryOutput> {
  const n8nWebhookUrl = "https://n8n-service-g3uy.onrender.com/webhook/blog-factory-form";
  let rawResponseText = '';

  console.log(`[Blog Factory Flow] Requesting URL: ${n8nWebhookUrl} with query: "${input.researchQuery}"`);

  try {
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ "Research Query": input.researchQuery }),
    });

    rawResponseText = await response.text();

    if (!response.ok) {
      console.error(`[Blog Factory Flow] Error from n8n webhook: ${response.status} ${response.statusText}`, rawResponseText);
      throw new Error(`Failed to generate blog post from n8n webhook. Status: ${response.status} ${response.statusText}. Response: ${rawResponseText}`);
    }
    
    const data = JSON.parse(rawResponseText);
    console.log("[Blog Factory Flow] Data from n8n webhook:", JSON.stringify(data, null, 2));

    const blogData = data?.[0]?.data?.[0]?.output;

    if (!blogData || typeof blogData !== 'object') {
      console.error("[Blog Factory Flow] Unexpected data structure from n8n webhook. 'output' object not found or invalid.", data);
      throw new Error("Failed to parse blog post data from n8n webhook due to unexpected structure. Ensure the webhook returns data in the format: [{'data':[{'output':{...}}]}]");
    }
    
    const processedOutput = {
      slug: String(blogData.slug || `generated-slug-${Date.now()}`),
      title: String(blogData.title || "Untitled Post"),
      meta: String(blogData.meta || "No meta description provided."),
      subtitle: blogData.subtitle ? String(blogData.subtitle) : undefined,
      content: String(blogData.content || "No content generated."),
      hashtags: Array.isArray(blogData.hashtags) ? blogData.hashtags.map(String) : [],
      rawResponse: rawResponseText,
    };
    
    const validationResult = BlogFactoryOutputSchema.safeParse(processedOutput);
    if (!validationResult.success) {
        console.error("[Blog Factory Flow] Validation error for n8n output:", validationResult.error.flatten());
        throw new Error(`Validation failed for blog post data: ${validationResult.error.message}`);
    }
    
    console.log("[Blog Factory Flow] Parsed blog post title:", validationResult.data.title);
    return validationResult.data;

  } catch (error) {
    console.error("[Blog Factory Flow] Error in blog post generation process:", error);
    let detail = "No specific error message identified.";
    if (error instanceof Error) {
      detail = error.message;
    } else if (typeof error === 'string') {
      detail = error;
    } else if (error && typeof error.toString === 'function') {
      detail = error.toString();
    }
    
    const responseInfo = rawResponseText ? `Raw Response Text: ${rawResponseText}` : "Raw response text not available (error might have occurred before or during fetching response body).";
    throw new Error(`Blog post generation failed. Detail: ${detail}. ${responseInfo}`);
  }
}
