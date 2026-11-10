import type { RhythmSegment, TieRole } from "../types";

export type TieIssue = Readonly<{
  code:
    | "REST_TIE"
    | "TIE_TOO_SHORT"
    | "TIE_NONCONTIGUOUS"
    | "TIE_CONTINUATION_ACCENT";
  index: number;
  message: string;
}>;

export function inspectTies(segments: readonly RhythmSegment[]) {
  const groups = new Map<string, number[]>();
  const issues: TieIssue[] = [];
  segments.forEach((segment, index) => {
    if (segment.tieGroupId === undefined) return;
    if (segment.kind !== "note") {
      issues.push({
        code: "REST_TIE",
        index,
        message: "A rest cannot belong to a tie group",
      });
      return;
    }
    const members = groups.get(segment.tieGroupId) ?? [];
    members.push(index);
    groups.set(segment.tieGroupId, members);
  });
  for (const [id, indices] of groups) {
    if (indices.length < 2) {
      issues.push({
        code: "TIE_TOO_SHORT",
        index: indices[0],
        message: `Tie ${id} requires at least two note segments`,
      });
    }
    indices.forEach((index, member) => {
      if (member === 0) return;
      if (index !== indices[member - 1] + 1) {
        issues.push({
          code: "TIE_NONCONTIGUOUS",
          index,
          message: `Tie ${id} cannot skip intervening segments or reuse a noncontiguous group`,
        });
      }
      if (segments[index].accent === "strong") {
        issues.push({
          code: "TIE_CONTINUATION_ACCENT",
          index,
          message: "A continuation cannot request a new accented attack",
        });
      }
    });
  }
  return { groups, issues };
}

export function deriveTieRoles(
  segments: readonly RhythmSegment[]
): ReadonlyMap<string, TieRole> {
  const { groups, issues } = inspectTies(segments);
  if (issues.length > 0)
    throw new RangeError(issues.map(issue => issue.message).join("; "));
  const roles = new Map<string, TieRole>();
  for (const segment of segments) roles.set(segment.id, "none");
  for (const indices of groups.values()) {
    indices.forEach((index, member) => {
      roles.set(
        segments[index].id,
        member === 0
          ? "start"
          : member === indices.length - 1
            ? "end"
            : "continue"
      );
    });
  }
  return roles;
}
