export interface FeedReport {
  id: string;
  type: string;
  description: string | null;
  status: string;
  created_at: string;
  lat: number;
  lng: number;
  created_by: string;
  block_id: string | null;
  photo_url: string;
  user: {
    display_name: string;
    avatar_url: string | null;
  };
  block: {
    name: string;
    slug: string;
  } | null;
  upvotes: { user_id: string }[];
  verifications: { user_id: string }[];
}

export type SupabaseFeedReport = Omit<FeedReport, "user"> & {
  user: FeedReport["user"] | FeedReport["user"][] | null;
};

export const normalizeFeedReports = (
  data: SupabaseFeedReport[] | null,
): FeedReport[] => {
  if (!data) return [];
  return data.map((report) => {
    const normalizedUser = Array.isArray(report.user) ? report.user[0] : report.user;
    return {
      ...report,
      user: normalizedUser || { display_name: "Community Member", avatar_url: null },
    };
  });
};
