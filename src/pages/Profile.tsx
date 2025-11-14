import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, User, FileText, ThumbsUp, Award, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { getAvatarUrl } from "@/lib/utils";
import ReportReplies from "@/components/ReportReplies";
import { normalizeReplies, type ReportReply, type SupabaseReportReply } from "@/lib/replies";

interface UserReport {
  id: string;
  type: string;
  severity: "low" | "medium" | "high";
  status: string;
  created_at: string;
  description: string | null;
  block: {
    name: string;
    slug: string;
  } | null;
  photo_url: string;
  upvotes: { user_id: string }[];
  verifications: { user_id: string }[];
  replies: ReportReply[];
}

interface UserProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  email: string | null;
  contribution_score: number;
}

const CIVIC_TIERS = [
  {
    label: "Block Scout",
    threshold: 0,
    icon: <FileText className="h-4 w-4 text-[#cd7f32]" />,
    description: "Just getting started reporting issues",
  },
  {
    label: "Neighborhood Steward",
    threshold: 150,
    icon: <ThumbsUp className="h-4 w-4 text-[#c0c0c0]" />,
    description: "Trusted voice for local improvements",
  },
  {
    label: "City Champion",
    threshold: 400,
    icon: <Award className="h-4 w-4 text-[#d4af37]" />,
    description: "Leading civic change across Chicago",
  },
];

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [reports, setReports] = useState<UserReport[]>([]);
  const [stats, setStats] = useState({
    reportsCount: 0,
    upvotesReceived: 0,
    contributionScore: 0,
  });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      // Try to get current authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      const sessionUserId = user?.id ?? null;
      
      let userId = sessionUserId;

      // If no authenticated user, use first demo user
      if (!userId) {
        const { data: demoUsers } = await supabase
          .from("public_profiles")
          .select("id")
          .limit(1);
        
        if (demoUsers && demoUsers.length > 0) {
          userId = demoUsers[0].id;
        }
      }

      if (!userId) {
        toast({
          title: "No user found",
          description: "Please sign in to view your profile",
          variant: "destructive",
        });
        navigate("/");
        return;
      }
      setCurrentUserId(sessionUserId);

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch user's reports with upvote counts
      const { data: reportsData, error: reportsError } = await supabase
        .from("reports")
        .select(`
          id,
          type,
          ai_metadata,
          status,
          created_at,
          description,
          photo_url,
          block:blocks(name, slug),
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
        .eq("created_by", userId)
        .order("created_at", { ascending: false });

      if (reportsError) throw reportsError;

      const baseReports: UserReport[] = (reportsData || []).map((report: any) => {
        const severity =
          report.severity ??
          (report.ai_metadata?.severity as UserReport["severity"]) ??
          "medium";

        return {
          ...report,
          severity,
          replies: [],
          block: Array.isArray(report.block) ? report.block[0] : report.block,
          upvotes: report.upvotes || [],
          verifications: report.verifications || [],
        };
      });

      const repliesMap = await fetchRepliesMap(baseReports.map((r) => r.id));
      const normalizedReports = baseReports.map((report) => ({
        ...report,
        replies: repliesMap[report.id] || [],
      }));

      setReports(normalizedReports);

      // Calculate stats
      const reportsCount = normalizedReports.length;
      const upvotesReceived = normalizedReports.reduce(
        (sum, report) => sum + report.upvotes.length,
        0
      );

      // Use contribution_score from database or calculate it
      const contributionScore = profileData.contribution_score || 
        (5 * reportsCount + upvotesReceived);

      setStats({
        reportsCount,
        upvotesReceived,
        contributionScore,
      });

    } catch (error: any) {
      console.error("Error loading profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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

  const handleReplyAdded = (reportId: string, reply: ReportReply) => {
    setReports((prev) =>
      prev.map((report) =>
        report.id === reportId ? { ...report, replies: [...report.replies, reply] } : report,
      ),
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground mb-4">Profile not found</p>
            <Button onClick={() => navigate("/home")} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const profileAvatar = getAvatarUrl(profile.id, profile.avatar_url);
  const tier = [...CIVIC_TIERS].reverse().find((tier) => profile.contribution_score >= tier.threshold) ?? CIVIC_TIERS[0];

  return (
    <div className="min-h-screen bg-background">

      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profileAvatar} />
                <AvatarFallback className="text-2xl">
                  {profile.display_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h1 className="text-3xl font-bold mb-1">{profile.display_name}</h1>
                    {profile.email && (
                      <p className="text-muted-foreground">{profile.email}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 rounded-full border px-4 py-2 bg-background/80">
                    <div className="p-2 rounded-full bg-primary/10">
                      {tier.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{tier.label}</p>
                      <p className="text-xs text-muted-foreground">{tier.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.reportsCount}</p>
                  <p className="text-sm text-muted-foreground">Reports</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <ThumbsUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.upvotesReceived}</p>
                  <p className="text-sm text-muted-foreground">Upvotes Received</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Award className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.contributionScore}</p>
                  <p className="text-sm text-muted-foreground">Contribution Score</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Reports */}
        <Card>
          <CardHeader>
            <CardTitle>My Reports</CardTitle>
            <CardDescription>
              Your recent community issue reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <div className="text-center py-8">
                <User className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No reports yet</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => navigate("/report")}
                >
                  Create Your First Report
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map((report, index) => (
                  <div key={report.id}>
                    {index > 0 && <Separator className="my-4" />}
                    <Card className="border">
                      <CardContent className="p-4 relative">
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
                            <AvatarImage src={profileAvatar} />
                            <AvatarFallback>
                              {profile.display_name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0 pr-4">
                            <p className="text-sm">
                              <span className="font-semibold">{profile.display_name}</span>{" "}
                              reported a{" "}
                              <span className="font-medium">{report.type.replace("_", " ")}</span>{" "}
                              at{" "}
                              <span className="font-medium">{report.block?.name || "unknown location"}</span>
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
                            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <ThumbsUp className="h-3 w-3" />
                                {report.upvotes.length} {report.upvotes.length === 1 ? "upvote" : "upvotes"}
                              </span>
                              {report.block?.slug && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => navigate(`/block/${report.block?.slug}`)}
                                >
                                  View Block
                                </Button>
                              )}
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

export default Profile;
