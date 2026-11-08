export type RoadmapReturnPath = "/admin" | "/admin/feedback";

export function getRoadmapReturnPath(value: string | null | undefined): RoadmapReturnPath {
  return value === "/admin/feedback" ? "/admin/feedback" : "/admin";
}
