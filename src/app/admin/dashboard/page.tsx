
"use client";

import type { SetStateAction } from "react";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, Timestamp as FirestoreTimestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/auth-context";
import AppLayout from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Users, ShieldAlert, ArrowLeft, RefreshCw, Loader2 } from "lucide-react";
import type { AdminUserView } from "@/lib/types"; // Will create this type
import { format } from 'date-fns';

export default function AdminDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [usersList, setUsersList] = useState<AdminUserView[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!user || !user.isAdmin) {
      setUsersList([]);
      setLoadingUsers(false);
      return;
    }
    setLoadingUsers(true);
    setFetchError(null);
    try {
      const usersCollectionRef = collection(db, "users");
      const q = query(usersCollectionRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const fetchedUsers: AdminUserView[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Ensure createdAt is handled correctly
        let createdAtDate: Date | string = "N/A";
        if (data.createdAt instanceof FirestoreTimestamp) {
          createdAtDate = data.createdAt.toDate();
        } else if (data.createdAt && typeof data.createdAt.toDate === 'function') { // For objects from older SDK versions
          createdAtDate = data.createdAt.toDate();
        } else if (typeof data.createdAt === 'string') {
           createdAtDate = new Date(data.createdAt); // Attempt to parse if string
        }


        fetchedUsers.push({
          id: doc.id,
          email: data.email || "No email",
          credits: data.credits !== undefined ? data.credits : 0,
          createdAt: createdAtDate,
          isAdmin: data.isAdmin === true,
        });
      });
      setUsersList(fetchedUsers);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      setFetchError(`Failed to load users: ${error.message}. This might be due to Firestore security rules not allowing admin access to the 'users' collection.`);
    } finally {
      setLoadingUsers(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user?.isAdmin) {
      fetchUsers();
    } else if (!authLoading && user && !user.isAdmin) {
      setLoadingUsers(false); // Not an admin, no need to load
    }
  }, [user, authLoading, fetchUsers]);

  if (authLoading) {
    return <AppLayout><div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div></AppLayout>;
  }

  if (!user || !user.isAdmin) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center text-center py-12">
          <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You do not have permission to view this page.
          </p>
          <Button asChild>
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" /> Go to Dashboard
            </Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center">
              <Users className="mr-3 h-8 w-8 text-primary" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage users and view application statistics.
            </p>
          </div>
           <Button onClick={fetchUsers} disabled={loadingUsers}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loadingUsers ? 'animate-spin' : ''}`} />
            Refresh User List
          </Button>
        </div>

        {fetchError && (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Error Fetching Users</AlertTitle>
            <AlertDescription>{fetchError}</AlertDescription>
          </Alert>
        )}

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">User Management</CardTitle>
            <CardDescription>
              List of all registered users. Current Firestore rules may need adjustment to allow reading all user documents.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Loading users...</p>
              </div>
            ) : usersList.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Credits</TableHead>
                    <TableHead>Is Admin?</TableHead>
                    <TableHead>Registered At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersList.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.email}</TableCell>
                      <TableCell className="text-right">{(u.credits / 100).toFixed(2)}</TableCell>
                       <TableCell>{u.isAdmin ? "Yes" : "No"}</TableCell>
                      <TableCell>
                        {u.createdAt instanceof Date 
                          ? format(u.createdAt, "PPpp") 
                          : u.createdAt === "N/A" ? "N/A" : "Invalid Date"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                {fetchError ? "Could not load users due to an error." : "No users found or no access."}
              </p>
            )}
          </CardContent>
        </Card>
         {/* Placeholder for other admin sections */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-xl">Workflow Run Logs Overview (Coming Soon)</CardTitle>
            <CardDescription>
              A summary or list of all workflow run logs will be displayed here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Feature under development.</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
