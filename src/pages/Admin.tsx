import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface User {
  id: string;
  display_name: string;
  email: string | null;
  avatar_url: string | null;
  contribution_score: number;
  created_at: string;
}

interface Block {
  id: string;
  name: string;
  slug: string;
  need_score: number;
  created_at: string;
}

interface Report {
  id: string;
  type: string;
  description: string | null;
  status: string;
  created_at: string;
  created_by: string;
  block_id: string | null;
  photo_url: string;
  lat: number;
  lng: number;
  resolved_at: string | null;
  resolved_note: string | null;
  ai_metadata: any;
}

interface Upvote {
  id: string;
  user_id: string;
  report_id: string;
  created_at: string;
}

interface ReportReply {
  id: string;
  report_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

interface ReportVerification {
  id: string;
  report_id: string;
  user_id: string;
  created_at: string;
}

const Admin = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [upvotes, setUpvotes] = useState<Upvote[]>([]);
  const [replies, setReplies] = useState<ReportReply[]>([]);
  const [verifications, setVerifications] = useState<ReportVerification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [usersData, blocksData, reportsData, upvotesData, repliesData, verificationsData] = await Promise.all([
        supabase.from("users").select("*").order("created_at", { ascending: false }),
        supabase.from("blocks").select("*").order("created_at", { ascending: false }),
        supabase.from("reports").select("*").order("created_at", { ascending: false }),
        supabase.from("upvotes").select("*").order("created_at", { ascending: false }),
        supabase.from("report_replies").select("*").order("created_at", { ascending: false }),
        supabase.from("report_verifications").select("*").order("created_at", { ascending: false }),
      ]);

      if (usersData.error) throw usersData.error;
      if (blocksData.error) throw blocksData.error;
      if (reportsData.error) throw reportsData.error;
      if (upvotesData.error) throw upvotesData.error;
      if (repliesData.error) throw repliesData.error;
      if (verificationsData.error) throw verificationsData.error;

      setUsers(usersData.data);
      setBlocks(blocksData.data);
      setReports(reportsData.data);
      setUpvotes(upvotesData.data);
      setReplies(repliesData.data);
      setVerifications(verificationsData.data);
    } catch (error: any) {
      toast.error("Failed to fetch data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-4xl font-bold mb-8">FixMyBlock Admin</h1>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
          <TabsTrigger value="blocks">Blocks ({blocks.length})</TabsTrigger>
          <TabsTrigger value="reports">Reports ({reports.length})</TabsTrigger>
          <TabsTrigger value="upvotes">Upvotes ({upvotes.length})</TabsTrigger>
          <TabsTrigger value="replies">Replies ({replies.length})</TabsTrigger>
          <TabsTrigger value="verifications">Verifications ({verifications.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>All registered users in the system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Display Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Avatar</TableHead>
                      <TableHead>Contribution Score</TableHead>
                      <TableHead>Created At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-mono text-xs">{user.id.slice(0, 8)}...</TableCell>
                          <TableCell className="font-semibold">{user.display_name}</TableCell>
                          <TableCell>{user.email || "N/A"}</TableCell>
                          <TableCell>
                            {user.avatar_url && (
                              <img src={user.avatar_url} alt="avatar" className="w-8 h-8 rounded-full" />
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{user.contribution_score}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(user.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blocks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Blocks</CardTitle>
              <CardDescription>All blocks in the system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Need Score</TableHead>
                      <TableHead>Created At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blocks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No blocks found
                        </TableCell>
                      </TableRow>
                    ) : (
                      blocks.map((block) => (
                        <TableRow key={block.id}>
                          <TableCell className="font-mono text-xs">{block.id.slice(0, 8)}...</TableCell>
                          <TableCell className="font-semibold">{block.name}</TableCell>
                          <TableCell className="text-muted-foreground">/{block.slug}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{block.need_score}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(block.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reports</CardTitle>
              <CardDescription>All issue reports in the system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead>Block ID</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Photo</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead>Resolved At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-muted-foreground">
                          No reports found
                        </TableCell>
                      </TableRow>
                    ) : (
                      reports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell className="font-mono text-xs">{report.id.slice(0, 8)}...</TableCell>
                          <TableCell className="capitalize">{report.type.replace(/_/g, " ")}</TableCell>
                          <TableCell className="max-w-xs truncate">{report.description || "N/A"}</TableCell>
                          <TableCell>
                            <Badge variant={report.status === "open" ? "destructive" : "default"}>
                              {report.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{report.created_by.slice(0, 8)}...</TableCell>
                          <TableCell className="font-mono text-xs">{report.block_id ? report.block_id.slice(0, 8) + "..." : "N/A"}</TableCell>
                          <TableCell className="text-xs">{report.lat.toFixed(4)}, {report.lng.toFixed(4)}</TableCell>
                          <TableCell>
                            {report.photo_url && (
                              <img src={report.photo_url} alt="report" className="w-12 h-12 object-cover rounded" />
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(report.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {report.resolved_at ? new Date(report.resolved_at).toLocaleDateString() : "N/A"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upvotes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upvotes</CardTitle>
              <CardDescription>All upvotes in the system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead>Report ID</TableHead>
                      <TableHead>Created At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upvotes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No upvotes found
                        </TableCell>
                      </TableRow>
                    ) : (
                      upvotes.map((upvote) => (
                        <TableRow key={upvote.id}>
                          <TableCell className="font-mono text-xs">{upvote.id.slice(0, 8)}...</TableCell>
                          <TableCell className="font-mono text-xs">{upvote.user_id.slice(0, 8)}...</TableCell>
                          <TableCell className="font-mono text-xs">{upvote.report_id.slice(0, 8)}...</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(upvote.created_at).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="replies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Report Replies</CardTitle>
              <CardDescription>All replies to reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Report ID</TableHead>
                      <TableHead>Author ID</TableHead>
                      <TableHead>Body</TableHead>
                      <TableHead>Created At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {replies.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No replies found
                        </TableCell>
                      </TableRow>
                    ) : (
                      replies.map((reply) => (
                        <TableRow key={reply.id}>
                          <TableCell className="font-mono text-xs">{reply.id.slice(0, 8)}...</TableCell>
                          <TableCell className="font-mono text-xs">{reply.report_id.slice(0, 8)}...</TableCell>
                          <TableCell className="font-mono text-xs">{reply.author_id.slice(0, 8)}...</TableCell>
                          <TableCell className="max-w-md truncate">{reply.body}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(reply.created_at).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Report Verifications</CardTitle>
              <CardDescription>All report verifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Report ID</TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead>Created At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {verifications.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No verifications found
                        </TableCell>
                      </TableRow>
                    ) : (
                      verifications.map((verification) => (
                        <TableRow key={verification.id}>
                          <TableCell className="font-mono text-xs">{verification.id.slice(0, 8)}...</TableCell>
                          <TableCell className="font-mono text-xs">{verification.report_id.slice(0, 8)}...</TableCell>
                          <TableCell className="font-mono text-xs">{verification.user_id.slice(0, 8)}...</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(verification.created_at).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
