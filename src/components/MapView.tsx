import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Fix for default marker icon in react-leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

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
      return "#dc2626"; // red
    case "broken_light":
      return "#f59e0b"; // amber
    case "trash":
      return "#10b981"; // green
    case "flooding":
      return "#3b82f6"; // blue
    case "other":
      return "#6b7280"; // gray
    default:
      return "#6b7280";
  }
};

const createCustomIcon = (type: string) => {
  const color = getMarkerColor(type);
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background-color: ${color};
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const MapView = ({ reports }: MapViewProps) => {
  const navigate = useNavigate();

  // Center on Chicago
  const chicagoCenter: [number, number] = [41.8781, -87.6298];

  return (
    <div className="h-full w-full relative rounded-lg overflow-hidden border border-border">
      <MapContainer
        center={chicagoCenter}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {reports.map((report) => (
          <Marker
            key={report.id}
            position={[report.lat, report.lng]}
            icon={createCustomIcon(report.type)}
          >
            <Popup>
              <div className="min-w-[200px]">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">{report.type.replace("_", " ")}</Badge>
                  <Badge variant={report.status === "open" ? "destructive" : "default"}>
                    {report.status}
                  </Badge>
                </div>
                <p className="text-sm font-medium mb-1">
                  {report.block?.name || "Unknown location"}
                </p>
                <p className="text-sm text-muted-foreground mb-2">
                  {report.description || "No description"}
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  👍 {report.upvote_count} {report.upvote_count === 1 ? "person" : "people"} see this
                </p>
                {report.block && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate(`/block/${report.block!.slug}`)}
                  >
                    View this block
                  </Button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapView;
