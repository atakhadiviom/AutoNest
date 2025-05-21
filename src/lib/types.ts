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
  usageCount: number; // Added usageCount
  lastRunDate?: string; // Added optional lastRunDate
};

