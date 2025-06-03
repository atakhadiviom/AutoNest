
import type { Timestamp } from 'firebase/firestore';
import type { KeywordSuggestionOutput } from '@/ai/flows/keyword-suggestion-flow';

export type WorkflowStep = {
  id: string;
  description: string;
  requiredInputs: string[];
};

export type Workflow = {
  id:string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  steps: WorkflowStep[];
  creatorEmail?: string;
  icon?: React.ComponentType<{ className?: string }>;
  creditCost?: number;
  usageCount: number;
  lastRunDate?: string;
  isTool?: boolean; // Identifies if this workflow is a runnable tool
  runComponent?: string; // Specifies the React component to render for running the tool
};

// Type for the Audio Transcription Summary from n8n
export interface AudioTranscriptSummary {
  title: string;
  summary: string;
  main_points: string[];
  action_items: string[];
  follow_up: string[];
  stories: string[];
  references: string[];
  arguments: string[];
  related_topics: string[];
  sentiment: string;
}

export interface AudioTranscriptSummaryOutput {
  transcriptSummary: AudioTranscriptSummary;
}

// Type for LinkedIn Post Generator Output
export interface LinkedInPostGeneratorOutput {
  postText: string;
  suggestedImagePrompt?: string;
  hashtags?: string[];
}


export interface WorkflowRunLog {
  id?: string; // Firestore document ID, optional on creation
  workflowId: string;
  workflowName: string;
  userId: string;
  userEmail: string | null;
  timestamp: Timestamp | Date; // Allow Date for client-side representation after fetch
  status: 'Completed' | 'Failed';
  inputDetails?: {
    topic?: string; // For Keyword Suggester
    researchQuery?: string; // Placeholder for future tools
    audioFileName?: string; // For Audio Transcriber
    audioFileType?: string; // For Audio Transcriber
    audioFileSize?: number; // size in bytes, for Audio Transcriber
    audioStorageUrl?: string; // URL to the file in Firebase Storage
    linkedinKeyword?: string; // For LinkedIn Post Generator
  };
  outputSummary?: string;
  errorDetails?: string;
  creditCostAtRun: number;
  fullOutput?: KeywordSuggestionOutput['suggestions'] | AudioTranscriptSummaryOutput | LinkedInPostGeneratorOutput | string | Record<string, any>;
}

// New type for displaying user data in the admin dashboard
export interface AdminUserView {
  id: string;
  email: string;
  credits: number;
  createdAt: Date | string; // Firestore Timestamp will be converted to Date or string
  isAdmin: boolean;
}

export interface ToolSuggestion {
  id?: string; // Firestore document ID
  toolName: string;
  description: string;
  category?: string;
  userId?: string; // if submitted by a logged-in user
  userEmail: string; // submitter's email (can be manually entered if not logged in)
  submittedAt: Timestamp | Date; // Firestore Timestamp on creation, Date for client-side
  status: 'New' | 'Reviewed' | 'Planned' | 'Implemented' | 'Rejected'; // For tracking suggestion lifecycle
}
