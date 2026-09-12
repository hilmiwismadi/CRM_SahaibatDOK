import { redirect } from "next/navigation";

// /reports/kanban was split into /reports/kanban/overview (the live board)
// and /reports/kanban/daily (the Per Tanggal/Per Minggu history) so each
// could get its own URL instead of client-side tab state — see the
// 2026-09-12 chat that asked for this split. Old bookmarks/links still
// land somewhere useful instead of 404ing.
export default function KanbanRedirect() {
  redirect("/reports/kanban/overview");
}
