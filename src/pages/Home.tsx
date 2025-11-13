import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import MapView from "@/components/MapView";
import { formatDistanceToNow } from "date-fns";

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
      {/* Top Bar */}
      <header className="border-b bg-background px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">FixMyBlock</h1>
        <Avatar
          className="cursor-pointer"
          onClick={() => navigate("/profile")}
        >
          <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=User" />
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Community Feed - Left Column */}
        <div className="w-1/2 border-r">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
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
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Map View - Right Column */}
        <div className="w-1/2 relative">
          <MapView reports={mapReports} />
        </div>
      </div>

      {/* Floating Action Button */}
      <Button
        size="lg"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full shadow-lg"
        onClick={() => navigate("/report")}
      >
        <Plus className="h-5 w-5 mr-2" />
        Report Issue
      </Button>
    </div>
  );
};

export default Home;
