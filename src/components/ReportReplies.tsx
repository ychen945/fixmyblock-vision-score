import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { getAvatarUrl } from "@/lib/utils";
import type { ReportReply } from "@/lib/replies";

interface ReportRepliesProps {
  reportId: string;
  replies: ReportReply[];
  currentUserId: string | null;
  onReplyAdded: (reply: ReportReply) => void;
}

const ReportReplies = ({ reportId, replies, currentUserId, onReplyAdded }: ReportRepliesProps) => {
  const [open, setOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localReplies, setLocalReplies] = useState<ReportReply[]>(replies);

  useEffect(() => {
    setLocalReplies(replies);
  }, [replies]);

  const handleSubmit = async () => {
    if (!currentUserId) {
      toast.error("Please sign in to reply");
      return;
    }

    if (!replyText.trim()) {
      toast.error("Reply cannot be empty");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("report_replies")
        .insert({
          report_id: reportId,
          author_id: currentUserId,
          body: replyText.trim(),
        })
        .select(`
          id,
          body,
          created_at,
          author_id,
          author:users(display_name, avatar_url)
        `)
        .single();

      if (error) throw error;

      const author = Array.isArray(data.author) ? data.author[0] : data.author;
      const newReply: ReportReply = {
        ...data,
        author: author || { display_name: "Community Member", avatar_url: null },
      };

      onReplyAdded(newReply);
      setLocalReplies((prev) => [...prev, newReply]);
      setReplyText("");
      toast.success("Reply posted");
    } catch (err: any) {
      toast.error(err.message || "Failed to post reply");
    } finally {
      setSubmitting(false);
    }
  };

  const replyCount = localReplies.length;
  const replyLabel = `${replyCount} ${replyCount === 1 ? "reply" : "replies"}`;

  return (
    <div className="mt-3 space-y-3">
      <button
        className="text-xs font-medium text-muted-foreground hover:text-foreground transition"
        onClick={() => setOpen((prev) => !prev)}
      >
        💬 {replyLabel} {open ? "▲" : "▼"}
      </button>

      {open && (
        <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
          <div className="space-y-2 max-h-60 overflow-auto pr-1">
            {localReplies.length === 0 ? (
              <p className="text-xs text-muted-foreground">No replies yet.</p>
            ) : (
              localReplies.map((reply) => {
                const avatarSrc = getAvatarUrl(reply.author_id, reply.author.avatar_url);
                return (
                  <div key={reply.id} className="flex gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={avatarSrc} />
                      <AvatarFallback>
                        {reply.author.display_name?.charAt(0).toUpperCase() ?? "C"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold">{reply.author.display_name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">{reply.body}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="space-y-2">
            <Textarea
              placeholder={currentUserId ? "Add a reply…" : "Sign in to reply"}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              disabled={!currentUserId || submitting}
              rows={2}
            />
            <Button
              size="sm"
              className="ml-auto"
              onClick={handleSubmit}
              disabled={!currentUserId || submitting}
            >
              Post reply
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportReplies;
