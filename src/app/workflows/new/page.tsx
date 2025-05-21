"use client";

import AppLayout from "@/components/layout/app-layout";
import { WorkflowGeneratorForm } from "@/components/workflows/workflow-generator-form";

export default function NewWorkflowPage() {
  return (
    <AppLayout>
      <WorkflowGeneratorForm />
    </AppLayout>
  );
}
