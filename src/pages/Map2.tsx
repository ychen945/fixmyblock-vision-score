import { useState, useEffect, useRef } from "react";
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

// Chicago neighborhoods with centroid coordinates
const CHICAGO_NEIGHBORHOODS = [
  { slug: "loop", name: "Loop", lat: 41.8781, lng: -87.6298, need_score: 45 },
  { slug: "river-north", name: "River North", lat: 41.8906, lng: -87.6336, need_score: 32 },
  { slug: "lincoln-park", name: "Lincoln Park", lat: 41.9217, lng: -87.6489, need_score: 28 },
  { slug: "wicker-park", name: "Wicker Park", lat: 41.9096, lng: -87.6773, need_score: 38 },
  { slug: "logan-square", name: "Logan Square", lat: 41.9289, lng: -87.7054, need_score: 52 },
  { slug: "bucktown", name: "Bucktown", lat: 41.9196, lng: -87.6810, need_score: 35 },
  { slug: "pilsen", name: "Pilsen", lat: 41.8564, lng: -87.6598, need_score: 68 },
  { slug: "hyde-park", name: "Hyde Park", lat: 41.7943, lng: -87.5907, need_score: 41 },
  { slug: "wrigleyville", name: "Wrigleyville", lat: 41.9484, lng: -87.6553, need_score: 29 },
  { slug: "gold-coast", name: "Gold Coast", lat: 41.9029, lng: -87.6278, need_score: 22 },
  { slug: "south-loop", name: "South Loop", lat: 41.8686, lng: -87.6270, need_score: 48 },
  { slug: "west-loop", name: "West Loop", lat: 41.8825, lng: -87.6470, need_score: 36 },
  { slug: "bronzeville", name: "Bronzeville", lat: 41.8184, lng: -87.6159, need_score: 71 },
  { slug: "uptown", name: "Uptown", lat: 41.9658, lng: -87.6564, need_score: 55 },
  { slug: "andersonville", name: "Andersonville", lat: 41.9797, lng: -87.6686, need_score: 31 },
  { slug: "old-town", name: "Old Town", lat: 41.9120, lng: -87.6348, need_score: 26 },
  { slug: "streeterville", name: "Streeterville", lat: 41.8920, lng: -87.6198, need_score: 24 },
  { slug: "chinatown", name: "Chinatown", lat: 41.8528, lng: -87.6325, need_score: 58 },
];

interface Report {
  id: string;
  type: string;
  description: string | null;
  status: string;
  created_at: string;
  lat: number;
  lng: number;
  photo_url: string;
  user: {
    display_name: string;
    avatar_url: string | null;
  };
}

interface Neighborhood {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  need_score: number;
}

const Map2 = () => {
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<Neighborhood | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [blockId, setBlockId] = useState<string | null>(null);
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

    // Prepare heatmap data: [lat, lng, intensity (need_score normalized)]
    const heatData = CHICAGO_NEIGHBORHOODS.map((n) => [
      n.lat,
      n.lng,
      n.need_score / 100, // Normalize to 0-1 range
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
      const marker = L.circleMarker([neighborhood.lat, neighborhood.lng], {
        radius: 8,
        fillColor: getNeedScoreMarkerColor(neighborhood.need_score),
        color: "#fff",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
      }).addTo(mapRef.current!);

      marker.bindPopup(`
        <div style="text-align: center;">
          <strong>${neighborhood.name}</strong><br/>
          Need Score: ${neighborhood.need_score}
        </div>
      `);

      marker.on("click", () => {
        setSelectedNeighborhood(neighborhood);
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
        setBlockId(null);
        return;
      }

      setBlockId(blockData.id);

      // Fetch reports for this block
      const { data: reportsData, error: reportsError } = await supabase
        .from("reports")
        .select(`
          id,
          type,
          description,
          status,
          created_at,
          lat,
          lng,
          photo_url,
          user:users!reports_created_by_fkey(display_name, avatar_url)
        `)
        .eq("block_id", blockData.id)
        .order("created_at", { ascending: false });

      if (reportsError) throw reportsError;

      // Fix nested user array
      const fixedData = (reportsData || []).map((report: any) => ({
        ...report,
        user: Array.isArray(report.user) ? report.user[0] : report.user,
      }));

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

  const getGoogleMapsEmbedUrl = (lat: number, lng: number) => {
    return `https://www.google.com/maps/embed/v1/view?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&center=${lat},${lng}&zoom=14&maptype=roadmap`;
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
              setBlockId(null);
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
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold">{selectedNeighborhood.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {selectedNeighborhood.lat.toFixed(4)}, {selectedNeighborhood.lng.toFixed(4)}
                    </p>
                  </div>
                  <Badge variant={getNeedScoreBadgeVariant(selectedNeighborhood.need_score)} className="text-lg px-4 py-2">
                    Need Score: {selectedNeighborhood.need_score}
                  </Badge>
                </div>

                {/* Google Maps Embed */}
                <div className="relative w-full h-[400px] rounded-lg overflow-hidden border">
                  <iframe
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    src={getGoogleMapsEmbedUrl(selectedNeighborhood.lat, selectedNeighborhood.lng)}
                  />
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
                                <p className="text-xs text-muted-foreground font-mono mt-1">
                                  📍 {report.lat.toFixed(4)}, {report.lng.toFixed(4)}
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
