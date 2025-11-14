import { describe, expect, it } from "vitest";
import { normalizeFeedReports, type SupabaseFeedReport } from "@/lib/feed";
import { calculateBlockStats, type BlockReport } from "@/lib/block";
import { getNeedLevel } from "@/lib/leaderboard";

// Home feed normalization
describe("normalizeFeedReports", () => {
  it("fills missing users with a community member placeholder", () => {
    const reports = normalizeFeedReports([
      {
        id: "1",
        type: "pothole",
        description: null,
        status: "open",
        created_at: new Date().toISOString(),
        lat: 0,
        lng: 0,
        created_by: "user",
        block_id: null,
        photo_url: "photo",
        user: null,
        block: null,
        upvotes: [],
        verifications: [],
      } as SupabaseFeedReport,
    ]);

    expect(reports[0].user.display_name).toBe("Community Member");
    expect(reports[0].user.avatar_url).toBeNull();
  });

  it("unwraps array-based user relations returned by Supabase", () => {
    const reports = normalizeFeedReports([
      {
        id: "2",
        type: "trash",
        description: null,
        status: "open",
        created_at: new Date().toISOString(),
        lat: 0,
        lng: 0,
        created_by: "user",
        block_id: null,
        photo_url: "photo",
        user: [{ display_name: "Asha", avatar_url: "avatar" }],
        block: null,
        upvotes: [],
        verifications: [],
      } as SupabaseFeedReport,
    ]);

    expect(reports[0].user.display_name).toBe("Asha");
    expect(reports[0].user.avatar_url).toBe("avatar");
  });
});

// Block stats helper
const buildReport = (overrides: Partial<BlockReport>): BlockReport => ({
  id: Math.random().toString(),
  type: "pothole",
  created_by: "user",
  description: null,
  status: "open",
  created_at: new Date().toISOString(),
  resolved_at: null,
  resolved_note: null,
  photo_url: "photo",
  lat: 0,
  lng: 0,
  user: { display_name: "Test", avatar_url: null },
  upvotes: [],
  verifications: [],
  replies: [],
  ...overrides,
});

describe("calculateBlockStats", () => {
  it("derives mean resolution time and counts", () => {
    const createdAt = new Date("2025-01-01T00:00:00Z");
    const resolvedAt = new Date(createdAt.getTime() + 48 * 60 * 60 * 1000);

    const reports: BlockReport[] = [
      buildReport({ status: "open" }),
      buildReport({
        status: "resolved",
        created_at: createdAt.toISOString(),
        resolved_at: resolvedAt.toISOString(),
      }),
    ];

    const stats = calculateBlockStats(reports);

    expect(stats.openIssues).toBe(1);
    expect(stats.resolvedIssues).toBe(1);
    expect(stats.meanResolutionTime).toMatch(/days|hrs/);
  });

  it("handles empty data", () => {
    const stats = calculateBlockStats([]);
    expect(stats).toEqual({
      openIssues: 0,
      resolvedIssues: 0,
      meanResolutionTime: null,
      recentReports: 0,
    });
  });
});

// Leaderboard copy helper
describe("getNeedLevel", () => {
  it("returns critical level for high scores", () => {
    const level = getNeedLevel(80);
    expect(level.label).toMatch(/Critical/i);
    expect(level.badge).toBe("destructive");
  });

  it("returns rising concern for medium scores", () => {
    const level = getNeedLevel(55);
    expect(level.label).toMatch(/Rising/i);
    expect(level.badge).toBe("default");
  });

  it("returns healthy momentum for low scores", () => {
    const level = getNeedLevel(20);
    expect(level.label).toMatch(/Healthy/i);
    expect(level.badge).toBe("secondary");
  });
});
