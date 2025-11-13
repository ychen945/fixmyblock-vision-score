import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";

interface Report {
  id: string;
  lat: number;
  lng: number;
  type: string;
  description: string | null;
  status: string;
  block: {
    name: string;
    slug: string;
  } | null;
  upvote_count: number;
}

interface MapViewProps {
  reports: Report[];
}

const getMarkerColor = (type: string) => {
  switch (type) {
    case "pothole":
      return "hsl(var(--destructive))";
    case "broken_light":
      return "hsl(var(--warning))";
    case "trash":
      return "hsl(var(--success))";
    case "flooding":
      return "hsl(var(--primary))";
    case "other":
      return "hsl(var(--secondary))";
    default:
      return "hsl(var(--muted))";
  }
};

const MapView = ({ reports }: MapViewProps) => {
  const navigate = useNavigate();
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // Normalize coordinates to position on a fixed grid
  // Assuming NYC coordinates roughly: lat 40.7-40.8, lng -74.0 to -73.9
  const normalizePosition = (lat: number, lng: number) => {
    const latMin = 40.7;
    const latMax = 40.8;
    const lngMin = -74.0;
    const lngMax = -73.9;
    
    const x = ((lng - lngMin) / (lngMax - lngMin)) * 100;
    const y = ((latMax - lat) / (latMax - latMin)) * 100;
    
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  };

  return (
    <div className="h-full w-full relative bg-muted/20 rounded-lg overflow-hidden border border-border">
      {/* Map Grid */}
      <div className="absolute inset-0 opacity-10">
        <div className="grid grid-cols-10 grid-rows-10 h-full w-full">
          {Array.from({ length: 100 }).map((_, i) => (
            <div key={i} className="border border-border/30" />
          ))}
        </div>
      </div>

      {/* Markers */}
      {reports.map((report) => {
        const pos = normalizePosition(report.lat, report.lng);
        return (
          <div
            key={report.id}
            className="absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 hover:scale-125 transition-transform z-10"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
            }}
            onClick={() => setSelectedReport(report)}
          >
            <div
              className="w-6 h-6 rounded-full border-2 border-background shadow-lg"
              style={{
                backgroundColor: getMarkerColor(report.type),
              }}
            />
          </div>
        );
      })}

      {/* Popup */}
      {selectedReport && (
        <Card className="absolute bottom-4 left-1/2 transform -translate-x-1/2 p-4 min-w-[280px] shadow-xl z-20">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{selectedReport.type.replace("_", " ")}</Badge>
              <Badge variant={selectedReport.status === "open" ? "destructive" : "default"}>
                {selectedReport.status}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedReport(null)}
              className="h-6 w-6 p-0"
            >
              ✕
            </Button>
          </div>
          <p className="text-sm font-medium mb-1">
            {selectedReport.block?.name || "Unknown location"}
          </p>
          <p className="text-sm text-muted-foreground mb-2">
            {selectedReport.description || "No description"}
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            👍 {selectedReport.upvote_count} {selectedReport.upvote_count === 1 ? "person" : "people"} see this
          </p>
          {selectedReport.block && (
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => navigate(`/block/${selectedReport.block!.slug}`)}
            >
              View this block
            </Button>
          )}
        </Card>
      )}
    </div>
  );
};

export default MapView;
