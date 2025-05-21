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
  // Add any other properties needed for UI, e.g., icon
  icon?: React.ComponentType<{ className?: string }>;
};
