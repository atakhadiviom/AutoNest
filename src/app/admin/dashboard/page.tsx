
"use client";

import type { SetStateAction } from "react";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, Timestamp as FirestoreTimestamp, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/auth-context";
import AppLayout from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, ShieldAlert, ArrowLeft, RefreshCw, Loader2, Lightbulb, ListChecks, FileText, AlertCircleIcon, Activity, Link as LinkIcon, CheckCircle, MessageSquare, BookOpen, Tag as TagIcon, Users as UsersIcon, Edit, Trash2, UserPlus, Eye, EyeOff, Info } from "lucide-react";
import type { AdminUserView, ToolSuggestion, WorkflowRunLog, AudioTranscriptSummaryOutput, LinkedInPostGeneratorOutput } from "@/lib/types";
import type { KeywordSuggestionOutput } from '@/ai/flows/keyword-suggestion-flow';
import { format } from 'date-fns';
import { useToast } from "@/hooks/use-toast";

// Helper to check if output is KeywordSuggestionOutput
function isKeywordSuggestionOutput(output: any): output is KeywordSuggestionOutput['suggestions'] {
    return Array.isArray(output) && (output.length === 0 || (output[0] && typeof output[0].keyword === 'string'));
}

function isAudioTranscriptSummaryOutput(output: any): output is AudioTranscriptSummaryOutput {
  return output && typeof output.transcriptSummary === 'object' && output.transcriptSummary !== null && typeof output.transcriptSummary.title === 'string';
}

function isLinkedInPostGeneratorOutput(output: any): output is LinkedInPostGeneratorOutput {
  return output && typeof output.postText === 'string';
}

const formatFirestoreTimestampOrDate = (timestamp: FirestoreTimestamp | Date | undefined): string => {
    if (!timestamp) return "N/A";
    const date = timestamp instanceof FirestoreTimestamp ? timestamp.toDate() : (timestamp instanceof Date ? timestamp : new Date());
    try {
      return format(date, "PPpp");
    } catch (e) {
      console.warn("Invalid date for formatting:", timestamp, e);
      return "Invalid Date";
    }
};


