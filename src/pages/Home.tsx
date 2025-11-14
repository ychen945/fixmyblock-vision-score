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
import {
  normalizeFeedReports,
  type FeedReport,
  type SupabaseFeedReport,
} from "@/lib/feed";

type Report = FeedReport;

const ISSUE_TYPES = [
  { value: 'all', label: 'All Issue Types' },
  { value: 'animals', label: 'Animals' },
  { value: 'broken_light', label: 'Broken Light' },
  { value: 'consumer_employee_protection', label: 'Consumer & Employee Protection' },
  { value: 'covid_19_assistance', label: 'COVID-19 Assistance' },
  { value: 'disabilities', label: 'Disabilities' },
  { value: 'flooding', label: 'Flooding' },
  { value: 'garbage_recycling', label: 'Garbage & Recycling' },
  { value: 'health', label: 'Health' },
  { value: 'home_buildings', label: 'Home & Buildings' },
  { value: 'other', label: 'Other' },
  { value: 'parks_trees_environment', label: 'Parks, Trees & Environment' },
  { value: 'pothole', label: 'Pothole' },
  { value: 'public_safety', label: 'Public Safety' },
  { value: 'seniors', label: 'Seniors' },
  { value: 'trash', label: 'Trash' },
  { value: 'transportation_streets', label: 'Transportation & Streets' }
];

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
  const [issueTypeFilter, setIssueTypeFilter] = useState<string>("all");

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
      const normalizedReports = normalizeFeedReports(data as SupabaseFeedReport[] | null);
      setReports(normalizedReports);
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

    // Filter by issue type
    if (issueTypeFilter !== "all") {
      filtered = filtered.filter((r) => r.type === issueTypeFilter);
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
      toast.error("Please sign in to mark reports as resolved");
      return;
    }

    // Show gentle notification in bottom left
    toast.success("Thanks for letting us know!", {
      description: "📸 Got a photo? Adding one helps us verify and resolve faster!",
      duration: 5000,
    });

    // Here you could add logic to track that user provided feedback
    // For now, we just show the notification without marking as resolved
    console.log("User provided feedback for report:", reportId);
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
          <div className="flex items-center gap-4 flex-wrap">
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

            <Select value={issueTypeFilter} onValueChange={setIssueTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Issue type" />
              </SelectTrigger>
              <SelectContent>
                {ISSUE_TYPES.map((issue) => (
                  <SelectItem key={issue.value} value={issue.value}>
                    {issue.label}
                  </SelectItem>
                ))}
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
                  <Card key={report.id} className="relative">
                    <CardContent className="p-4">
                      {/* Status chip in top right */}
                      <Badge
                        variant={
                          report.status === "resolved"
                            ? "default"
                            : report.status === "civic_bodies_notified"
                              ? "secondary"
                              : "destructive"
                        }
                        className="absolute top-4 right-4 text-xs"
                      >
                        {report.status === "civic_bodies_notified" 
                          ? "Civic Notified" 
                          : report.status === "resolved" 
                            ? "Resolved" 
                            : "Open"}
                      </Badge>

                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={report.user.avatar_url || undefined} />
                          <AvatarFallback>
                            {report.user.display_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 pr-24">
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
                          
                          {report.photo_url && (
                            <div className="mt-3 rounded-lg overflow-hidden">
                              <img 
                                src={report.photo_url} 
                                alt="Report photo" 
                                className="w-full h-48 object-cover"
                                loading="lazy"
                              />
                            </div>
                          )}

                          {report.status === "resolved" && report.verifications.length >= 2 && (
                            <p className="text-xs font-medium text-green-600 mt-2">
                              🎉 Verified by {report.verifications.length} residents
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-3">
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
                                ✅ Mark Resolved
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
        className="fixed bottom-6 left-1/2 -translate-x-1/2 h-14 w-14 rounded-full shadow-lg"
        size="icon"
        onClick={() => navigate("/report")}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
};

export default Home;
