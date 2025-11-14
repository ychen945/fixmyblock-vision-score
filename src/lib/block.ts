import { differenceInDays } from "date-fns";
import type { ReportReply, SupabaseReportReply } from "@/lib/replies";

export interface BlockReport {
  id: string;
  type: string;
  severity?: "low" | "medium" | "high";
  description: string | null;
  status: string;
  created_at: string;
  created_by: string;
  resolved_at: string | null;
  resolved_note: string | null;
  photo_url: string;
  lat: number;
  lng: number;
  user: {
    display_name: string;
    avatar_url: string | null;
  };
  upvotes: { user_id: string }[];
  verifications: { user_id: string }[];
  replies: ReportReply[];
}

export type SupabaseBlockReport = Omit<BlockReport, "user" | "upvotes" | "verifications" | "replies"> & {
  user: BlockReport["user"] | BlockReport["user"][] | null;
  upvotes: { user_id: string }[] | null;
  verifications: { user_id: string }[] | null;
  replies: SupabaseReportReply[] | null;
  ai_metadata?: {
    severity?: "low" | "medium" | "high";
    [key: string]: unknown;
  } | null;
};

export interface BlockStats {
  openIssues: number;
  resolvedIssues: number;
  meanResolutionTime: string | null;
  recentReports: number;
}

export const calculateBlockStats = (reports: BlockReport[]): BlockStats => {
  const openIssues = reports.filter((r) => r.status === "open").length;
  const resolvedReports = reports.filter((r) => r.status === "resolved" && r.resolved_at);
  const resolvedIssues = resolvedReports.length;

  const resolutionDurations = resolvedReports.map((report) => {
    const resolvedAt = new Date(report.resolved_at!);
    const createdAt = new Date(report.created_at);
    return Math.max(0, resolvedAt.getTime() - createdAt.getTime());
  });

  const meanResolutionTime = resolutionDurations.length
    ? formatMeanTime(resolutionDurations.reduce((sum, duration) => sum + duration, 0) / resolutionDurations.length)
    : null;

  const recentReports = reports.filter((report) => {
    return differenceInDays(new Date(), new Date(report.created_at)) <= 30;
  }).length;

  return {
    openIssues,
    resolvedIssues,
    meanResolutionTime,
    recentReports,
  };
};

const formatMeanTime = (ms: number): string => {
  const hours = ms / (1000 * 60 * 60);
  if (hours >= 24) {
    const days = hours / 24;
    return `${days.toFixed(1)} days`;
  }
  return `${hours.toFixed(1)} hrs`;
};
