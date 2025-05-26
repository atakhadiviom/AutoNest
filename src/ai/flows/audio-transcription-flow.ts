
'use server';
/**
 * @fileOverview An audio transcription and summarization agent that sends audio to an n8n webhook.
 *
 * - transcribeAndSummarizeAudio - A function that handles sending audio and receiving a summary.
 * - AudioTranscriptionInput - The input type for the transcribeAndSummarizeAudio function (File object).
 * - AudioTranscriptSummaryOutput - The return type from the n8n webhook.
 */

import {z} from 'genkit'; // Zod might be used if we add schema validation here later
import type { AudioTranscriptSummaryOutput } from '@/lib/types'; // Import the type

// Input type is a File object from the browser, not easily described by Zod for server-side.
// We'll assume the runner component handles File validation.
export type AudioTranscriptionInput = File;

export async function transcribeAndSummarizeAudio(
  audioFile: AudioTranscriptionInput
): Promise<AudioTranscriptSummaryOutput> {
  const n8nWebhookUrl = "https://n8n.autonest.site/webhook/transcribe";
  let rawResponseText = '';

  console.log(`[Audio Transcription Flow] Preparing to send audio file: ${audioFile.name} (${audioFile.size} bytes)`);

  const formData = new FormData();
  formData.append("audioData", audioFile, audioFile.name);

  try {
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      body: formData,
      // 'Content-Type': 'multipart/form-data' is automatically set by browser for FormData
    });

    rawResponseText = await response.text();

    if (!response.ok) {
      console.error(
        `[Audio Transcription Flow] Error from n8n webhook: ${response.status} ${response.statusText}`,
        rawResponseText
      );
      throw new Error(
        `N8N webhook failed: ${response.status} ${response.statusText}. Response: ${rawResponseText || "N/A"}`
      );
    }

    const data = JSON.parse(rawResponseText) as AudioTranscriptSummaryOutput;
    console.log("[Audio Transcription Flow] Data from n8n webhook:", JSON.stringify(data, null, 2));

    if (!data || !data.transcriptSummary) {
        console.error("[Audio Transcription Flow] Unexpected data format from n8n webhook. 'transcriptSummary' missing. Data:", data);
        throw new Error("Invalid data format received from transcription service. 'transcriptSummary' missing.");
    }

    // Basic validation of the structure (can be expanded with Zod if needed)
    if (typeof data.transcriptSummary.title !== 'string' || typeof data.transcriptSummary.summary !== 'string') {
        console.warn("[Audio Transcription Flow] Received transcriptSummary, but title or summary is not a string. Data:", data.transcriptSummary);
        // Potentially throw an error or attempt to use it as is, depending on strictness
    }
    
    return data;

  } catch (error) {
    console.error("[Audio Transcription Flow] Error in transcription process:", error);
    let detail = "No specific error message identified.";
    if (error instanceof Error) {
      detail = error.message;
    } else if (typeof error === 'string') {
      detail = error;
    } else if (error && typeof error.toString === 'function') {
      detail = error.toString();
    }
    const responseInfo = rawResponseText ? `Raw Response Text: ${rawResponseText}` : "Raw response text not available.";
    // To conform to Promise<AudioTranscriptSummaryOutput>, we must throw or return a valid structure.
    // Throwing the error is generally better to indicate failure.
    throw new Error(`Audio transcription failed. Detail: ${detail}. ${responseInfo}`);
  }
}
