import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus, List, Map } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import MapViewPage from "./MapViewPage";

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
}

const Home = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"feed" | "map">("feed");

  useEffect(() => {
    fetchReports();
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
          upvotes(user_id)
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

  const handleUpvote = async (reportId: string) => {
    if (!currentUserId) {
      toast.error("Please sign in to upvote");
      return;
    }

    const report = reports.find((r) => r.id === reportId);
    if (!report) return;

    const hasUpvoted = report.upvotes.some((u) => u.user_id === currentUserId);

    if (hasUpvoted) {
      toast.info("You've already upvoted this report");
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
      toast.error("Please sign in to resolve reports");
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

  const mapReports = reports.map((r) => ({
    id: r.id,
    lat: r.lat,
    lng: r.lng,
    type: r.type,
    description: r.description,
    status: r.status,
    block: r.block,
    upvote_count: r.upvotes.length,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header with Toggle */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">FixMyBlock</h1>
            <div className="flex gap-2">
              <Button
                variant={viewMode === "feed" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("feed")}
                className="flex items-center gap-2"
              >
                <List className="h-4 w-4" />
                Feed
              </Button>
              <Button
                variant={viewMode === "map" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("map")}
                className="flex items-center gap-2"
              >
                <Map className="h-4 w-4" />
                Map
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === "feed" ? (
          /* Community Feed View */
          <div className="h-full bg-background">
            <ScrollArea className="h-full">
              <div className="container mx-auto max-w-2xl p-4 space-y-3 pb-24">
                {reports.map((report) => (
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
                          <div className="flex items-center gap-2 mt-3">
                            <Badge
                              variant={
                                report.status === "open"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {report.status}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleUpvote(report.id)}
                              className="text-xs"
                            >
                              👍 I see this too ({report.upvotes.length})
                            </Button>
                            {report.status === "open" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleResolveReport(report.id)}
                                className="text-xs"
                              >
                                ✅ Resolved
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        ) : (
          /* Map View */
          <MapViewPage />
        )}
      </div>

      {/* Floating Action Button (only show on Feed view) */}
      {viewMode === "feed" && (
        <Button
          size="lg"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full shadow-lg z-50"
          onClick={() => navigate("/report")}
        >
          <Plus className="h-5 w-5 mr-2" />
          Report Issue
        </Button>
      )}
    </div>
  );
};

export default Home;
