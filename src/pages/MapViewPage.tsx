import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from "react-leaflet";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

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

// Chicago neighborhoods with approximate center coordinates
const NEIGHBORHOOD_CENTERS: Record<string, { lat: number; lng: number }> = {
  "loop": { lat: 41.8830, lng: -87.6320 },
  "river-north": { lat: 41.8940, lng: -87.6319 },
  "lincoln-park": { lat: 41.9150, lng: -87.6450 },
  "wicker-park": { lat: 41.9125, lng: -87.6775 },
  "logan-square": { lat: 41.9275, lng: -87.6950 },
  "pilsen": { lat: 41.8550, lng: -87.6650 },
  "bridgeport": { lat: 41.8400, lng: -87.6475 },
  "hyde-park": { lat: 41.7950, lng: -87.5975 },
  "south-loop": { lat: 41.8650, lng: -87.6299 },
  "west-loop": { lat: 41.8825, lng: -87.6524 },
  "gold-coast": { lat: 41.9025, lng: -87.6275 },
  "old-town": { lat: 41.9125, lng: -87.6375 },
  "lakeview": { lat: 41.9425, lng: -87.6500 },
  "andersonville": { lat: 41.9825, lng: -87.6625 },
  "uptown": { lat: 41.9675, lng: -87.6575 },
};

const CHICAGO_CENTER: [number, number] = [41.8781, -87.6298];

// Helper component to change map view
function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
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
      toast.error("Failed to load blocks: " + error.message);
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

  const getCircleColor = (needScore: number): string => {
    if (needScore <= 30) return "#10b981"; // green
    if (needScore <= 70) return "#f59e0b"; // yellow/orange
    return "#ef4444"; // red
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

  const mapCenter: [number, number] = selectedBlock && NEIGHBORHOOD_CENTERS[selectedBlock.slug]
    ? [NEIGHBORHOOD_CENTERS[selectedBlock.slug].lat, NEIGHBORHOOD_CENTERS[selectedBlock.slug].lng]
    : CHICAGO_CENTER;
  
  const mapZoom = selectedBlock ? 14 : 11;

  return (
    <div className="relative h-screen w-full">
      {/* Map Legend */}
      <Card className="absolute top-4 right-4 z-[1000] shadow-lg">
        <CardContent className="p-3">
          <div className="text-sm font-semibold mb-2">Community Need</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500" />
              <span>Low (0-30)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-yellow-500" />
              <span>Medium (31-70)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500" />
              <span>High (71+)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Back button when viewing neighborhood detail */}
      {selectedBlock && (
        <Card className="absolute top-4 left-4 z-[1000] shadow-lg">
          <CardContent className="p-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToCity}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to City View
            </Button>
            <div className="mt-2 font-semibold">{selectedBlock.name}</div>
            <div className="text-sm text-muted-foreground">
              {reports.length} {reports.length === 1 ? "issue" : "issues"}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leaflet Map */}
      <MapContainer
        center={CHICAGO_CENTER}
        zoom={11}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <ChangeView center={mapCenter} zoom={mapZoom} />
        
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* LEVEL 1: City View - Show neighborhood circles */}
        {!selectedBlock && blocks.map((block) => {
          const center = NEIGHBORHOOD_CENTERS[block.slug];
          if (!center) return null;

          return (
            <Circle
              key={block.id}
              center={[center.lat, center.lng]}
              radius={800}
              pathOptions={{
                fillColor: getCircleColor(block.need_score),
                fillOpacity: 0.5,
                color: getCircleColor(block.need_score),
                weight: 2,
              }}
              eventHandlers={{
                click: () => setSelectedBlock(block),
              }}
            >
              <Popup>
                <div className="min-w-[180px]">
                  <h3 className="font-semibold mb-1">{block.name}</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Community Need Score: {block.need_score}
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setSelectedBlock(block)}
                    className="w-full"
                  >
                    View issues here
                  </Button>
                </div>
              </Popup>
            </Circle>
          );
        })}

        {/* LEVEL 2: Neighborhood Detail - Show individual report pins */}
        {selectedBlock && reports.map((report) => (
          <Marker key={report.id} position={[report.lat, report.lng]}>
            <Popup>
              <div className="min-w-[200px]">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">{report.type.replace("_", " ")}</Badge>
                  <Badge variant={report.status === "open" ? "destructive" : "default"}>
                    {report.status}
                  </Badge>
                </div>
                <p className="text-sm font-medium mb-1">
                  {report.description || "No description"}
                </p>
                <p className="text-xs text-muted-foreground mb-1">
                  Reported by {report.user?.display_name || "Anonymous"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapViewPage;
