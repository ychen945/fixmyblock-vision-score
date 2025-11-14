import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Copy, AlertCircle, CheckCircle2, ThumbsUp, Timer, Gauge, UserCheck, MapPin, CheckCircle, X, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import {
  calculateBlockStats,
  type BlockReport,
  type BlockStats,
  type SupabaseBlockReport,
} from "@/lib/block";
import { getAvatarUrl } from "@/lib/utils";
import ReportReplies from "@/components/ReportReplies";
import { normalizeReplies, type ReportReply, type SupabaseReportReply } from "@/lib/replies";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

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

const ISSUE_FILTER_OPTIONS = [
  { value: "all", label: "All issues" },
  { value: "animals", label: "Animals" },
  { value: "broken_light", label: "Broken Light" },
  { value: "consumer_employee_protection", label: "Consumer & Employee Protection" },
  { value: "covid_19_assistance", label: "COVID-19 Assistance" },
  { value: "disabilities", label: "Disabilities" },
  { value: "flooding", label: "Flooding" },
  { value: "garbage_recycling", label: "Garbage & Recycling" },
  { value: "health", label: "Health" },
  { value: "home_buildings", label: "Home & Buildings" },
  { value: "other", label: "Other" },
  { value: "parks_trees_environment", label: "Parks, Trees & Environment" },
  { value: "pothole", label: "Pothole" },
  { value: "public_safety", label: "Public Safety" },
  { value: "seniors", label: "Seniors" },
  { value: "trash", label: "Trash" },
  { value: "transportation_streets", label: "Transportation & Streets" },
];

