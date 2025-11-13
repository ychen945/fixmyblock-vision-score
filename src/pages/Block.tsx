import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Loader2, ArrowLeft, Copy, AlertCircle, CheckCircle2, ThumbsUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Block {
  id: string;
  name: string;
  slug: string;
  need_score: number;
}

interface Report {
  id: string;
  type: string;
  description: string | null;
  status: string;
  created_at: string;
  resolved_at: string | null;
  resolved_note: string | null;
  user: {
    display_name: string;
    avatar_url: string | null;
  };
  upvote_count: number;
}

const Block = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [block, setBlock] = useState<Block | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState({
    openIssues: 0,
    resolvedIssues: 0,
    totalUpvotes: 0,
  });

  useEffect(() => {
    if (slug) {
      loadBlockData();
    }
  }, [slug]);

  const loadBlockData = async () => {
    try {
      // Fetch block by slug
      const { data: blockData, error: blockError } = await supabase
        .from("blocks")
        .select("*")
        .eq("slug", slug)
        .single();

      if (blockError) throw blockError;
      setBlock(blockData);

      // Fetch reports for this block
      const { data: reportsData, error: reportsError } = await supabase
        .from("reports")
        .select(`
          id,
          type,
          description,
          status,
          created_at,
          resolved_at,
          resolved_note,
          created_by,
          user:users!reports_created_by_fkey(display_name, avatar_url)
        `)
        .eq("block_id", blockData.id)
        .order("created_at", { ascending: false });

      if (reportsError) throw reportsError;

      // Get upvote counts for each report
      const reportsWithUpvotes = await Promise.all(
        (reportsData || []).map(async (report) => {
          const { count } = await supabase
            .from("upvotes")
            .select("*", { count: "exact", head: true })
            .eq("report_id", report.id);
          
          return {
            ...report,
            upvote_count: count || 0,
          };
        })
      );

      setReports(reportsWithUpvotes);

      // Calculate stats
      const openIssues = reportsWithUpvotes.filter(r => r.status === "open").length;
      const resolvedIssues = reportsWithUpvotes.filter(r => r.status === "resolved").length;
      const totalUpvotes = reportsWithUpvotes.reduce((sum, r) => sum + r.upvote_count, 0);

      setStats({
        openIssues,
        resolvedIssues,
        totalUpvotes,
      });

    } catch (error: any) {
      console.error("Error loading block data:", error);
      toast({
        title: "Error",
        description: "Failed to load block information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied!",
        description: "Block link copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!block) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground mb-4">Block not found</p>
            <Button onClick={() => navigate("/home")} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/home")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Block Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">{block.name}</h1>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  Need Score: {block.need_score}
                </Badge>
              </div>
            </div>
            <Button onClick={handleCopyLink} variant="outline">
              <Copy className="mr-2 h-4 w-4" />
              Copy Link
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-destructive/10 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.openIssues}</p>
                  <p className="text-sm text-muted-foreground">Open Issues</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.resolvedIssues}</p>
                  <p className="text-sm text-muted-foreground">Resolved Issues</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <ThumbsUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalUpvotes}</p>
                  <p className="text-sm text-muted-foreground">Total Upvotes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reports List */}
        <Card>
          <CardHeader>
            <CardTitle>Community Reports</CardTitle>
            <CardDescription>
              Issues reported in this block
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No reports for this block yet</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => navigate("/report")}
                >
                  Report an Issue
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map((report, index) => (
                  <div key={report.id}>
                    {index > 0 && <Separator className="my-4" />}
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={report.user.avatar_url || undefined} />
                            <AvatarFallback>
                              {report.user.display_name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold">
                                {report.user.display_name}
                              </span>
                              <span className="text-muted-foreground">reported a</span>
                              <Badge variant="secondary">
                                {report.type.replace("_", " ")}
                              </Badge>
                            </div>

                            {report.description && (
                              <p className="text-sm">{report.description}</p>
                            )}

                            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                              <span>{formatDate(report.created_at)}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <ThumbsUp className="h-3 w-3" />
                                {report.upvote_count} {report.upvote_count === 1 ? "upvote" : "upvotes"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <Badge
                            variant={report.status === "open" ? "destructive" : "default"}
                          >
                            {report.status}
                          </Badge>
                          {report.status === "resolved" && report.resolved_at && (
                            <span className="text-xs text-muted-foreground">
                              Resolved {formatDistanceToNow(new Date(report.resolved_at), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>

                      {report.resolved_note && (
                        <div className="ml-13 bg-muted/50 p-3 rounded-lg">
                          <p className="text-sm">
                            <span className="font-medium">Resolution: </span>
                            {report.resolved_note}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Block;
