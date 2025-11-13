import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, Home, Share2, Copy } from "lucide-react";
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

  const getShareText = () => {
    if (!report) return "";
    
    const blockPageUrl = `${window.location.origin}/block/${report.block?.slug}`;
    return `I just reported a ${report.type.replace("_", " ")} issue on FixMyBlock for ${report.block?.name || "my block"}. Check our block's Need Score here: ${blockPageUrl}`;
  };

  const handleShare = async () => {
    const shareText = getShareText();
    
    // Try native share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: "FixMyBlock Report",
          text: shareText,
        });
        toast({
          title: "Shared successfully",
          description: "Thanks for spreading the word!",
        });
      } catch (error) {
        // User cancelled or error occurred
        console.log("Share cancelled or failed:", error);
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(shareText);
        toast({
          title: "Copied to clipboard",
          description: "Share text copied! Paste it on your social media.",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to copy to clipboard",
          variant: "destructive",
        });
      }
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
          <div>
            <h1 className="text-3xl font-bold mb-3">Submitted!</h1>
            <p className="text-lg text-muted-foreground max-w-lg mx-auto">
              This has been validated as a real issue and will be forwarded to civic authorities.
            </p>
          </div>
        </div>

        {/* Report Summary Card */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-3">
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
          
          <Button 
            onClick={handleShare}
            variant="outline"
            className="w-full"
            size="lg"
          >
            {navigator.share ? (
              <Share2 className="mr-2 h-5 w-5" />
            ) : (
              <Copy className="mr-2 h-5 w-5" />
            )}
            {navigator.share ? "Share on Social" : "Copy Share Text"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SubmissionConfirmation;
