import { useState } from "react";
import Map, { Marker, Popup } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

// You'll need to add your Mapbox token as a secret
const MAPBOX_TOKEN = "pk.eyJ1IjoibG92YWJsZS1kZW1vIiwiYSI6ImNsdjh5cHF5czBiZ3Iya3BqMnEzNnFrdWcifQ.VIdDqH6LnLxKeyuNs3hWHg";

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
      return "#ef4444";
    case "broken_light":
      return "#f59e0b";
    case "trash":
      return "#84cc16";
    case "flooding":
      return "#3b82f6";
    case "other":
      return "#8b5cf6";
    default:
      return "#6b7280";
  }
};

const MapView = ({ reports }: MapViewProps) => {
  const navigate = useNavigate();
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  return (
    <div className="h-full w-full">
      <Map
        longitude={-73.985}
        latitude={40.758}
        zoom={13}
        width="100%"
        height="100%"
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxApiAccessToken={MAPBOX_TOKEN}
      >
        {reports.map((report) => (
          <Marker
            key={report.id}
            longitude={report.lng}
            latitude={report.lat}
          >
            <div
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedReport(report);
              }}
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                backgroundColor: getMarkerColor(report.type),
                border: "2px solid white",
                boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
              }}
            />
          </Marker>
        ))}

        {selectedReport && (
          <Popup
            longitude={selectedReport.lng}
            latitude={selectedReport.lat}
            onClose={() => setSelectedReport(null)}
            closeButton={true}
            closeOnClick={false}
          >
            <div className="p-2 min-w-[200px]">
              <div className="flex items-center gap-2 mb-2">
                <Badge>{selectedReport.type.replace("_", " ")}</Badge>
                <Badge variant={selectedReport.status === "open" ? "destructive" : "secondary"}>
                  {selectedReport.status}
                </Badge>
              </div>
              <p className="text-sm font-medium mb-1">
                {selectedReport.block?.name || "Unknown location"}
              </p>
              <p className="text-sm text-muted-foreground mb-2">
                {selectedReport.description || "No description"}
              </p>
              <p className="text-xs text-muted-foreground mb-2">
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
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
};

export default MapView;
