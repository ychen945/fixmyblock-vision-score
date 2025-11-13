import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, User, FileText, ThumbsUp, Award, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserReport {
  id: string;
  type: string;
  status: string;
  created_at: string;
  block: {
    name: string;
    slug: string;
  } | null;
  upvote_count: number;
}

interface UserProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  email: string | null;
  contribution_score: number;
}

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

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      // Try to get current authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      
      let userId = user?.id;

      // If no authenticated user, use first demo user
      if (!userId) {
        const { data: demoUsers } = await supabase
          .from("users")
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
          status,
          created_at,
          block:blocks(name, slug)
        `)
        .eq("created_by", userId)
        .order("created_at", { ascending: false });

      if (reportsError) throw reportsError;

      // Get upvote counts for each report
      const reportsWithUpvotes = await Promise.all(
        (reportsData || []).map(async (report: any) => {
          const { count } = await supabase
            .from("upvotes")
            .select("*", { count: "exact", head: true })
            .eq("report_id", report.id);
          
          return {
            ...report,
            block: Array.isArray(report.block) ? report.block[0] : report.block,
            upvote_count: count || 0,
          };
        })
      );

      setReports(reportsWithUpvotes);

      // Calculate stats
      const reportsCount = reportsWithUpvotes.length;
      const upvotesReceived = reportsWithUpvotes.reduce(
        (sum, report) => sum + report.upvote_count,
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
        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-2xl">
                  {profile.display_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-1">{profile.display_name}</h1>
                {profile.email && (
                  <p className="text-muted-foreground">{profile.email}</p>
                )}
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
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary">
                            {report.type.replace("_", " ")}
                          </Badge>
                          <Badge
                            variant={report.status === "open" ? "destructive" : "default"}
                          >
                            {report.status}
                          </Badge>
                        </div>
                        <p className="font-medium">
                          {report.block?.name || "Unknown location"}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{formatDate(report.created_at)}</span>
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="h-3 w-3" />
                            {report.upvote_count} {report.upvote_count === 1 ? "upvote" : "upvotes"}
                          </span>
                        </div>
                      </div>
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

export default Profile;
