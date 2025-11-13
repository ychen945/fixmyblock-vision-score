import { Card, CardContent } from "@/components/ui/card";

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

const MapView = ({ reports }: MapViewProps) => {
  return (
    <Card className="h-full w-full">
      <CardContent className="flex items-center justify-center h-full p-8">
        <div className="text-center space-y-4">
          <div className="text-6xl">🗺️</div>
          <h3 className="text-xl font-semibold">Map View Placeholder</h3>
          <p className="text-muted-foreground">
            For demo purposes, imagine pins showing {reports.length} reports here
          </p>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>📍 Chicago area</p>
            <p>🔴 Potholes • 💡 Broken lights • 🗑️ Trash</p>
            <p>💧 Flooding • ⚪ Other issues</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MapView;
