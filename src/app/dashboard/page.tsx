"use client";

import AppLayout from "@/components/layout/app-layout";
import { WorkflowCard } from "@/components/workflows/workflow-card";
import { WorkflowSearch } from "@/components/workflows/workflow-search";
import { mockWorkflows } from "@/lib/mock-data";
import type { Workflow } from "@/lib/types";
// import { Button } from "@/components/ui/button"; // Button not needed here anymore
// import Link from "next/link"; // Link not needed here anymore
import { Database } from "lucide-react"; // PlusCircle removed
import { useState, useMemo } from "react";

export default function DashboardPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredWorkflows = useMemo(() => {
    if (!searchTerm) {
      return mockWorkflows;
    }
    return mockWorkflows.filter(
      (workflow) =>
        workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        workflow.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Workflow Dashboard</h1>
            <p className="text-muted-foreground">
              Manage and view all your automated processes.
            </p>
          </div>
          {/* Removed Create New Workflow button */}
          {/* 
          <Button asChild size="lg">
            <Link href="/workflows/new">
              <PlusCircle className="mr-2 h-5 w-5" /> Create New Workflow
            </Link>
          </Button> 
          */}
        </div>

        <WorkflowSearch onSearchChange={setSearchTerm} />

        {filteredWorkflows.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWorkflows.map((workflow: Workflow) => (
              <WorkflowCard key={workflow.id} workflow={workflow} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Database className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold text-foreground">No Workflows Found</h2>
            <p className="text-muted-foreground mt-2">
              {searchTerm ? "No workflows match your search term." : "There are no workflows available at the moment."}
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