const computeNeedScore = (reports: BlockReport[]): number => {
  if (reports.length === 0) return 10;

  const totalReports = reports.length;
  const openReports = reports.filter((r) => r.status !== "resolved").length;
  const upvoteSum = reports.reduce((sum, report) => sum + report.upvotes.length, 0);
  const avgUpvotes = totalReports ? upvoteSum / totalReports : 0;

  const resolvedReports = reports.filter((report) => report.status === "resolved" && report.resolved_at);
  const resolutionRate = totalReports ? resolvedReports.length / totalReports : 0;

  const resolutionDurations = resolvedReports.map((report) => {
    const resolvedAt = new Date(report.resolved_at!).getTime();
    const createdAt = new Date(report.created_at).getTime();
    return Math.max(0, resolvedAt - createdAt);
  });
  const avgResolutionHours = resolutionDurations.length
    ? resolutionDurations.reduce((sum, duration) => sum + duration, 0) / resolutionDurations.length / (1000 * 60 * 60)
    : 72;

  const volumeScore = Math.min(30, (totalReports / 15) * 30);
  const openScore = Math.min(25, (openReports / Math.max(totalReports, 1)) * 25);
  const upvoteScore = Math.min(20, (avgUpvotes / 5) * 20);
  const resolutionRateScore = Math.min(15, (1 - resolutionRate) * 15);
  const speedScore = Math.min(10, (avgResolutionHours / 72) * 10);

  return Math.round(Math.max(0, Math.min(100, volumeScore + openScore + upvoteScore + resolutionRateScore + speedScore)));
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
  const [issueFilter, setIssueFilter] = useState<string>("all");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [petitionOpen, setPetitionOpen] = useState(false);
  const [petitionLoading, setPetitionLoading] = useState(false);
  const [petitionContent, setPetitionContent] = useState("");
  const [petitionSent, setPetitionSent] = useState(false);
  const petitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
          created_by,
          ai_metadata,
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
          verifications:report_verifications(user_id),
          replies:report_replies(
            id,
            body,
            created_at,
            author_id,
            author:users(display_name, avatar_url)
          )
        `)
        .eq("block_id", blockData.id)
        .order("created_at", { ascending: false });

      if (reportsError) throw reportsError;

      const rawReports: SupabaseBlockReport[] = (reportsData as SupabaseBlockReport[] | null) ?? [];
      const baseReports: BlockReport[] = rawReports.map((report) => {
        const normalizedUser = Array.isArray(report.user) ? report.user[0] : report.user;
        const severity =
          report.severity ??
          (report.ai_metadata?.severity as BlockReport["severity"]) ??
          "medium";
        return {
          ...report,
          replies: [],
          severity,
          user: normalizedUser || { display_name: "Community Member", avatar_url: null },
          upvotes: report.upvotes || [],
          verifications: report.verifications || [],
        };
      });

      const repliesMap = await fetchRepliesMap(baseReports.map((r) => r.id));
      const enrichedReports = baseReports.map((report) => ({
        ...report,
        replies: repliesMap[report.id] || [],
      }));

      setReports(enrichedReports);

      setStats(calculateBlockStats(enrichedReports));

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

  const fetchRepliesMap = async (reportIds: string[]) => {
    if (reportIds.length === 0) return {};
    const { data, error } = await supabase
      .from("report_replies")
      .select(`
        id,
        body,
        created_at,
        author_id,
        report_id,
        author:users(display_name, avatar_url)
      `)
      .in("report_id", reportIds);

    if (error) throw error;
    const normalized = normalizeReplies(data as SupabaseReportReply[] | null);
    return normalized.reduce<Record<string, ReportReply[]>>((acc, reply) => {
      acc[reply.report_id] = acc[reply.report_id]
        ? [...acc[reply.report_id], reply]
        : [reply];
      return acc;
    }, {});
  };

  useEffect(() => {
    loadBlockData();
  }, [loadBlockData]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (petitionTimerRef.current) {
        clearTimeout(petitionTimerRef.current);
      }
    };
  }, []);

  const filteredReports = useMemo(() => {
    if (issueFilter === "all") return reports;
    return reports.filter((report) => report.type === issueFilter);
  }, [reports, issueFilter]);

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

  const handleReplyAdded = (reportId: string, reply: ReportReply) => {
    setReports((prev) =>
      prev.map((report) =>
        report.id === reportId
          ? { ...report, replies: [...report.replies, reply] }
          : report,
      ),
    );
  };

  const buildPetitionDraft = () => {
    if (!block) return "";
    const recentReports = reports
      .filter((report) => {
        const createdAt = new Date(report.created_at).getTime();
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        return createdAt >= thirtyDaysAgo;
      })
      .slice(0, 4);

    const fallbackReports = reports.slice(0, 3);
    const selectedReports = recentReports.length > 0 ? recentReports : fallbackReports;

    const summary = selectedReports.length
      ? selectedReports
          .map((report) => {
            const friendlyType = report.type.replace(/_/g, " ");
            const relativeDate = formatDistanceToNow(new Date(report.created_at), { addSuffix: true });
            return `• ${friendlyType} (${report.status}) reported ${relativeDate}`;
          })
          .join("\n")
      : "• Neighbors continue to flag unresolved civic issues that impact daily life.";

    const blockLink = `${window.location.origin}/block/${block.slug}`;

    return `To: Office of the Mayor of Chicago & Ward Leadership\n\n` +
      `Subject: Coordinated response for ${block.name}\n\n` +
      `Dear City Leaders,\n\n` +
      `As validated residents of ${block.name}, we request immediate attention to the issues that continue to affect our block. Below is a snapshot of the most recent reports filed by our neighbors:\n${summary}\n\n` +
      `We appreciate the ongoing partnership with city agencies, and we respectfully ask for a coordinated plan that addresses these items with clear timelines and follow-up communication to local residents.\n\n` +
      `Attached links to the reports: ${blockLink}\n\n` +
      `Sincerely,\nConcerned neighbors of ${block.name}`;
  };

  const closePetition = () => {
    if (petitionTimerRef.current) {
      clearTimeout(petitionTimerRef.current);
      petitionTimerRef.current = null;
    }
    setPetitionOpen(false);
    setPetitionSent(false);
  };

  const handleOpenPetition = () => {
    setPetitionSent(false);
    setPetitionLoading(true);
    setPetitionOpen(true);
    const draft = buildPetitionDraft();
    setTimeout(() => {
      setPetitionContent(draft);
      setPetitionLoading(false);
    }, 600);
  };

  const handleSignPetition = () => {
    setPetitionSent(true);
    petitionTimerRef.current = setTimeout(() => {
      closePetition();
    }, 3000);
  };

  const needScore = useMemo(() => computeNeedScore(reports), [reports]);


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

  const resolutionRateDemo = Math.min(98, Math.max(45, 100 - Math.round(needScore * 0.7)));
  const neighborsSupportingDemo = 70 + Math.round(needScore * 1.1);
  const meanTimeDemo = needScore >= 70
    ? "48 days"
    : needScore >= 40
      ? "35 days"
      : "12 days";

  return (
    <>
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
          <div className={`rounded-xl border bg-gradient-to-r ${getNeedScoreGradient(needScore)} p-4`}>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="secondary" className="text-lg px-3 py-1 bg-white/70 text-foreground">
                  Need Score: {needScore}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Higher score = more help needed
                </span>
              </div>
              <div className="flex flex-col items-center text-center gap-1 md:items-end md:text-right">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={handleOpenPetition}
                >
                  ✍️ Write a petition
                </Button>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground w-full">
                  <Shield className="h-3.5 w-3.5 text-primary" />
                  <span>You&apos;re validated</span>
                </div>
              </div>
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
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle>Community Reports</CardTitle>
                <CardDescription>
                  {stats.recentReports} reports filed in the past 30 days
                </CardDescription>
              </div>
              <Select value={issueFilter} onValueChange={setIssueFilter}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  {ISSUE_FILTER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {filteredReports.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  {reports.length === 0
                    ? "No reports for this block yet"
                    : "No reports match this issue type"}
                </p>
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
                {filteredReports.map((report) => {
                  const statusVariant =
                    report.status === "resolved"
                      ? "default"
                      : report.status === "civic_bodies_notified"
                        ? "secondary"
                        : "destructive";
                  const avatarSrc = getAvatarUrl(report.created_by, report.user.avatar_url);

                  return (
                    <Card key={report.id} className="border">
                      <CardContent className="p-4 relative">
                        <Badge className="absolute top-4 right-4 text-xs" variant={statusVariant}>
                          {report.status === "civic_bodies_notified" ? "Civic Notified" : report.status}
                        </Badge>

                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={avatarSrc} />
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

                            <ReportReplies
                              reportId={report.id}
                              replies={report.replies}
                              currentUserId={currentUserId}
                              onReplyAdded={(newReply) => handleReplyAdded(report.id, newReply)}
                            />
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

      <Dialog
        open={petitionOpen}
        onOpenChange={(open) => {
          if (!open) {
            closePetition();
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          {petitionSent ? (
            <div className="relative rounded-xl border bg-muted/30 p-8 text-center space-y-4">
              <button
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition"
                onClick={closePetition}
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
              <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto" />
              <h3 className="text-2xl font-semibold">Petition sent</h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Your signature has been recorded and forwarded to civic leadership. Thanks for representing {block.name}.
              </p>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Petition for {block.name}</DialogTitle>
                <DialogDescription>
                  We drafted a concise petition using the latest reports. Review the text below and sign when it looks good.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {petitionLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Gathering highlights from recent reports…</p>
                  </div>
                ) : (
                  <ScrollArea className="h-64 rounded-lg border bg-muted/20 p-4">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {petitionContent || "No petition draft available. Close this dialog and try again."}
                    </p>
                  </ScrollArea>
                )}
                <Button
                  className="w-full"
                  disabled={petitionLoading || !petitionContent}
                  onClick={handleSignPetition}
                >
                  Sign & Submit
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Block;
