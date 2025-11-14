import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, ArrowLeft, Copy, AlertCircle, CheckCircle2, ThumbsUp, Timer, Gauge, UserCheck, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import {
  calculateBlockStats,
  type BlockReport,
  type BlockStats,
  type SupabaseBlockReport,
} from "@/lib/block";

interface Block {
  id: string;
  name: string;
  slug: string;
  need_score: number;
}

const getNeedScoreGradient = (score: number) => {
  if (score >= 70) return "from-red-200 via-red-100 to-white";
  if (score >= 40) return "from-amber-200 via-amber-100 to-white";
  return "from-emerald-200 via-emerald-100 to-white";
};

const Block = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [block, setBlock] = useState<Block | null>(null);
  const [reports, setReports] = useState<BlockReport[]>([]);
  const [stats, setStats] = useState<BlockStats>({
    openIssues: 0,
    resolvedIssues: 0,
    meanResolutionTime: null,
    recentReports: 0,
  });

  const loadBlockData = useCallback(async () => {
    if (!slug) return;
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
          photo_url,
          lat,
          lng,
          user:users!reports_created_by_fkey(display_name, avatar_url),
          upvotes(user_id),
          verifications:report_verifications(user_id)
        `)
        .eq("block_id", blockData.id)
        .order("created_at", { ascending: false });

      if (reportsError) throw reportsError;

      const rawReports: SupabaseBlockReport[] = (reportsData as SupabaseBlockReport[] | null) ?? [];
      const normalizedReports: BlockReport[] = rawReports.map((report) => {
        const normalizedUser = Array.isArray(report.user) ? report.user[0] : report.user;
        return {
          ...report,
          user: normalizedUser || { display_name: "Community Member", avatar_url: null },
          upvotes: report.upvotes || [],
          verifications: report.verifications || [],
        };
      });

      setReports(normalizedReports);

      setStats(calculateBlockStats(normalizedReports));

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
  }, [slug, toast]);

  useEffect(() => {
    loadBlockData();
  }, [loadBlockData]);

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

  const resolutionRateDemo = Math.min(98, Math.max(45, 100 - Math.round(block.need_score * 0.7)));
  const neighborsSupportingDemo = 70 + Math.round(block.need_score * 1.1);
  const meanTimeDemo = block.need_score >= 70
    ? "48 days"
    : block.need_score >= 40
      ? "35 days"
      : "12 days";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/map2")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Map
          </Button>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Block Header */}
        <div className="mb-6 space-y-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-4xl font-bold">{block.name}</h1>
            </div>
            <Button onClick={handleCopyLink} variant="outline">
              <Copy className="mr-2 h-4 w-4" />
              Copy Link
            </Button>
          </div>
          <div className={`rounded-xl border bg-gradient-to-r ${getNeedScoreGradient(block.need_score)} p-4`}>
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="secondary" className="text-lg px-3 py-1 bg-white/70 text-foreground">
                Need Score: {block.need_score}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Higher score = more help needed
              </span>
            </div>
          </div>
        </div>

        {/* Overview Metrics */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>Last 30 days activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        <Timer className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">
                          {stats.meanResolutionTime ?? meanTimeDemo}
                        </p>
                        <p className="text-sm text-muted-foreground">Mean time to resolution</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Gauge className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{resolutionRateDemo}%</p>
                  <p className="text-sm text-muted-foreground">Resolution rate</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <UserCheck className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{neighborsSupportingDemo}</p>
                  <p className="text-sm text-muted-foreground">Neighbors supporting</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports List */}
        <Card>
          <CardHeader>
            <CardTitle>Community Reports</CardTitle>
            <CardDescription>
              {stats.recentReports} reports filed in the past 30 days
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
                {reports.map((report) => {
                  const statusVariant =
                    report.status === "resolved"
                      ? "default"
                      : report.status === "civic_bodies_notified"
                        ? "secondary"
                        : "destructive";

                  return (
                    <Card key={report.id} className="border">
                      <CardContent className="p-4 relative">
                        <Badge className="absolute top-4 right-4 text-xs" variant={statusVariant}>
                          {report.status === "civic_bodies_notified" ? "Civic Notified" : report.status}
                        </Badge>

                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={report.user.avatar_url || undefined} />
                            <AvatarFallback>
                              {report.user.display_name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0 pr-4">
                            <p className="text-sm">
                              <span className="font-semibold">{report.user.display_name}</span>{" "}
                              reported a{" "}
                              <span className="font-medium">{report.type.replace("_", " ")}</span>
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

                            {report.resolved_note && (
                              <div className="mt-3 bg-muted/40 rounded-md p-3 text-sm">
                                <span className="font-medium">Resolution update:</span>{" "}
                                {report.resolved_note}
                              </div>
                            )}

                            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1">
                                <ThumbsUp className="h-3 w-3" />
                                {report.upvotes.length} {report.upvotes.length === 1 ? "neighbor" : "neighbors"} see this
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="px-2 h-7"
                                onClick={() => window.open(`https://www.google.com/maps?q=${report.lat},${report.lng}`, "_blank")}
                              >
                                <MapPin className="h-3.5 w-3.5 mr-1" />
                                View location
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Block;