export default function AdminDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // Users State
  const [usersList, setUsersList] = useState<AdminUserView[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersFetchError, setUsersFetchError] = useState<string | null>(null);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<AdminUserView | null>(null);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [editUserFormData, setEditUserFormData] = useState({ credits: 0, isAdmin: false });
  const [updatingUser, setUpdatingUser] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AdminUserView | null>(null);
  const [isDeleteUserDialogOpen, setIsDeleteUserDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [createUserFormData, setCreateUserFormData] = useState({ email: "", password: "", credits: 0, isAdmin: false });
  const [creatingUser, setCreatingUser] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);


  // Tool Suggestions State
  const [suggestionsList, setSuggestionsList] = useState<ToolSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [suggestionsFetchError, setSuggestionsFetchError] = useState<string | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<ToolSuggestion | null>(null);
  const [isSuggestionDetailOpen, setIsSuggestionDetailOpen] = useState(false);
  const [updatingSuggestionStatus, setUpdatingSuggestionStatus] = useState(false);

  // Workflow Run Logs State
  const [runLogsList, setRunLogsList] = useState<WorkflowRunLog[]>([]);
  const [loadingRunLogs, setLoadingRunLogs] = useState(true);
  const [runLogsFetchError, setRunLogsFetchError] = useState<string | null>(null);
  const [selectedRunLog, setSelectedRunLog] = useState<WorkflowRunLog | null>(null);
  const [isRunLogDetailOpen, setIsRunLogDetailOpen] = useState(false);


  const fetchUsers = useCallback(async () => {
    if (!user || !user.isAdmin) {
      setUsersList([]); setLoadingUsers(false); return;
    }
    setLoadingUsers(true); setUsersFetchError(null);
    try {
      const usersCollectionRef = collection(db, "users");
      const q = query(usersCollectionRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const fetchedUsers: AdminUserView[] = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        let createdAtDate: Date | string = "N/A";
        if (data.createdAt instanceof FirestoreTimestamp) createdAtDate = data.createdAt.toDate();
        else if (data.createdAt && typeof data.createdAt.toDate === 'function') createdAtDate = data.createdAt.toDate();
        else if (typeof data.createdAt === 'string') createdAtDate = new Date(data.createdAt);
        return {
          id: docSnap.id,
          email: data.email || "No email",
          credits: data.credits !== undefined ? data.credits : 0,
          createdAt: createdAtDate,
          isAdmin: data.isAdmin === true,
        };
      });
      setUsersList(fetchedUsers);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      setUsersFetchError(`Failed to load users: ${error.message}. Check Firestore rules for 'users' collection.`);
    } finally {
      setLoadingUsers(false);
    }
  }, [user]);

  const fetchToolSuggestions = useCallback(async () => {
    if (!user || !user.isAdmin) {
      setSuggestionsList([]); setLoadingSuggestions(false); return;
    }
    setLoadingSuggestions(true); setSuggestionsFetchError(null);
    try {
      const suggestionsCollectionRef = collection(db, "toolSuggestions");
      const q = query(suggestionsCollectionRef, orderBy("submittedAt", "desc"));
      const querySnapshot = await getDocs(q);
      const fetchedSuggestions: ToolSuggestion[] = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return { id: docSnap.id, ...data } as ToolSuggestion;
      });
      setSuggestionsList(fetchedSuggestions);
    } catch (error: any) {
      console.error("Error fetching tool suggestions:", error);
      setSuggestionsFetchError(`Failed to load suggestions: ${error.message}. Check Firestore rules for 'toolSuggestions'.`);
    } finally {
      setLoadingSuggestions(false);
    }
  }, [user]);

  const fetchWorkflowRunLogs = useCallback(async () => {
    if (!user || !user.isAdmin) {
      setRunLogsList([]); setLoadingRunLogs(false); return;
    }
    setLoadingRunLogs(true); setRunLogsFetchError(null);
    try {
      const logsCollectionRef = collection(db, "workflowRunLogs");
      const q = query(logsCollectionRef, orderBy("timestamp", "desc"));
      const querySnapshot = await getDocs(q);
      const fetchedLogs: WorkflowRunLog[] = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return { id: docSnap.id, ...data } as WorkflowRunLog;
      });
      setRunLogsList(fetchedLogs);
    } catch (error: any) {
      console.error("Error fetching workflow run logs:", error);
      setRunLogsFetchError(`Failed to load logs: ${error.message}. Check Firestore rules for 'workflowRunLogs'.`);
    } finally {
      setLoadingRunLogs(false);
    }
  }, [user]);


  useEffect(() => {
    if (!authLoading && user?.isAdmin) {
      fetchUsers();
      fetchToolSuggestions();
      fetchWorkflowRunLogs();
    } else if (!authLoading && user && !user.isAdmin) {
      setLoadingUsers(false); setLoadingSuggestions(false); setLoadingRunLogs(false);
    }
  }, [user, authLoading, fetchUsers, fetchToolSuggestions, fetchWorkflowRunLogs]);

  const handleRefreshAll = () => {
    fetchUsers();
    fetchToolSuggestions();
    fetchWorkflowRunLogs();
  };

  const handleOpenSuggestionDetail = (suggestion: ToolSuggestion) => {
    setSelectedSuggestion(suggestion);
    setIsSuggestionDetailOpen(true);
  };

  const handleOpenRunLogDetail = (log: WorkflowRunLog) => {
    setSelectedRunLog(log);
    setIsRunLogDetailOpen(true);
  };

  const handleUpdateSuggestionStatus = async (suggestionId: string, newStatus: ToolSuggestion['status']) => {
    if (!user || !user.isAdmin) {
      toast({ title: "Permission Denied", description: "You are not authorized to perform this action.", variant: "destructive"});
      return;
    }
    setUpdatingSuggestionStatus(true);
    try {
      const suggestionRef = doc(db, "toolSuggestions", suggestionId);
      await updateDoc(suggestionRef, { status: newStatus });
      toast({ title: "Status Updated", description: `Suggestion status changed to ${newStatus}.` });
      setSuggestionsList(prev => prev.map(s => s.id === suggestionId ? { ...s, status: newStatus } : s));
      if (selectedSuggestion && selectedSuggestion.id === suggestionId) {
        setSelectedSuggestion(prev => prev ? {...prev, status: newStatus} : null);
      }
    } catch (error: any) {
      console.error("Error updating suggestion status:", error);
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    } finally {
      setUpdatingSuggestionStatus(false);
    }
  };

  const handleOpenEditUserDialog = (userToEdit: AdminUserView) => {
    setSelectedUserForEdit(userToEdit);
    setEditUserFormData({ credits: userToEdit.credits, isAdmin: userToEdit.isAdmin });
    setIsEditUserDialogOpen(true);
  };

  const handleEditUserFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setEditUserFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'credits' ? parseInt(value, 10) : value)
    }));
  };

  const handleSaveUserChanges = async () => {
    if (!selectedUserForEdit || !user || !user.isAdmin) {
      toast({ title: "Error", description: "No user selected or permission denied.", variant: "destructive" });
      return;
    }
    setUpdatingUser(true);
    try {
      const userRef = doc(db, "users", selectedUserForEdit.id);
      await updateDoc(userRef, {
        credits: editUserFormData.credits,
        isAdmin: editUserFormData.isAdmin,
      });
      toast({ title: "User Updated", description: `${selectedUserForEdit.email}'s details have been updated.` });
      fetchUsers(); // Refresh user list
      setIsEditUserDialogOpen(false);
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    } finally {
      setUpdatingUser(false);
    }
  };

  const handleOpenDeleteUserDialog = (userToDel: AdminUserView) => {
    setUserToDelete(userToDel);
    setIsDeleteUserDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete || !user || !user.isAdmin) {
      toast({ title: "Error", description: "No user selected or permission denied.", variant: "destructive" });
      return;
    }
    setDeletingUser(true);
    // This is a placeholder. Actual deletion requires Admin SDK on backend.
    toast({
      title: "Backend Function Required",
      description: `Deleting user '${userToDelete.email}' (Auth & Firestore) requires a backend Cloud Function with Firebase Admin SDK privileges. This action is currently a UI placeholder.`,
      variant: "default",
      duration: 7000,
    });
    // Example: If you had a backend function, you might call it here.
    // try {
    //   // await callBackendDeleteUserFunction(userToDelete.id);
    //   // toast({ title: "User Deletion Initiated", description: `Deletion process for ${userToDelete.email} has started.` });
    //   // fetchUsers(); // Refresh list
    // } catch (error: any) {
    //   // toast({ title: "Deletion Failed", description: error.message, variant: "destructive" });
    // }
    setDeletingUser(false);
    setIsDeleteUserDialogOpen(false);
  };
  
  const handleOpenCreateUserDialog = () => {
    setCreateUserFormData({ email: "", password: "", credits: 0, isAdmin: false });
    setShowCreatePassword(false);
    setIsCreateUserDialogOpen(true);
  };

  const handleCreateUserFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setCreateUserFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCreateUser = async () => {
    if (!user || !user.isAdmin) {
      toast({ title: "Permission Denied", description: "Not authorized.", variant: "destructive" });
      return;
    }
    // Basic client-side validation
    if (!createUserFormData.email || !createUserFormData.password) {
        toast({ title: "Validation Error", description: "Email and password are required.", variant: "destructive" });
        return;
    }
    if (createUserFormData.password.length < 6) {
        toast({ title: "Validation Error", description: "Password must be at least 6 characters.", variant: "destructive" });
        return;
    }

    setCreatingUser(true);
    toast({
      title: "Backend Function Required",
      description: `Creating user '${createUserFormData.email}' requires a backend Cloud Function with Firebase Admin SDK privileges. This form is currently a UI placeholder.`,
      variant: "default",
      duration: 7000,
    });
    // Example: If you had a backend function:
    // try {
    //   // await callBackendCreateUserFunction(createUserFormData);
    //   // toast({ title: "User Creation Initiated", description: `Creation process for ${createUserFormData.email} has started.` });
    //   // fetchUsers(); // Refresh list
    //   // setIsCreateUserDialogOpen(false);
    // } catch (error: any) {
    //   // toast({ title: "Creation Failed", description: error.message, variant: "destructive" });
    // }
    setCreatingUser(false);
    // Do not close dialog automatically for placeholder
  };


  const renderSummaryList = (items: string[] | undefined, icon: React.ReactNode) => {
    if (!items || items.length === 0 || (items.length === 1 && items[0] === "Nothing found for this summary list type.")) return <p className="text-xs text-muted-foreground">Not available.</p>;
    return (
      <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground">
        {items.map((item, index) => <li key={index} className="flex items-start"><span className="mr-2 mt-1">{icon}</span><span>{item}</span></li>)}
      </ul>
    );
  };

  if (authLoading) {
    return <AppLayout><div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div></AppLayout>;
  }

  if (!user || !user.isAdmin) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center text-center py-12">
          <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">You do not have permission to view this page.</p>
          <Button asChild><Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" /> Go to Dashboard</Link></Button>
        </div>
      </AppLayout>
    );
  }

  const anyDataLoading = loadingUsers || loadingSuggestions || loadingRunLogs;

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center">
              <ShieldAlert className="mr-3 h-8 w-8 text-primary" /> Admin Dashboard
            </h1>
            <p className="text-muted-foreground">Manage users, suggestions, and monitor application activity.</p>
          </div>
           <Button onClick={handleRefreshAll} disabled={anyDataLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${anyDataLoading ? 'animate-spin' : ''}`} />
            Refresh All Data
          </Button>
        </div>

        {/* User Management Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl flex items-center"><UsersIcon className="mr-2 h-5 w-5 text-primary" /> User Management</CardTitle>
              <Button onClick={handleOpenCreateUserDialog} variant="outline" size="sm">
                <UserPlus className="mr-2 h-4 w-4" /> Create New User
              </Button>
            </div>
            <CardDescription>List of all registered users. Edit or delete users (backend implementation required for full delete).</CardDescription>
          </CardHeader>
          <CardContent>
            {usersFetchError && <Alert variant="destructive"><ShieldAlert className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{usersFetchError}</AlertDescription></Alert>}
            {loadingUsers ? (
              <div className="flex justify-center items-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-3">Loading users...</p></div>
            ) : usersList.length > 0 ? (
              <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-right">Credits ($)</TableHead>
                      <TableHead>Admin?</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersList.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium truncate max-w-xs">{u.email}</TableCell>
                        <TableCell className="text-right">{(u.credits / 100).toFixed(2)}</TableCell>
                        <TableCell>{u.isAdmin ? <Badge>Yes</Badge> : <Badge variant="outline">No</Badge>}</TableCell>
                        <TableCell>{formatFirestoreTimestampOrDate(u.createdAt as Date)}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEditUserDialog(u)} className="h-8 w-8">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDeleteUserDialog(u)} className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : (<p className="text-center py-4">{usersFetchError ? "Could not load." : "No users found."}</p>)}
          </CardContent>
        </Card>
        
        {/* Notes on Admin Features */}
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="text-xl flex items-center"><Info className="mr-2 h-5 w-5 text-primary" /> Admin Feature Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p><strong>Multi-Factor Authentication (MFA):</strong> MFA is user-enrolled via their Firebase account settings. Admins cannot directly enforce or manage MFA for users from this dashboard through client-side actions.</p>
                <p><strong>Role-Based Access Control (RBAC):</strong> Access is currently managed by an <code>isAdmin</code> flag (true/false) on user profiles in Firestore. This allows for a basic Admin/User role distinction. For more granular roles or enhanced security (e.g., Editor, Viewer), implementing Firebase Custom Claims via backend functions is recommended as a future step.</p>
                <p><strong>User Activity Logs:</strong> Tool and workflow usage by users is logged and can be viewed in the "Workflow Run Logs" section below. This provides a basic activity log for application usage.</p>
                <p><strong>Comprehensive Audit Trails:</strong> For more detailed audit trails (e.g., admin login history, records of specific administrative changes like credit adjustments or role modifications), dedicated backend logging for each auditable action would need to be implemented. This is a potential future enhancement.</p>
            </CardContent>
        </Card>


        {/* Tool Suggestions Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl flex items-center"><Lightbulb className="mr-2 h-5 w-5 text-primary" /> Tool Suggestions</CardTitle>
            <CardDescription>Review and manage user-submitted tool suggestions.</CardDescription>
          </CardHeader>
          <CardContent>
            {suggestionsFetchError && <Alert variant="destructive"><ShieldAlert className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{suggestionsFetchError}</AlertDescription></Alert>}
            {loadingSuggestions ? (
              <div className="flex justify-center items-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-3">Loading suggestions...</p></div>
            ) : suggestionsList.length > 0 ? (
              <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader><TableRow><TableHead>Tool Name</TableHead><TableHead>Submitted By</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {suggestionsList.map((s) => (
                      <TableRow key={s.id} onClick={() => handleOpenSuggestionDetail(s)} className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-medium">{s.toolName}</TableCell>
                        <TableCell>{s.userEmail}</TableCell>
                        <TableCell>{formatFirestoreTimestampOrDate(s.submittedAt as FirestoreTimestamp)}</TableCell>
                        <TableCell><Badge variant={s.status === "Implemented" ? "default" : s.status === "New" ? "secondary" : "outline"}>{s.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : (<p className="text-center py-4">{suggestionsFetchError ? "Could not load." : "No suggestions submitted yet."}</p>)}
          </CardContent>
        </Card>

        {/* Workflow Run Logs Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl flex items-center"><Activity className="mr-2 h-5 w-5 text-primary" /> Workflow Run Logs</CardTitle>
            <CardDescription>Overview of all workflow and tool executions.</CardDescription>
          </CardHeader>
          <CardContent>
            {runLogsFetchError && <Alert variant="destructive"><ShieldAlert className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{runLogsFetchError}</AlertDescription></Alert>}
            {loadingRunLogs ? (
              <div className="flex justify-center items-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-3">Loading logs...</p></div>
            ) : runLogsList.length > 0 ? (
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader><TableRow><TableHead>Workflow</TableHead><TableHead>User</TableHead><TableHead>Timestamp</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Cost</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {runLogsList.map((log) => (
                      <TableRow key={log.id} onClick={() => handleOpenRunLogDetail(log)} className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-medium truncate max-w-xs">{log.workflowName}</TableCell>
                        <TableCell className="truncate max-w-xs">{log.userEmail}</TableCell>
                        <TableCell>{formatFirestoreTimestampOrDate(log.timestamp as FirestoreTimestamp)}</TableCell>
                        <TableCell><Badge variant={log.status === "Completed" ? "default" : "destructive"}>{log.status}</Badge></TableCell>
                        <TableCell className="text-right">{log.creditCostAtRun}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : (<p className="text-center py-4">{runLogsFetchError ? "Could not load." : "No workflow run logs found."}</p>)}
          </CardContent>
        </Card>
      </div>

      {/* Create User Dialog */}
      <Dialog open={isCreateUserDialogOpen} onOpenChange={setIsCreateUserDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center"><UserPlus className="mr-2 h-5 w-5 text-primary" /> Create New User</DialogTitle>
            <DialogDescription>
              Enter the details for the new user. Actual user creation requires backend implementation with Firebase Admin SDK.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 pb-4">
            <div className="space-y-2">
              <Label htmlFor="createUser-email">Email</Label>
              <Input id="createUser-email" name="email" type="email" value={createUserFormData.email} onChange={handleCreateUserFormChange} placeholder="user@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="createUser-password">Password</Label>
              <div className="relative">
                <Input id="createUser-password" name="password" type={showCreatePassword ? "text" : "password"} value={createUserFormData.password} onChange={handleCreateUserFormChange} placeholder="Min. 6 characters" />
                <Button variant="ghost" size="icon" type="button" className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2" onClick={() => setShowCreatePassword(p => !p)}>
                    {showCreatePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="createUser-credits">Initial Credits</Label>
              <Input id="createUser-credits" name="credits" type="number" value={createUserFormData.credits} onChange={handleCreateUserFormChange} />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="createUser-isAdmin" name="isAdmin" checked={createUserFormData.isAdmin} onCheckedChange={(checked) => setCreateUserFormData(prev => ({ ...prev, isAdmin: !!checked }))} />
              <Label htmlFor="createUser-isAdmin" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Set as Administrator
              </Label>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleCreateUser} disabled={creatingUser}>
              {creatingUser ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create User (Placeholder)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Edit User Dialog */}
      {selectedUserForEdit && (
        <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center"><Edit className="mr-2 h-5 w-5 text-primary" /> Edit User: {selectedUserForEdit.email}</DialogTitle>
              <DialogDescription>
                Modify user credits and admin status. Changes to email or password require backend Admin SDK operations.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2 pb-4">
              <div className="space-y-2">
                <Label htmlFor="edit-credits">Credits</Label>
                <Input id="edit-credits" name="credits" type="number" value={editUserFormData.credits} onChange={handleEditUserFormChange} />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="edit-isAdmin" name="isAdmin" checked={editUserFormData.isAdmin} onCheckedChange={(checked) => setEditUserFormData(prev => ({ ...prev, isAdmin: !!checked }))} />
                <Label htmlFor="edit-isAdmin" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Administrator Status
                </Label>
              </div>
              <Alert variant="default" className="mt-4 bg-muted/30">
                <Info className="h-4 w-4" />
                <AlertTitle>Note on Other Fields</AlertTitle>
                <AlertDescription className="text-xs">
                  Changing user's email, password, or disabling their account must be done through a backend process using the Firebase Admin SDK due to security permissions.
                </AlertDescription>
              </Alert>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={handleSaveUserChanges} disabled={updatingUser}>
                {updatingUser ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete User Dialog */}
      {userToDelete && (
        <Dialog open={isDeleteUserDialogOpen} onOpenChange={setIsDeleteUserDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center text-destructive"><Trash2 className="mr-2 h-5 w-5" /> Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the user <strong className="text-foreground">{userToDelete.email}</strong>?
                This action is a placeholder and requires a backend Cloud Function to permanently delete the user's Authentication record and Firestore data.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-start">
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="button" variant="destructive" onClick={handleDeleteUser} disabled={deletingUser}>
                {deletingUser ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Delete User (Placeholder)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}


      {/* Suggestion Detail Dialog */}
      {selectedSuggestion && (
        <Dialog open={isSuggestionDetailOpen} onOpenChange={setIsSuggestionDetailOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center"><Lightbulb className="mr-2 h-5 w-5 text-primary" /> Suggestion: {selectedSuggestion.toolName}</DialogTitle>
              <DialogDescription>Submitted by: {selectedSuggestion.userEmail} on {formatFirestoreTimestampOrDate(selectedSuggestion.submittedAt as FirestoreTimestamp)}</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] p-1 pr-3">
            <div className="space-y-3 py-4">
              <div><Label className="font-semibold">Description:</Label><p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-2 rounded-md">{selectedSuggestion.description}</p></div>
              {selectedSuggestion.category && <div><Label className="font-semibold">Category:</Label><p className="text-sm text-muted-foreground">{selectedSuggestion.category}</p></div>}
              <div>
                <Label htmlFor="suggestion-status" className="font-semibold">Status:</Label>
                <Select
                  defaultValue={selectedSuggestion.status}
                  onValueChange={(newStatus) => handleUpdateSuggestionStatus(selectedSuggestion.id!, newStatus as ToolSuggestion['status'])}
                  disabled={updatingSuggestionStatus}
                >
                  <SelectTrigger id="suggestion-status" className="mt-1">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {(["New", "Reviewed", "Planned", "Implemented", "Rejected"] as ToolSuggestion['status'][]).map(status => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {updatingSuggestionStatus && <Loader2 className="mt-2 h-4 w-4 animate-spin" />}
              </div>
            </div>
            </ScrollArea>
            <DialogFooter><DialogClose asChild><Button variant="outline">Close</Button></DialogClose></DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Run Log Detail Dialog */}
      {selectedRunLog && (
        <Dialog open={isRunLogDetailOpen} onOpenChange={setIsRunLogDetailOpen}>
          <DialogContent className="sm:max-w-lg md:max-w-2xl lg:max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center"><FileText className="mr-2 h-5 w-5 text-primary"/>Run Log Details</DialogTitle>
              <DialogDescription>For: {selectedRunLog.workflowName} by {selectedRunLog.userEmail} on {formatFirestoreTimestampOrDate(selectedRunLog.timestamp as FirestoreTimestamp)}</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] p-1 pr-3">
            <div className="space-y-4 py-4 text-sm">
              <div><h3 className="font-semibold mb-1">Run Info</h3>
                <p><span className="text-muted-foreground">Status:</span> <Badge variant={selectedRunLog.status === "Completed" ? "default" : "destructive"}>{selectedRunLog.status}</Badge></p>
                <p><span className="text-muted-foreground">Credits Used:</span> {selectedRunLog.creditCostAtRun}</p>
              </div>
              <div className="border-t pt-3"><h3 className="font-semibold mb-1">Input Details</h3>
                {selectedRunLog.inputDetails?.topic && (<p className="bg-muted p-2 rounded-md">Topic: {selectedRunLog.inputDetails.topic}</p>)}
                {selectedRunLog.inputDetails?.audioFileName && (
                    <div className="bg-muted p-2 rounded-md space-y-1">
                        <p><span className="font-semibold">Audio File:</span> {selectedRunLog.inputDetails.audioFileName}</p>
                        {selectedRunLog.inputDetails.audioFileType && <p><span className="font-semibold">Type:</span> {selectedRunLog.inputDetails.audioFileType}</p>}
                        {selectedRunLog.inputDetails.audioFileSize && <p><span className="font-semibold">Size:</span> {(selectedRunLog.inputDetails.audioFileSize / (1024*1024)).toFixed(2)} MB</p>}
                        {selectedRunLog.inputDetails.audioStorageUrl && (
                           <div className="mt-2 space-y-2">
                             <p className="flex items-center">
                               <span className="font-semibold">Stored Audio:</span>
                               <Link href={selectedRunLog.inputDetails.audioStorageUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-primary hover:underline inline-flex items-center">
                                 Download/Listen <LinkIcon className="ml-1 h-3 w-3" />
                               </Link>
                             </p>
                             <audio controls src={selectedRunLog.inputDetails.audioStorageUrl} className="w-full max-w-md">
                               Your browser does not support the audio element.
                             </audio>
                           </div>
                        )}
                    </div>
                 )}
                {selectedRunLog.inputDetails?.linkedinKeyword !== undefined && (<p className="bg-muted p-2 rounded-md">LinkedIn Keyword: {selectedRunLog.inputDetails.linkedinKeyword || '(Not provided)'}</p>)}
                {!selectedRunLog.inputDetails?.topic && !selectedRunLog.inputDetails?.audioFileName && selectedRunLog.inputDetails?.linkedinKeyword === undefined && (<p className="text-muted-foreground">No specific input details recorded.</p>)}
              </div>
              <div className="border-t pt-3"><h3 className="font-semibold mb-1">Output</h3>
                {selectedRunLog.status === 'Completed' ? (
                  <>
                    {isKeywordSuggestionOutput(selectedRunLog.fullOutput) && (
                        <Card className="bg-muted/50 p-3 text-xs"><CardHeader className="p-0 pb-2"><CardTitle className="text-sm">Keywords:</CardTitle></CardHeader><CardContent className="p-0"><ul className="list-disc pl-4 space-y-0.5 max-h-48 overflow-y-auto">
                              {selectedRunLog.fullOutput.map((item, index) => (<li key={index}><strong>{item.keyword}</strong>{item.potentialUse && <span className="text-xs"> - {item.potentialUse}</span>}{item.relevanceScore !== undefined && <Badge variant="outline" className="ml-1 text-xs">{(item.relevanceScore * 100).toFixed(0)}%</Badge>}</li>))}
                        </ul></CardContent></Card>
                    )}
                    {isAudioTranscriptSummaryOutput(selectedRunLog.fullOutput) && selectedRunLog.fullOutput.transcriptSummary && (
                        <Card className="bg-muted/50 p-3 text-xs space-y-2">
                            <CardHeader className="p-0 pb-1"><CardTitle className="text-sm">{selectedRunLog.fullOutput.transcriptSummary.title}</CardTitle><CardDescription className="text-xs">Sentiment: <Badge variant="outline" className="text-xs">{selectedRunLog.fullOutput.transcriptSummary.sentiment}</Badge></CardDescription></CardHeader>
                            <CardContent className="p-0 space-y-1.5">
                                <div><h4 className="font-medium text-xs">Summary:</h4><p className="text-xs whitespace-pre-line">{selectedRunLog.fullOutput.transcriptSummary.summary}</p></div>
                                {renderSummaryList(selectedRunLog.fullOutput.transcriptSummary.main_points, <CheckCircle className="mr-1 h-3 w-3 text-green-500" />)}
                                {renderSummaryList(selectedRunLog.fullOutput.transcriptSummary.action_items, <ListChecks className="mr-1 h-3 w-3 text-blue-500" />)}
                            </CardContent>
                        </Card>
                    )}
                    {isLinkedInPostGeneratorOutput(selectedRunLog.fullOutput) && (
                        <Card className="bg-muted/50 p-3 text-xs space-y-2">
                            <div><Label className="text-xs font-medium">Post Text:</Label><Textarea readOnly value={selectedRunLog.fullOutput.postText} className="min-h-[80px] bg-background text-xs mt-0.5"/></div>
                            {selectedRunLog.fullOutput.suggestedImagePrompt && (<div><Label className="text-xs font-medium">Image Prompt:</Label><Input readOnly value={selectedRunLog.fullOutput.suggestedImagePrompt} className="bg-background text-xs mt-0.5"/></div>)}
                            {selectedRunLog.fullOutput.hashtags && selectedRunLog.fullOutput.hashtags.length > 0 && (<div><Label className="text-xs font-medium">Hashtags:</Label><div className="mt-0.5 flex flex-wrap gap-1">{selectedRunLog.fullOutput.hashtags.map((tag, idx) => <Badge key={idx} variant="secondary" className="text-xs">{tag}</Badge>)}</div></div>)}
                        </Card>
                    )}
                    {!isKeywordSuggestionOutput(selectedRunLog.fullOutput) && !isAudioTranscriptSummaryOutput(selectedRunLog.fullOutput) && !isLinkedInPostGeneratorOutput(selectedRunLog.fullOutput) && typeof selectedRunLog.fullOutput === 'string' && (<pre className="text-xs bg-muted p-2 rounded-md whitespace-pre-wrap">{selectedRunLog.fullOutput}</pre>)}
                    {!isKeywordSuggestionOutput(selectedRunLog.fullOutput) && !isAudioTranscriptSummaryOutput(selectedRunLog.fullOutput) && !isLinkedInPostGeneratorOutput(selectedRunLog.fullOutput) && typeof selectedRunLog.fullOutput !== 'string' && selectedRunLog.fullOutput && (<p className="text-muted-foreground">Output: {selectedRunLog.outputSummary || 'Complex object, view raw data if needed.'}</p>)}
                    {!selectedRunLog.fullOutput && (<p className="text-muted-foreground">No full output recorded. Summary: {selectedRunLog.outputSummary || 'N/A'}</p>)}
                  </>
                ) : (<Alert variant="destructive"><AlertCircleIcon className="h-4 w-4"/><AlertTitle>Error</AlertTitle><AlertDescription>{selectedRunLog.errorDetails || 'No specific error message.'}</AlertDescription></Alert>)}
              </div>
            </div>
            </ScrollArea>
            <DialogFooter><DialogClose asChild><Button variant="outline">Close</Button></DialogClose></DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  );
}
