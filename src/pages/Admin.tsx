import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  display_name: string;
  email: string | null;
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
}

interface Upvote {
  id: string;
  user_id: string;
  report_id: string;
  created_at: string;
}

const Admin = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [upvotes, setUpvotes] = useState<Upvote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [usersData, blocksData, reportsData, upvotesData] = await Promise.all([
        supabase.from("public_profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("blocks").select("*").order("created_at", { ascending: false }),
        supabase.from("reports").select("*").order("created_at", { ascending: false }),
        supabase.from("upvotes").select("*").order("created_at", { ascending: false }),
      ]);

      if (usersData.error) throw usersData.error;
      if (blocksData.error) throw blocksData.error;
      if (reportsData.error) throw reportsData.error;
      if (upvotesData.error) throw upvotesData.error;

      setUsers(usersData.data);
      setBlocks(blocksData.data);
      setReports(reportsData.data);
      setUpvotes(upvotesData.data);
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
          <TabsTrigger value="blocks">Blocks ({blocks.length})</TabsTrigger>
          <TabsTrigger value="reports">Reports ({reports.length})</TabsTrigger>
          <TabsTrigger value="upvotes">Upvotes ({upvotes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>All registered users in the system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-semibold">{user.display_name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <p className="text-xs text-muted-foreground">
                        ID: {user.id.slice(0, 8)}...
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">Score: {user.contribution_score}</Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
                {users.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No users yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blocks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Blocks</CardTitle>
              <CardDescription>Community blocks and their need scores</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {blocks.map((block) => (
                  <div
                    key={block.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-semibold">{block.name}</p>
                      <p className="text-sm text-muted-foreground">Slug: {block.slug}</p>
                      <p className="text-xs text-muted-foreground">
                        ID: {block.id.slice(0, 8)}...
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">Need Score: {block.need_score}</Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(block.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
                {blocks.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No blocks yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reports</CardTitle>
              <CardDescription>All issue reports from the community</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge>{report.type}</Badge>
                        <Badge variant={report.status === "open" ? "destructive" : "secondary"}>
                          {report.status}
                        </Badge>
                      </div>
                      <p className="text-sm">{report.description || "No description"}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        ID: {report.id.slice(0, 8)}... | Block: {report.block_id?.slice(0, 8) || "None"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {new Date(report.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
                {reports.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No reports yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upvotes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upvotes</CardTitle>
              <CardDescription>All upvotes on reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upvotes.map((upvote) => (
                  <div
                    key={upvote.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="text-sm">
                        User: {upvote.user_id.slice(0, 8)}... → Report:{" "}
                        {upvote.report_id.slice(0, 8)}...
                      </p>
                      <p className="text-xs text-muted-foreground">ID: {upvote.id.slice(0, 8)}...</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {new Date(upvote.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
                {upvotes.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No upvotes yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
