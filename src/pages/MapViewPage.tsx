import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
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
  lat: number;
  lng: number;
  created_by: string;
  user: {
    display_name: string;
  };
}

const MapViewPage = () => {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlocks();
  }, []);

  useEffect(() => {
    if (selectedBlock) {
      fetchReportsForBlock(selectedBlock.id);
    }
  }, [selectedBlock]);

  const fetchBlocks = async () => {
    try {
      const { data, error } = await supabase
        .from("blocks")
        .select("*")
        .order("name");

      if (error) throw error;
      setBlocks(data || []);
    } catch (error: any) {
      toast.error("Failed to load neighborhoods: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchReportsForBlock = async (blockId: string) => {
    try {
      const { data, error } = await supabase
        .from("reports")
        .select(`
          id,
          type,
          description,
          status,
          created_at,
          lat,
          lng,
          created_by,
          user:users!reports_created_by_fkey(display_name)
        `)
        .eq("block_id", blockId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Fix nested user array issue
      const fixedData = (data || []).map((report: any) => ({
        ...report,
        user: Array.isArray(report.user) ? report.user[0] : report.user,
      }));
      
      setReports(fixedData);
    } catch (error: any) {
      toast.error("Failed to load reports: " + error.message);
    }
  };

  const getNeedScoreColor = (score: number): string => {
    if (score <= 30) return "bg-green-500/20 border-green-500/50 hover:bg-green-500/30";
    if (score <= 70) return "bg-yellow-500/20 border-yellow-500/50 hover:bg-yellow-500/30";
    return "bg-red-500/20 border-red-500/50 hover:bg-red-500/30";
  };

  const getNeedScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" => {
    if (score <= 30) return "secondary";
    if (score <= 70) return "default";
    return "destructive";
  };

  const getNeedScoreLabel = (score: number): string => {
    if (score <= 30) return "Low Need";
    if (score <= 70) return "Medium Need";
    return "High Need";
  };

  const handleBackToCity = () => {
    setSelectedBlock(null);
    setReports([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // CITY OVERVIEW MODE
  if (!selectedBlock) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Chicago Neighborhoods</h1>
            <p className="text-muted-foreground">Community Need Overview</p>
          </div>

          {/* Legend */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 items-center">
                <span className="font-semibold text-sm">Need Level:</span>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-500" />
                  <span className="text-sm">Low (0-30)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-yellow-500" />
                  <span className="text-sm">Medium (31-70)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-red-500" />
                  <span className="text-sm">High (71+)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Neighborhood Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {blocks.map((block) => (
              <Card
                key={block.id}
                className={`cursor-pointer transition-all border-2 ${getNeedScoreColor(block.need_score)}`}
                onClick={() => setSelectedBlock(block)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-start justify-between gap-2">
                    <span>{block.name}</span>
                    <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge variant={getNeedScoreBadgeVariant(block.need_score)}>
                      {getNeedScoreLabel(block.need_score)}
                    </Badge>
                    <span className="text-2xl font-bold text-muted-foreground">
                      {block.need_score}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    className="w-full mt-4"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedBlock(block);
                    }}
                  >
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // NEIGHBORHOOD DETAIL MODE
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto p-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToCity}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to City View
          </Button>
          
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold">{selectedBlock.name}</h1>
              <p className="text-muted-foreground mt-1">
                {reports.length} {reports.length === 1 ? "issue" : "issues"} reported
              </p>
            </div>
            <Badge variant={getNeedScoreBadgeVariant(selectedBlock.need_score)} className="text-lg px-4 py-2">
              {getNeedScoreLabel(selectedBlock.need_score)}: {selectedBlock.need_score}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Map Embed */}
        <Card className="mb-6 overflow-hidden">
          <CardContent className="p-0">
            <iframe
              width="100%"
              height="400"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d190255.27350514407!2d-87.87810669179704!3d41.8337329!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x880e2c3cd0f4cbed%3A0xafe0a6ad09c0c000!2sChicago%2C%20IL!5e0!3m2!1sen!2sus!4v1234567890"
              title={`Map of ${selectedBlock.name}`}
            />
          </CardContent>
        </Card>

        {/* Reports List */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Community Issues</h2>
          
          {reports.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No issues reported in this neighborhood yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <Card key={report.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary">
                          {report.type.replace("_", " ")}
                        </Badge>
                        <Badge variant={report.status === "open" ? "destructive" : "default"}>
                          {report.status}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    
                    <p className="text-base font-medium mb-2">
                      {report.description || "No description provided"}
                    </p>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Reported by</span>
                      <span className="font-medium">{report.user?.display_name || "Anonymous"}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapViewPage;
