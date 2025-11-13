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
  report_count?: number;
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
        .select(`
          *,
          reports:reports(count)
        `)
        .order("name");

      if (error) throw error;
      
      // Transform the data to include report count
      const blocksWithCounts = (data || []).map((block: any) => ({
        ...block,
        report_count: block.reports?.[0]?.count || 0,
        reports: undefined // Remove the reports array
      }));
      
      setBlocks(blocksWithCounts);
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

  const getReportHeatColor = (reportCount: number): string => {
    if (reportCount === 0) return "bg-gray-100/50 border-gray-300/50 hover:bg-gray-100";
    if (reportCount <= 2) return "bg-blue-100/50 border-blue-300/50 hover:bg-blue-100";
    if (reportCount <= 5) return "bg-yellow-100/50 border-yellow-400/50 hover:bg-yellow-100";
    if (reportCount <= 10) return "bg-orange-100/50 border-orange-400/50 hover:bg-orange-100";
    return "bg-red-100/50 border-red-400/50 hover:bg-red-100";
  };

  const getReportHeatBadge = (reportCount: number): "default" | "secondary" | "destructive" => {
    if (reportCount === 0) return "secondary";
    if (reportCount <= 5) return "default";
    return "destructive";
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
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-4 items-center">
                  <span className="font-semibold text-sm">Report Heatmap:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-gray-300" />
                    <span className="text-sm">No reports</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-300" />
                    <span className="text-sm">1-2 reports</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-yellow-400" />
                    <span className="text-sm">3-5 reports</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-orange-400" />
                    <span className="text-sm">6-10 reports</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-red-400" />
                    <span className="text-sm">11+ reports</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 items-center border-t pt-4">
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
              </div>
            </CardContent>
          </Card>

          {/* Neighborhood Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {blocks.map((block) => (
              <Card
                key={block.id}
                className={`cursor-pointer transition-all border-2 ${getReportHeatColor(block.report_count || 0)}`}
                onClick={() => setSelectedBlock(block)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-start justify-between gap-2">
                    <span>{block.name}</span>
                    <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant={getReportHeatBadge(block.report_count || 0)}>
                      {block.report_count || 0} {block.report_count === 1 ? 'Issue' : 'Issues'}
                    </Badge>
                    <Badge variant={getNeedScoreBadgeVariant(block.need_score)} className="text-xs">
                      Need: {block.need_score}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    className="w-full"
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
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Header */}
      <div className="border-b bg-card flex-shrink-0">
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

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">
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
              src={`https://www.google.com/maps?q=${encodeURIComponent(selectedBlock.name + ' Chicago IL')}&output=embed`}
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {reports.map((report) => (
                <Card key={report.id} className="flex flex-col">
                  <CardContent className="p-6 flex-1">
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
                    
                    <p className="text-base font-medium mb-3">
                      {report.description || "No description provided"}
                    </p>
                    
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm text-muted-foreground">
                        <span>Reported by </span>
                        <span className="font-medium">{report.user?.display_name || "Anonymous"}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(
                          `https://www.google.com/maps?q=${report.lat},${report.lng}`,
                          '_blank'
                        )}
                      >
                        <MapPin className="h-4 w-4 mr-1" />
                        View on Map
                      </Button>
                    </div>
                  </CardContent>
                  
                  {/* Mini map preview */}
                  <div className="border-t">
                    <iframe
                      width="100%"
                      height="200"
                      style={{ border: 0 }}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.google.com/maps?q=${report.lat},${report.lng}&output=embed&z=16`}
                      title={`Location of ${report.type}`}
                    />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
};

export default MapViewPage;
