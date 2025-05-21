
export type WorkflowStep = {
  id: string;
  description: string;
  requiredInputs: string[];
};

export type Workflow = {
  id: string;
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

