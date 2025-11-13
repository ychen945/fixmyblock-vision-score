import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, Home, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SubmissionConfirmation = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    if (reportId) {
      fetchReport();
    }
  }, [reportId]);

  const fetchReport = async () => {
    try {
      const { data, error } = await supabase
        .from("reports")
        .select(`
          *,
          block:blocks(name, slug),
          user:users(display_name)
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

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: "Community Report Submitted",
        text: `I just reported a ${report?.type.replace("_", " ")} in my neighborhood!`,
        url: window.location.href,
      }).catch(() => {
        // User cancelled sharing
      });
    } else {
      toast({
        title: "Link copied",
        description: "Report link copied to clipboard",
      });
      navigator.clipboard.writeText(window.location.href);
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
          <CardHeader>
            <CardTitle>Report Not Found</CardTitle>
            <CardDescription>
              The report you're looking for doesn't exist or has been removed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/home")} className="w-full">
              <Home className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Success Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6 text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Report Submitted Successfully!</h1>
            <p className="text-muted-foreground">
              Thank you for helping improve your community. Your report has been logged
              and will be reviewed by local authorities.
            </p>
          </CardContent>
        </Card>

        {/* Report Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Report Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.photo_url && (
              <img
                src={report.photo_url}
                alt="Report photo"
                className="w-full h-64 object-cover rounded-lg border"
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Issue Type</p>
                <Badge className="mt-1">{report.type.replace("_", " ")}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant="destructive" className="mt-1">
                  {report.status}
                </Badge>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Location</p>
              <p className="font-medium">{report.block?.name || "Unknown location"}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {report.lat.toFixed(6)}, {report.lng.toFixed(6)}
              </p>
            </div>

            {report.description && (
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="mt-1">{report.description}</p>
              </div>
            )}

            {report.ai_metadata && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">AI Analysis</p>
                <p className="text-sm">{JSON.stringify(report.ai_metadata, null, 2)}</p>
              </div>
            )}

            <div>
              <p className="text-sm text-muted-foreground">Reported by</p>
              <p className="font-medium">{report.user?.display_name || "Anonymous"}</p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Button variant="outline" onClick={handleShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Button onClick={() => navigate("/home")}>
            <Home className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SubmissionConfirmation;
