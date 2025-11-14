import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getNeedLevel } from "@/lib/leaderboard";

interface Block {
  id: string;
  name: string;
  slug: string;
  need_score: number;
  report_count?: number;
}

type SupabaseBlock = Block & {
  reports?: { count: number }[];
};

interface Contributor {
  id: string;
  display_name: string;
  avatar_url: string | null;
  contribution_score: number;
  reports_count: number;
  upvotes_received: number;
}

const DUMMY_CONTRIBUTORS: Contributor[] = [
  { id: "demo-1", display_name: "Marisol P.", avatar_url: "https://i.pravatar.cc/100?img=12", contribution_score: 320, reports_count: 42, upvotes_received: 188 },
  { id: "demo-2", display_name: "Chris J.", avatar_url: "https://i.pravatar.cc/100?img=25", contribution_score: 255, reports_count: 33, upvotes_received: 147 },
  { id: "demo-3", display_name: "Neha R.", avatar_url: "https://i.pravatar.cc/100?img=32", contribution_score: 210, reports_count: 28, upvotes_received: 120 },
  { id: "demo-4", display_name: "Quincy A.", avatar_url: "https://i.pravatar.cc/100?img=45", contribution_score: 195, reports_count: 26, upvotes_received: 105 },
  { id: "demo-5", display_name: "Drew K.", avatar_url: "https://i.pravatar.cc/100?img=5", contribution_score: 182, reports_count: 24, upvotes_received: 98 },
  { id: "demo-6", display_name: "Priya S.", avatar_url: "https://i.pravatar.cc/100?img=56", contribution_score: 168, reports_count: 22, upvotes_received: 90 },
  { id: "demo-7", display_name: "Leo M.", avatar_url: "https://i.pravatar.cc/100?img=60", contribution_score: 152, reports_count: 20, upvotes_received: 84 },
  { id: "demo-8", display_name: "Zara B.", avatar_url: "https://i.pravatar.cc/100?img=68", contribution_score: 139, reports_count: 18, upvotes_received: 75 },
  { id: "demo-9", display_name: "Hector C.", avatar_url: "https://i.pravatar.cc/100?img=72", contribution_score: 125, reports_count: 16, upvotes_received: 66 },
  { id: "demo-10", display_name: "Ivy T.", avatar_url: "https://i.pravatar.cc/100?img=80", contribution_score: 112, reports_count: 14, upvotes_received: 58 },
];

const Leaderboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [contributors, setContributors] = useState<Contributor[]>([]);

  useEffect(() => {
    loadLeaderboards();
  }, []);

  const loadLeaderboards = async () => {
    try {
      // Fetch blocks with their report counts
      const { data: blocksData, error: blocksError } = await supabase
        .from("blocks")
        .select(`
          id,
          name,
          slug,
          need_score,
          reports:reports(count)
        `)
        .order("need_score", { ascending: false });

      if (blocksError) throw blocksError;
      const normalizedBlocks = ((blocksData as SupabaseBlock[] | null) ?? []).map((block) => ({
        ...block,
        report_count: block.reports?.[0]?.count || 0,
      }));
      setBlocks(normalizedBlocks);

      // Use static contributor leaderboard data
      const sortedContributors = [...DUMMY_CONTRIBUTORS].sort(
        (a, b) => b.contribution_score - a.contribution_score,
      );
      setContributors(sortedContributors);
    } catch (error: any) {
      console.error("Error loading leaderboards:", error);
      toast({
        title: "Error",
        description: "Failed to load leaderboards",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">

      <div className="container max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2">Leaderboard</h1>
          <p className="text-muted-foreground">
            Rally around neighborhoods that need help and celebrate resident impact
          </p>
        </div>

        <Tabs defaultValue="contributors" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="contributors">Contributors</TabsTrigger>
            <TabsTrigger value="blocks">Blocks</TabsTrigger>
          </TabsList>

          {/* Blocks Leaderboard */}
          <TabsContent value="blocks">
            <Card>
              <CardHeader>
                <CardTitle>Neighborhoods Needing Attention</CardTitle>
                <CardDescription>
                  Higher scores signal more unresolved issues. Use this list to focus your next clean up.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {blocks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No blocks found
                  </div>
                ) : (
                  <div className="space-y-3">
                    {blocks.map((block) => (
                      <div
                        key={block.id}
                        className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${getNeedLevel(block.need_score).tone}`}
                      >
                        <div className="flex items-center justify-center w-10 h-10">
                          {getNeedLevel(block.need_score).icon}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg truncate">
                              {block.name}
                            </h3>
                            <Badge variant={getNeedLevel(block.need_score).badge}>
                              Score {block.need_score}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {getNeedLevel(block.need_score).label}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {block.report_count || 0} active {block.report_count === 1 ? "issue" : "issues"}
                          </p>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/block/${block.slug}`)}
                        >
                          Rally this block
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contributors Leaderboard */}
          <TabsContent value="contributors">
            <Card>
              <CardHeader>
                <CardTitle>Top Contributors</CardTitle>
                <CardDescription>
                  Neighbors across FixMyBlock generating the most momentum
                </CardDescription>
              </CardHeader>
              <CardContent>
                {contributors.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No contributors found
                  </div>
                ) : (
                  <div className="space-y-3">
                    {contributors.map((contributor, index) => (
                      <div
                        key={contributor.id}
                        className="flex items-center gap-4 p-4 rounded-lg border bg-card"
                      >
                        <div className="flex items-center justify-center w-10 h-10 text-sm font-semibold text-muted-foreground">
                          #{index + 1}
                        </div>

                        <Avatar className="h-12 w-12">
                          <AvatarImage src={contributor.avatar_url || undefined} />
                          <AvatarFallback>
                            {contributor.display_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg">
                            {contributor.display_name}
                          </h3>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                            <span>{contributor.reports_count} reports filed</span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {contributor.upvotes_received} neighbor verified
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">
                            {contributor.contribution_score}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            impact score
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Leaderboard;
