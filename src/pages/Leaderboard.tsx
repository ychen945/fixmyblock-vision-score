import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, ArrowLeft, Medal, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Block {
  id: string;
  name: string;
  slug: string;
  need_score: number;
}

interface Contributor {
  id: string;
  display_name: string;
  avatar_url: string | null;
  contribution_score: number;
  reports_count: number;
  upvotes_received: number;
}

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
      // Fetch blocks leaderboard
      const { data: blocksData, error: blocksError } = await supabase
        .from("blocks")
        .select("id, name, slug, need_score")
        .order("need_score", { ascending: false })
        .limit(50);

      if (blocksError) throw blocksError;
      setBlocks(blocksData || []);

      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, display_name, avatar_url, contribution_score")
        .order("contribution_score", { ascending: false })
        .limit(50);

      if (usersError) throw usersError;

      // For each user, get their reports count and total upvotes received
      const contributorsWithStats = await Promise.all(
        (usersData || []).map(async (user) => {
          // Get reports count
          const { count: reportsCount } = await supabase
            .from("reports")
            .select("*", { count: "exact", head: true })
            .eq("created_by", user.id);

          // Get all report IDs for this user
          const { data: userReports } = await supabase
            .from("reports")
            .select("id")
            .eq("created_by", user.id);

          // Get total upvotes on all their reports
          let upvotesReceived = 0;
          if (userReports && userReports.length > 0) {
            const reportIds = userReports.map(r => r.id);
            const { count: upvotesCount } = await supabase
              .from("upvotes")
              .select("*", { count: "exact", head: true })
              .in("report_id", reportIds);
            
            upvotesReceived = upvotesCount || 0;
          }

          return {
            ...user,
            reports_count: reportsCount || 0,
            upvotes_received: upvotesReceived,
          };
        })
      );

      setContributors(contributorsWithStats);
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

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-muted-foreground font-semibold">{rank}</span>;
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
            Top blocks and contributors making a difference
          </p>
        </div>

        <Tabs defaultValue="blocks" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="blocks">Blocks</TabsTrigger>
            <TabsTrigger value="contributors">Contributors</TabsTrigger>
          </TabsList>

          {/* Blocks Leaderboard */}
          <TabsContent value="blocks">
            <Card>
              <CardHeader>
                <CardTitle>Blocks by Need Score</CardTitle>
                <CardDescription>
                  Blocks with the highest need for community attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                {blocks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No blocks found
                  </div>
                ) : (
                  <div className="space-y-3">
                    {blocks.map((block, index) => (
                      <div
                        key={block.id}
                        className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center justify-center w-10 h-10">
                          {getRankIcon(index + 1)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg truncate">
                            {block.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary">
                              Need Score: {block.need_score}
                            </Badge>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/block/${block.slug}`)}
                        >
                          View Block
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
                  Community members making the biggest impact
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
                        className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center justify-center w-10 h-10">
                          {getRankIcon(index + 1)}
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
                          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                            <span>{contributor.reports_count} reports</span>
                            <span>•</span>
                            <span>{contributor.upvotes_received} upvotes received</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">
                            {contributor.contribution_score}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            score
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
