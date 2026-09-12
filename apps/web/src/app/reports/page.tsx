import { redirect } from "next/navigation";

// /reports moved to /reports/overview once History and Kanban got their
// own sibling routes — see the 2026-09-12 chat that asked for this split.
// Old bookmarks/links still land somewhere useful instead of 404ing.
export default function ReportsRedirect() {
  redirect("/reports/overview");
}
