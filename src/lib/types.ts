
import type { Timestamp } from 'firebase/firestore';

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

export interface WorkflowRunLog {
  id?: string; // Firestore document ID, optional on creation
  workflowId: string;
  workflowName: string;
  userId: string;
  userEmail: string | null;
  timestamp: Timestamp;
  status: 'Completed' | 'Failed';
  inputDetails?: Record<string, any>; // e.g., { topic: "some topic" }
  outputSummary?: string; // e.g., "15 suggestions found" or actual output snippet
  errorDetails?: string; // Message if status is 'Failed'
  creditCostAtRun: number;
}
