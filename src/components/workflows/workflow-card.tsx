
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
import { ArrowRight, CalendarDays, Layers, CreditCard, Repeat, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from 'date-fns';
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getCountFromServer } from "firebase/firestore";

interface WorkflowCardProps {
  workflow: Workflow;
}

export function WorkflowCard({ workflow }: WorkflowCardProps) {
  const IconComponent = workflow.icon || Layers;
  const [displayUsageCount, setDisplayUsageCount] = useState<number | string>(workflow.usageCount);
  const [isLoadingUsage, setIsLoadingUsage] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const fetchCount = async () => {
      if (!workflow.id) {
        setDisplayUsageCount(workflow.usageCount); // Use mock data if no ID
        return;
      }
      setIsLoadingUsage(true);
      try {
        const q = query(
          collection(db, "workflowRunLogs"),
          where("workflowId", "==", workflow.id)
        );
        const snapshot = await getCountFromServer(q);
        if (isMounted) {
          setDisplayUsageCount(snapshot.data().count);
        }
      } catch (error) {
        console.error(`Error fetching usage count for workflow ${workflow.id}:`, error);
        if (isMounted) {
          setDisplayUsageCount(workflow.usageCount); // Fallback to mock on error
        }
      } finally {
        if (isMounted) {
          setIsLoadingUsage(false);
        }
      }
    };

    fetchCount();
    return () => {
      isMounted = false; // Cleanup to prevent state updates on unmounted component
    };
  }, [workflow.id, workflow.usageCount]);

  return (
    <Card className="flex flex-col h-full shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <div className="flex items-start justify-between mb-2">
          <IconComponent className="h-10 w-10 text-primary mb-2" />
          <div className="flex flex-col items-end gap-1">
            {workflow.creditCost !== undefined && (
              <Badge variant="secondary" className="flex items-center">
                <CreditCard className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                {workflow.creditCost} Credits
              </Badge>
            )}
            <Badge variant="outline" className="flex items-center">
              <Repeat className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
              Used: {isLoadingUsage ? '...' : displayUsageCount}
            </Badge>
          </div>
        </div>
        <CardTitle className="text-xl">{workflow.name}</CardTitle>
        <CardDescription className="text-sm line-clamp-3 h-[3.75rem]">{workflow.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow pt-2">
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center">
            <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
            Updated: {format(parseISO(workflow.updatedAt), "MMM d, yyyy")}
          </div>
          {workflow.lastRunDate && (
            <div className="flex items-center">
              <History className="mr-1.5 h-3.5 w-3.5" />
              Last run: {format(parseISO(workflow.lastRunDate), "MMM d, yyyy, HH:mm")}
            </div>
          )}
          {workflow.creatorEmail && (
            <div className="text-xs text-muted-foreground mt-1">
              By: {workflow.creatorEmail}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-end items-center pt-4 border-t">
        <Button asChild variant="ghost" size="sm" className="text-primary hover:bg-primary/10">
          <Link href={`/workflows/${workflow.id}`}>
            View Details <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
