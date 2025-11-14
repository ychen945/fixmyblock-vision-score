import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import { CHICAGO_NEIGHBORHOODS, type Neighborhood } from "@/lib/neighborhoods";

interface Report {
  id: string;
  type: string;
  severity?: string;
  created_by: string;
  description: string | null;
  status: string;
  created_at: string;
  lat: number;
  lng: number;
  photo_url: string;
  upvote_count: number;
  user: {
    display_name: string;
    avatar_url: string | null;
  };
}


const Map2 = () => {
  const navigate = useNavigate();
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<Neighborhood | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (selectedNeighborhood) {
      fetchBlockIdAndReports(selectedNeighborhood.slug);
    }
  }, [selectedNeighborhood]);

  // Initialize map for city overview
  useEffect(() => {
    if (selectedNeighborhood || !mapContainerRef.current) return;

    // Initialize map centered on Chicago
    mapRef.current = L.map(mapContainerRef.current).setView([41.8781, -87.6298], 11);

    // Add OpenStreetMap tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© OpenStreetMap contributors',
    }).addTo(mapRef.current);

    // Prepare heatmap data: [lat, lng, intensity (needScore normalized)]
    const heatData = CHICAGO_NEIGHBORHOODS.map((n) => [
      n.lat,
      n.lng,
      n.needScore / 100, // Normalize to 0-1 range
    ]);

    // Add heatmap layer
    // @ts-ignore - leaflet.heat types
    L.heatLayer(heatData, {
      radius: 30,
      blur: 25,
      maxZoom: 13,
      gradient: {
        0.2: "green",
        0.4: "yellow",
        0.6: "orange",
        1.0: "red",
      },
    }).addTo(mapRef.current);

    // Add clickable markers for each neighborhood
    CHICAGO_NEIGHBORHOODS.forEach((neighborhood) => {
      const marker = L.marker([neighborhood.lat, neighborhood.lng], {
        icon: createNeedScoreIcon(neighborhood.needScore),
        title: `${neighborhood.name} (Need Score: ${neighborhood.needScore})`,
      }).addTo(mapRef.current!);

      marker.bindPopup(`
        <div style="text-align: center;">
          <strong>${neighborhood.name}</strong><br/>
          Need Score: ${neighborhood.needScore}
        </div>
      `);

      marker.on("click", () => {
        navigate(`/block/${neighborhood.slug}`);
      });
    });

    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [selectedNeighborhood]);

  // Initialize neighborhood detail map with report markers
  useEffect(() => {
    if (!selectedNeighborhood || reports.length === 0 || !mapContainerRef.current) return;

    // Initialize map centered on neighborhood
    mapRef.current = L.map(mapContainerRef.current).setView(
      [selectedNeighborhood.lat, selectedNeighborhood.lng],
      14
    );

    // Add OpenStreetMap tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© OpenStreetMap contributors',
    }).addTo(mapRef.current);

    // Add markers for each report
    reports.forEach((report) => {
      const markerColor = report.status === "open" ? "#ef4444" : "#22c55e";
      
      const marker = L.circleMarker([report.lat, report.lng], {
        radius: 8,
        fillColor: markerColor,
        color: "#fff",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
      }).addTo(mapRef.current!);

      marker.bindPopup(`
        <div style="min-width: 200px;">
          <strong>${report.type}</strong><br/>
          <span style="color: ${markerColor};">${report.status}</span><br/>
          ${report.description ? `<p style="margin: 8px 0; font-size: 14px;">${report.description}</p>` : ''}
          <small>by ${report.user.display_name}</small>
        </div>
      `);
    });

    // Fit map to show all markers
    if (reports.length > 0) {
      const bounds = L.latLngBounds(reports.map(r => [r.lat, r.lng]));
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }

    // Cleanup on unmount or when reports change
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [selectedNeighborhood, reports]);

  const fetchBlockIdAndReports = async (slug: string) => {
    setLoading(true);
    try {
      // First, get the block ID from the database
      const { data: blockData, error: blockError } = await supabase
        .from("blocks")
        .select("id")
        .eq("slug", slug)
        .single();

      if (blockError) {
        console.error("Block not found in database:", blockError);
        setReports([]);
        return;
      }


      // Fetch reports for this block
      const { data: reportsData, error: reportsError } = await supabase
        .from("reports")
        .select(`
          id,
          type,
          ai_metadata,
          description,
          status,
          created_at,
          created_by,
          lat,
          lng,
          photo_url,
          user:users!reports_created_by_fkey(display_name, avatar_url),
          upvotes(id)
        `)
        .eq("block_id", blockData.id)
        .order("created_at", { ascending: false });

      if (reportsError) throw reportsError;

      // Fix nested user array and add upvote count
      const fixedData = (reportsData || []).map((report: any) => {
        const normalizedUser = Array.isArray(report.user) ? report.user[0] : report.user;
        const severity = report.severity ?? report.ai_metadata?.severity ?? "medium";
        return {
          ...report,
          severity,
          user: normalizedUser || { display_name: "Community Member", avatar_url: null },
          upvote_count: Array.isArray(report.upvotes) ? report.upvotes.length : 0,
        };
      });

      setReports(fixedData);
    } catch (error: any) {
      toast.error("Failed to load reports: " + error.message);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const getNeedScoreColor = (score: number): string => {
    if (score <= 30) return "bg-green-500/20 border-green-500/50 hover:bg-green-500/30";
    if (score <= 50) return "bg-yellow-500/20 border-yellow-500/50 hover:bg-yellow-500/30";
    if (score <= 70) return "bg-orange-500/20 border-orange-500/50 hover:bg-orange-500/30";
    return "bg-red-500/20 border-red-500/50 hover:bg-red-500/30";
  };

  const getNeedScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" => {
    if (score <= 30) return "secondary";
    if (score <= 50) return "default";
    return "destructive";
  };

  const getNeedScoreMarkerColor = (score: number): string => {
    if (score <= 30) return "#22c55e"; // green
    if (score <= 50) return "#eab308"; // yellow
    if (score <= 70) return "#f97316"; // orange
    return "#ef4444"; // red
  };

  const createNeedScoreIcon = (score: number): L.DivIcon => {
    const color = getNeedScoreMarkerColor(score);
    return L.divIcon({
      className: "",
      iconSize: [28, 36],
      iconAnchor: [14, 34],
      html: `
        <div style="
          position: relative;
          width: 24px;
          height: 24px;
          margin: 0 auto;
          border-radius: 9999px;
          background: ${color};
          border: 2px solid #ffffff;
          box-shadow: 0 6px 16px rgba(0,0,0,0.25);
        ">
          <span style="
            position: absolute;
            bottom: -9px;
            left: 50%;
            width: 0;
            height: 0;
            border-left: 7px solid transparent;
            border-right: 7px solid transparent;
            border-top: 12px solid ${color};
            transform: translateX(-50%);
          "></span>
        </div>
      `,
    });
  };


  // City overview view
  if (!selectedNeighborhood) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8">
          <div className="mb-6">
            <h1 className="text-4xl font-bold mb-2">Chicago Neighborhoods</h1>
            <p className="text-muted-foreground">
              Click on a neighborhood marker to view detailed reports and map
            </p>
          </div>

          <div className="relative w-full h-[calc(100vh-200px)] rounded-lg overflow-hidden border shadow-lg">
            <div ref={mapContainerRef} className="w-full h-full" />
          </div>

          <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500" />
              <span>Low Need (0-30)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-yellow-500" />
              <span>Moderate (31-50)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-orange-500" />
              <span>High (51-70)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500" />
              <span>Critical (71+)</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Neighborhood detail view
  return (
    <div className="min-h-screen bg-background">
      <div className="container py-4">
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedNeighborhood(null);
              setReports([]);
            }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Chicago Map
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Section */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
            <div>
              <h2 className="text-2xl font-bold">{selectedNeighborhood.name}</h2>
              <p className="text-sm text-muted-foreground">
                {selectedNeighborhood.lat.toFixed(4)}, {selectedNeighborhood.lng.toFixed(4)}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <Badge variant={getNeedScoreBadgeVariant(selectedNeighborhood.needScore)} className="text-lg px-4 py-2">
                Need Score: {selectedNeighborhood.needScore}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/block/${selectedNeighborhood.slug}`)}
              >
                View block page
              </Button>
            </div>
          </div>

                {/* Leaflet Map with Report Markers */}
                <div className="relative w-full h-[400px] rounded-lg overflow-hidden border">
                  <div ref={mapContainerRef} className="w-full h-full" />
                </div>

                {loading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                )}

                {!loading && reports.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">
                      📍 {reports.length} report{reports.length !== 1 ? "s" : ""} in this neighborhood
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Reports List Section */}
          <div className="lg:col-span-1">
            <Card className="h-full">
              <CardContent className="p-4">
                <h3 className="font-bold text-lg mb-4">Reports in {selectedNeighborhood.name}</h3>
                
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : reports.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No reports in this neighborhood yet</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-4 pr-4">
                      {reports.map((report) => (
                        <Card key={report.id} className="border">
                          <CardContent className="p-4">
                            {/* Photo if exists */}
                            {report.photo_url && (
                              <div className="mb-3 rounded-lg overflow-hidden">
                                <img
                                  src={report.photo_url}
                                  alt="Report"
                                  className="w-full h-48 object-cover"
                                />
                              </div>
                            )}

                            {/* Report info */}
                            <div className="space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <Badge variant="outline">{report.type}</Badge>
                                <Badge variant={report.status === "open" ? "default" : "secondary"}>
                                  {report.status}
                                </Badge>
                              </div>

                              {report.description && (
                                <p className="text-sm">{report.description}</p>
                              )}

                              <div className="pt-2 border-t">
                                <p className="text-xs text-muted-foreground">
                                  Reported by {report.user.display_name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                                </p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                  👁️ {report.upvote_count} {report.upvote_count === 1 ? 'person' : 'people'} see this too
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Map2;
