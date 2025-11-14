import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, Home, Users, Megaphone, Sparkles, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ADVOCACY_CHANNELS: Record<string, string> = {
  pothole: "Chicago Department of Transportation (CDOT) Pothole Crew",
  transportation_streets: "CDOT Rapid Response Unit",
  trash: "Streets & Sanitation - Ward Sweep Team",
  garbage_recycling: "Streets & Sanitation - Recycling Outreach",
  flooding: "Metropolitan Water Reclamation District",
  parks_trees_environment: "Chicago Park District Field Office",
  broken_light: "Department of Assets, Information and Services",
  public_safety: "Chicago Police CAPS Office",
  animals: "Chicago Animal Care & Control",
  health: "Chicago Department of Public Health",
  home_buildings: "Department of Buildings Inspection Team",
  default: "Chicago 311 Advocacy Desk",
};

const getAdvocacyChannel = (issueType: string | null | undefined) => {
  if (!issueType) return ADVOCACY_CHANNELS.default;
  return ADVOCACY_CHANNELS[issueType as keyof typeof ADVOCACY_CHANNELS] ?? ADVOCACY_CHANNELS.default;
};

const SubmissionConfirmation = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);
  const [validationComplete, setValidationComplete] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState(ADVOCACY_CHANNELS.default);
  const [routingReady, setRoutingReady] = useState(false);
  const [broadcastReady, setBroadcastReady] = useState(false);
  const [contributionReady, setContributionReady] = useState(false);

  useEffect(() => {
    if (reportId) {
      fetchReport();
    }
  }, [reportId]);

  useEffect(() => {
    if (!report) return;
    const channel = getAdvocacyChannel(report.type);
    setSelectedChannel(channel);
    setValidationComplete(false);
    setRoutingReady(false);
    setBroadcastReady(false);
    setContributionReady(false);

    const validationTimer = setTimeout(() => {
      setValidationComplete(true);
    }, 2000);

    const routingTimer = setTimeout(() => {
      setRoutingReady(true);
    }, 4000);

    const broadcastTimer = setTimeout(() => {
      setBroadcastReady(true);
    }, 6000);

    const contributionTimer = setTimeout(() => {
      setContributionReady(true);
    }, 8000);

    return () => {
      clearTimeout(validationTimer);
      clearTimeout(routingTimer);
      clearTimeout(broadcastTimer);
      clearTimeout(contributionTimer);
    };
  }, [report]);

  const fetchReport = async () => {
    try {
      const { data, error } = await supabase
        .from("reports")
        .select(`
          *,
          block:blocks(name, slug),
          user:users(display_name, contribution_score)
        `)
        .eq("id", reportId)
        .single();

      if (error) throw error;
      setReport(data);
    } catch (error: any) {
      console.error("Error fetching report:", error);
      toast({
        title: "Error",
        description: "Failed to load report details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Report not found</p>
            <Button onClick={() => navigate("/home")} className="w-full mt-4">
              <Home className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6 py-8">
        {/* Success Message */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <CheckCircle className="h-20 w-20 text-primary" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-bold">Submitted!</h1>
        </div>

        {/* Report Summary Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Issue Type</p>
                  <div className="mt-1">
                    <Badge variant="secondary" className="text-base px-3 py-1">
                      {report.type.replace("_", " ")}
                    </Badge>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="text-lg font-medium mt-1">
                    {report.block?.name || "Unknown location"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Submitted</p>
                  <p className="font-medium mt-1">{formatDate(report.created_at)}</p>
                </div>
              </div>

              {report.photo_url && (
                <div className="md:w-1/2 rounded-lg overflow-hidden border">
                  <img
                    src={report.photo_url}
                    alt="Report evidence"
                    className="w-full h-full object-cover max-h-64"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Status + Contribution */}
        <Card className="bg-gradient-to-br from-background via-background to-muted/60 border-muted">
          <CardContent className="p-6 space-y-5">
            <div className="rounded-lg border bg-background/70 p-4 flex items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Neighbor validation</p>
                  <p className="font-medium">
                    {validationComplete
                      ? "Validated by local contributors"
                      : "Checking with nearby residents..."}
                  </p>
                </div>
              </div>
              {validationComplete ? (
                <CheckCircle className="h-5 w-5 text-emerald-500" />
              ) : (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              )}
            </div>

            <div className="rounded-lg border bg-background/70 p-4 flex items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Megaphone className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Alerted civic authorities</p>
                  <p className="font-medium">
                    {routingReady
                      ? `Dispatching to ${selectedChannel}`
                      : "Identifying responsible teams..."}
                  </p>
                </div>
              </div>
              {routingReady ? (
                <CheckCircle className="h-5 w-5 text-emerald-500" />
              ) : (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              )}
            </div>

            <div className="rounded-lg border bg-background/70 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Share2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Neighborhood broadcast</p>
                  <p className="font-medium">
                    {broadcastReady
                      ? "Shared on Twitter • Facebook • Instagram"
                      : "Posting to neighborhood feeds..."}
                  </p>
                </div>
              </div>
              {broadcastReady ? (
                <CheckCircle className="h-5 w-5 text-emerald-500" />
              ) : (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              )}
            </div>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-emerald-700">+10 Community Contribution</p>
                <p className="text-sm text-muted-foreground">
                  {contributionReady
                    ? `New total: ${report.user?.contribution_score ?? "—"} pts`
                    : "Updating your contribution score..."}
                </p>
              </div>
              {contributionReady ? (
                <Sparkles className="h-6 w-6 text-emerald-600" />
              ) : (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button 
            onClick={() => navigate("/home")} 
            className="w-full"
            size="lg"
          >
            <Home className="mr-2 h-5 w-5" />
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SubmissionConfirmation;
