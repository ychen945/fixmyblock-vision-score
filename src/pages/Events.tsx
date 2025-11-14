import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Leaf, Recycle, ShieldCheck, Users, MapPin } from "lucide-react";

type CivicEvent = {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  category: "clean_up" | "food" | "animals" | "recycling";
  neighbors: number;
  image: string;
};

const categoryMap: Record<CivicEvent["category"], { label: string; icon: JSX.Element; tone: string }> = {
  clean_up: {
    label: "Clean-up Drive",
    icon: <Leaf className="h-4 w-4" />,
    tone: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  food: {
    label: "Food Distribution",
    icon: <ShieldCheck className="h-4 w-4" />,
    tone: "bg-orange-50 text-orange-700 border-orange-100",
  },
  animals: {
    label: "Shelter & Animals",
    icon: <CalendarDays className="h-4 w-4" />,
    tone: "bg-amber-50 text-amber-700 border-amber-100",
  },
  recycling: {
    label: "Recycling & Trash",
    icon: <Recycle className="h-4 w-4" />,
    tone: "bg-sky-50 text-sky-700 border-sky-100",
  },
};

const Events = () => {
  const events = useMemo<CivicEvent[]>(
    () => [
      {
        id: "cleanup-1",
        title: "Logan Square Alley Refresh",
        description: "Neighbors are sweeping, repainting, and replanting along the Milwaukee Ave corridor.",
        date: "Sat, Nov 16 • 10:00 AM",
        location: "2600 N Milwaukee Ave",
        category: "clean_up",
        neighbors: 42,
        image: "https://static-assets.justserve.org/images/2f4bd6ce-587f-4b8a-aa5f-029205d3c33f.png",
      },
      {
        id: "food-1",
        title: "West Loop Food Distribution",
        description: "Packing pantry staples and fresh produce for senior residents along Madison Street.",
        date: "Tue, Nov 19 • 6:30 PM",
        location: "Merit School of Music, 38 S Peoria",
        category: "food",
        neighbors: 35,
        image: "https://images.squarespace-cdn.com/content/v1/615200c5c4aebd4533e8aec5/61e8b3ce-5b52-4f14-bc5e-6d39a7c143d0/OLR+Food+5+021825.jpg",
      },
      {
        id: "animals-1",
        title: "Shelter Animals Field Day",
        description: "Socialize, walk, and photograph adoptable pets from City Paws Rescue.",
        date: "Sun, Nov 24 • 12:00 PM",
        location: "Harrison Park, Pilsen",
        category: "animals",
        neighbors: 31,
        image: "https://images.unsplash.com/photo-1507146426996-ef05306b995a?auto=format&fit=crop&w=800&q=60",
      },
      {
        id: "recycling-1",
        title: "Bronzeville Bulk Trash Blitz",
        description: "Help sort recyclables and flag large-item pickups on King Drive.",
        date: "Sat, Dec 14 • 9:00 AM",
        location: "43rd & King Drive",
        category: "recycling",
        neighbors: 24,
        image: "https://media.greenmatters.com/brand-img/YwKiQ2tfV/0x0/trashtag-clean-up-litter-1552318521531.jpg",
      },
    ],
    [],
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-5xl mx-auto px-4 py-10 space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Civic Events</h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Inspired by BetterBlock reports.
            </p>
          </div>
          <Button variant="default" size="lg" className="w-full sm:w-auto rounded-full">
            + Host an Event
          </Button>
        </div>
        <div className="grid gap-6 md:grid-cols-2 pb-10">
          {events.map((event) => {
            const category = categoryMap[event.category];
            return (
              <Card key={event.id} className="overflow-hidden border-muted">
                <div className="h-44 w-full bg-muted">
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <Badge
                      variant="secondary"
                      className={`border ${category.tone} gap-2`}
                    >
                      {category.icon}
                      {category.label}
                    </Badge>
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      {event.neighbors} neighbors joined
                    </span>
                  </div>
                  <CardTitle className="text-2xl">{event.title}</CardTitle>
                  <CardDescription className="text-base text-muted-foreground">
                    {event.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <CalendarDays className="h-4 w-4" />
                    <span>{event.date}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{event.location}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Validated host • tools provided</span>
                  </div>
                  <Button variant="outline" className="w-full" disabled>
                    RSVP coming soon
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Events;
