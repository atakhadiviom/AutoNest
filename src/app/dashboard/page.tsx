
"use client";

import AppLayout from "@/components/layout/app-layout";
import { WorkflowCard } from "@/components/workflows/workflow-card";
import { WorkflowSearch } from "@/components/workflows/workflow-search";
import { mockWorkflows } from "@/lib/mock-data";
import type { Workflow } from "@/lib/types";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Database, Lightbulb, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useMemo } from "react";

const SuggestToolPromoCard = () => (
  <Card className="flex flex-col h-full shadow-lg hover:shadow-xl transition-shadow duration-300 bg-card hover:border-primary/50">
    <CardHeader className="items-center text-center">
      <Lightbulb className="h-10 w-10 text-primary mb-2" />
      <CardTitle className="text-xl text-primary">Got an Idea for a New Tool?</CardTitle>
      <CardDescription className="text-sm">
        Help us improve AutoNest! If there's a tool or feature you'd love to see, let us know.
      </CardDescription>
    </CardHeader>
    <CardContent className="flex-grow pt-2 text-center">
      <p className="text-xs text-muted-foreground">
        Your suggestions drive innovation and help tailor AutoNest to your needs.
      </p>
    </CardContent>
    <CardFooter className="flex justify-center pt-4 border-t">
      <Button asChild variant="default" size="sm">
        <Link href="/suggest-tool">
          Suggest a Tool <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </CardFooter>
  </Card>
);

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
              {searchTerm ? `No workflows match your search term "${searchTerm}".` : "There are no workflows available at the moment."}
            </p>
          </div>
        )}

        <div className="mt-12 flex justify-center">
          <div className="w-full md:w-2/3 lg:w-1/2 xl:w-1/3">
            <SuggestToolPromoCard />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
