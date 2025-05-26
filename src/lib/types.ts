
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

// Type for the new Audio Transcription Summary
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


export interface WorkflowRunLog {
  id?: string; // Firestore document ID, optional on creation
  workflowId: string;
  workflowName: string;
  userId: string;
  userEmail: string | null;
  timestamp: Timestamp | Date; // Allow Date for client-side representation after fetch
  status: 'Completed' | 'Failed';
  inputDetails?: {
    topic?: string;
    researchQuery?: string;
    audioFileName?: string;
    audioFileType?: string;
    audioFileSize?: number; // size in bytes
  };
  outputSummary?: string;
  errorDetails?: string;
  creditCostAtRun: number;
  fullOutput?: KeywordSuggestionOutput['suggestions'] | AudioTranscriptSummaryOutput | string | Record<string, any>;
}

// New type for displaying user data in the admin dashboard
export interface AdminUserView {
  id: string;
  email: string;
  credits: number;
  createdAt: Date | string; // Firestore Timestamp will be converted to Date or string
  isAdmin: boolean;
}
