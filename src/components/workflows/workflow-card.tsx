
"use client";

import Link from "next/link";
import type { Workflow } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, CalendarDays, Layers, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from 'date-fns';

interface WorkflowCardProps {
  workflow: Workflow;
}

export function WorkflowCard({ workflow }: WorkflowCardProps) {
  const IconComponent = workflow.icon || Layers;

  return (
    <Card className="flex flex-col h-full shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <div className="flex items-start justify-between mb-2">
          <IconComponent className="h-10 w-10 text-primary mb-2" />
          <div className="flex flex-col items-end gap-1">
            {/* <Badge variant="outline">{workflow.steps.length} Steps</Badge> */}
            {workflow.creditCost !== undefined && (
              <Badge variant="secondary" className="flex items-center">
                <CreditCard className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                {workflow.creditCost} Credits
              </Badge>
            )}
          </div>
        </div>
        <CardTitle className="text-xl">{workflow.name}</CardTitle>
        <CardDescription className="text-sm line-clamp-3 h-[3.75rem]">{workflow.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        {/* Additional content can go here if needed */}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-4 pt-4 border-t">
        <div className="text-xs text-muted-foreground">
          <div className="flex items-center">
            <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
            Updated: {format(parseISO(workflow.updatedAt), "MMM d, yyyy")}
          </div>
          {workflow.creatorEmail && (
            <div className="text-xs text-muted-foreground mt-1">
              By: {workflow.creatorEmail}
            </div>
          )}
        </div>
        <Button asChild variant="ghost" size="sm" className="text-primary hover:bg-primary/10">
          <Link href={`/workflows/${workflow.id}`}>
            View Details <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
