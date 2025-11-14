export interface ReportReply {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  report_id: string;
  author: {
    display_name: string;
    avatar_url: string | null;
  };
}

export type SupabaseReportReply = Omit<ReportReply, "author"> & {
  author: ReportReply["author"] | ReportReply["author"][] | null;
};

export const normalizeReplies = (data: SupabaseReportReply[] | null): ReportReply[] => {
  if (!data) return [];
  return data.map((reply) => {
    const normalizedAuthor = Array.isArray(reply.author) ? reply.author[0] : reply.author;
    return {
      ...reply,
      author: normalizedAuthor || { display_name: "Community Member", avatar_url: null },
    };
  });
};
