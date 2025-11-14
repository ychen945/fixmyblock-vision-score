import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Report {
  id: string;
  type: string;
  description: string | null;
  status: string;
  created_at: string;
  lat: number;
  lng: number;
  created_by: string;
  block_id: string | null;
  user: {
    display_name: string;
    avatar_url: string | null;
  };
  block: {
    name: string;
    slug: string;
  } | null;
  upvotes: { user_id: string }[];
  verifications: { user_id: string }[];
}

interface Block {
  id: string;
  name: string;
  slug: string;
}

const Home = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "upvotes">("date");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchReports();
    fetchBlocks();
    checkUser();
  }, []);

  const checkUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    setCurrentUserId(session?.user?.id || null);
  };

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from("reports")
        .select(
          `
          *,
          user:users!reports_created_by_fkey(display_name, avatar_url),
          block:blocks(name, slug),
          upvotes(user_id),
          verifications:report_verifications(user_id)
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error: any) {
      toast.error("Failed to load reports: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchBlocks = async () => {
    try {
      const { data, error } = await supabase
        .from("blocks")
        .select("id, name, slug")
        .order("name", { ascending: true });

      if (error) throw error;
      setBlocks(data || []);
    } catch (error: any) {
      console.error("Failed to load blocks:", error.message);
    }
  };

  const getFilteredAndSortedReports = () => {
    let filtered = reports;

    // Filter by block
    if (selectedBlock !== "all") {
      filtered = filtered.filter((r) => r.block?.slug === selectedBlock);
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    // Sort
    if (sortBy === "upvotes") {
      filtered = [...filtered].sort((a, b) => b.upvotes.length - a.upvotes.length);
    } else {
      filtered = [...filtered].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    return filtered;
  };

  const handleUpvote = async (reportId: string) => {
    if (!currentUserId) {
      toast.error("Please sign in to upvote");
      return;
    }

    const report = reports.find((r) => r.id === reportId);
    if (!report) return;

    const hasUpvoted = report.upvotes.some((u) => u.user_id === currentUserId);

    if (hasUpvoted) {
      // Remove upvote
      const { error } = await supabase
        .from("upvotes")
        .delete()
        .eq("report_id", reportId)
        .eq("user_id", currentUserId);

      if (error) {
        toast.error("Failed to remove upvote");
        return;
      }

      // Update local state
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId
            ? { ...r, upvotes: r.upvotes.filter((u) => u.user_id !== currentUserId) }
            : r
        )
      );
      return;
    }

    // Optimistic update
    setReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? { ...r, upvotes: [...r.upvotes, { user_id: currentUserId }] }
          : r
      )
    );

    try {
      const { error } = await supabase.from("upvotes").insert({
        report_id: reportId,
        user_id: currentUserId,
      });

      if (error) throw error;
      toast.success("Upvote added!");
    } catch (error: any) {
      // Revert optimistic update on error
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId
            ? { ...r, upvotes: r.upvotes.filter((u) => u.user_id !== currentUserId) }
            : r
        )
      );
      toast.error("Failed to upvote: " + error.message);
    }
  };

  const handleResolveReport = async (reportId: string) => {
    if (!currentUserId) {
      toast.error("Please sign in to close reports");
      return;
    }
    toast.info("Close report feature coming soon!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Filter and Sort Controls */}
      <div className="sticky top-14 z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            
            <Select value={selectedBlock} onValueChange={setSelectedBlock}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Neighborhoods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Neighborhoods</SelectItem>
                {blocks.map((block) => (
                  <SelectItem key={block.id} value={block.slug}>
                    {block.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value: "date" | "upvotes") => setSortBy(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Latest</SelectItem>
                <SelectItem value="upvotes">Most Upvoted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">🔴 Open</SelectItem>
              <SelectItem value="civic_bodies_notified">🟡 Civic Notified</SelectItem>
              <SelectItem value="resolved">🟢 Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Feed Content */}
      <ScrollArea className="h-[calc(100vh-14rem)]">
        <div className="container py-6">
          <div className="space-y-4">
            {getFilteredAndSortedReports().length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No reports found
              </div>
            ) : (
              getFilteredAndSortedReports().map((report) => {
                const hasUpvoted = report.upvotes.some((u) => u.user_id === currentUserId);
                
                return (
                  <Card key={report.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={report.user.avatar_url || undefined} />
                          <AvatarFallback>
                            {report.user.display_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">
                            <span className="font-semibold">
                              {report.user.display_name}
                            </span>{" "}
                            reported a{" "}
                            <span className="font-medium">
                              {report.type.replace("_", " ")}
                            </span>{" "}
                            at{" "}
                            <span className="font-medium">
                              {report.block?.name || "unknown location"}
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(report.created_at), {
                              addSuffix: true,
                            })}
                          </p>
                          {report.description && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {report.description}
                            </p>
                          )}
                          {report.status === "resolved" && report.verifications.length >= 2 && (
                            <p className="text-xs font-medium text-green-600 mt-2">
                              🎉 Verified by {report.verifications.length} residents
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-3">
                            <Badge
                              variant={
                                report.status === "resolved"
                                  ? "default"
                                  : report.status === "civic_bodies_notified"
                                    ? "secondary"
                                    : "destructive"
                              }
                            >
                              {report.status === "civic_bodies_notified" 
                                ? "🟡 civic notified" 
                                : report.status === "resolved" 
                                  ? "🟢 resolved" 
                                  : "🔴 open"}
                            </Badge>
                            <Button
                              size="sm"
                              variant={hasUpvoted ? "default" : "ghost"}
                              onClick={() => handleUpvote(report.id)}
                              className="text-xs"
                            >
                              👁️ I see this too ({report.upvotes.length})
                            </Button>
                            {report.status === "open" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleResolveReport(report.id)}
                                className="text-xs"
                              >
                                🛠️ Close Report
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Floating Action Button */}
      <Button
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
        size="icon"
        onClick={() => navigate("/report")}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
};

export default Home;
