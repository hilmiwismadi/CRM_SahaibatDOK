import type { Locale } from "./locale";

// Flat key → string per locale, grouped by the page/component that owns
// each key (comments only — keys are still one flat namespace so any
// component can pull any key without knowing which file "owns" it).
// Category/tag labels (Follow Up, Reject, Non-Responsive, etc.) are NOT
// here — those come from leadSegmentation.ts's CATEGORY_LABELS /
// CATEGORY_LABELS_EN, since they're also referenced by classification
// logic and need to stay next to that source of truth.
const dict = {
  id: {
    // Sidebar
    sidebarTagline: "Lead CRM",
    sidebarCollapse: "Collapse",
    sidebarExpandTitle: "Expand sidebar",
    sidebarCollapseTitle: "Collapse sidebar",
    sidebarLanguage: "Bahasa",

    // Chat page
    chatSelectPrompt: "Pilih percakapan untuk mulai chat.",
    chatHideInfo: "Sembunyikan info",
    chatLeadInfo: "Info Lead",
    chatNoPhoneYet: "Nomor kontak ini belum diketahui.",
    chatContactChain: "Rantai Kontak",
    chatMarkReplied: "Tandai Sudah Dibalas",
    chatMarkRepliedByBot: "Dibalas oleh Bot",
    chatMarkUnreplied: "Tandai Belum Dibalas",
    chatRemoveTagPrefix: "Hapus Tandai",
    chatYes: "Ya",
    chatNotYet: "Belum",
    chatAutoNoManual: "Otomatis — tidak bisa ditandai manual.",

    // ConversationList
    convAll: "Semua",
    convUnrepliedSuffix: "belum dibalas",
    convSearchPlaceholder: "Cari nama, nomor, atau isi chat…",
    convLoading: "Memuat percakapan…",
    convNoMatch: (q: string) => `Tidak ada yang cocok dengan "${q}".`,
    convNoConversations: "Belum ada percakapan.",
    convYouPrefix: "Anda: ",
    convMedia: "[media]",
    convNoMessagesYet: "Belum ada pesan",
    convUnknown: "Tidak Dikenal",
    convNeedsReplyTitle: "Belum dibalas — lead sudah reply",
    convUnrepliedBadge: "Belum dibalas",
    convRepliedByBotBadge: "🤖 Dibalas bot",
    convNotLinked: "Belum terhubung ke lead",

    // Reports — shared
    salesReportTitle: "Sales report",
    loading: "Memuat…",
    empty: "Kosong",
    close: "Tutup",

    // Reports overview
    reportsOverviewSubtitle: "Ke mana leads mengalir, dari yang belum disentuh sampai appointment.",
    reportsOverviewHeading: "Segmentasi Leads",
    reportsOverviewDesc1: "“Disentuh” = pernah dihubungi (kirim pesan berhasil/gagal) — bukan sekadar dilihat di dashboard. Angka di sini adalah status ",
    reportsOverviewDescNow: "saat ini",
    reportsOverviewDesc2: " — untuk riwayat kapan sesuatu terjadi, lihat ",
    reportsOverviewHistoryLink: "Kanban → Riwayat",
    totalLead: "Total Lead",
    untouchedLabel: "Belum Disentuh",
    touchedLabel: "Sudah Disentuh",
    onGoingSuffix: "(On Going)",
    seePerLeadKanban: "Lihat per-lead di Kanban board →",

    // Kanban shared
    quickTagFailedGeneric: "Gagal memindahkan lead.",
    quickTagFailedConn: "Gagal memindahkan lead — cek koneksi.",
    quickTagClearSuffix: "(hapus tag)",
    untouchedToTouched: "Belum Disentuh → Disentuh",
    popupNomor: "Nomor",
    popupLastMessage: "Pesan terakhir",
    popupNever: "Belum pernah",
    popupMoveTo: "Pindahkan ke",
    popupOpenChat: "Buka Chat",
    kanbanSubnavBoard: "Board",
    kanbanSubnavHistory: "Riwayat",

    // Kanban overview
    kanbanOverviewDesc:
      "Alur kiri ke kanan: Belum Disentuh → Tidak Ada Kontak WA → (Tidak Reply) → (Reply) → lainnya. Klik kartu untuk lihat ringkasan & pindahkan tag, atau drag ke kolom lain. “Belum Disentuh”, “Belum Dijawab”, “Not-Interested”, dan “Non-Responsive” tidak bisa dipindah manual — itu status otomatis, bukan tag. “Perlu Diklasifikasi” bukan status aman — cek isi chat-nya dan pindahkan ke kategori yang sesuai.",
    replyBranchNoReply: "Tidak Reply",
    replyBranchReply: "Reply",

    // Kanban daily/history
    kanbanDailyDesc1: "Riwayat ",
    kanbanDailyDescEvent: "event",
    kanbanDailyDesc2: " (kapan sesuatu ditandai), satu board per periode — drag kartu untuk menandai ulang lead sekarang juga. Untuk status hari ini, lihat ",
    kanbanDailyOverviewLink: "Overview",
    tabPerDay: "Per Tanggal",
    tabPerWeek: "Per Minggu",
    kanbanDailyFootnote:
      "Semua tag (termasuk kegagalan otomatis “Tidak Ada Kontak WA”) sekarang tercatat waktunya. Untuk kejadian dari sebelum pencatatan ini aktif, tanggalnya adalah perkiraan (dari tanggal lead dibuat), bukan tanggal asli kejadian — jadi jangan dibaca sebagai riwayat harian yang presisi untuk data lama.",
    eventCountSuffix: "event",
    noActivity: "Tidak ada aktivitas",
    notTracked: "Tidak terlacak",
    groupNoReply: "Tidak Reply",
    groupUnanswered: "Belum Dijawab",
    groupNeedsMore: "Perlu Lanjutan",
    groupResolved: "Jawaban Pasti",

    // Reports history
    historySubtitle: "Riwayat aktivitas — kapan lead dikontak, kapan status berubah, dll. Maks. 200 baris terbaru.",
    historyDays7: "7 hari terakhir",
    historyDays30: "30 hari terakhir",
    historyDays90: "90 hari terakhir",
    historyAllTypes: "Semua tipe",
    historyNoActivity: "Tidak ada aktivitas di rentang ini.",
    historyColTime: "Waktu",
    historyColLead: "Lead",
    historyColType: "Tipe",
    historyColDetail: "Detail",
    activityTagMarked: "ditandai",
    activityTagCleared: "dihapus",
    activityRepliedBot: "Ditandai dibalas oleh bot",
    activityRepliedManual: "Ditandai sudah dibalas (manual)",
    activityRepliedCleared: "Tandai sudah dibalas: dihapus",
    activityLeadCreatedManually: "Lead dibuat manual (bukan dari scrape)",
    activityFieldPrefix: "Field",
  },
  en: {
    // Sidebar
    sidebarTagline: "Lead CRM",
    sidebarCollapse: "Collapse",
    sidebarExpandTitle: "Expand sidebar",
    sidebarCollapseTitle: "Collapse sidebar",
    sidebarLanguage: "Language",

    // Chat page
    chatSelectPrompt: "Select a conversation to start chatting.",
    chatHideInfo: "Hide info",
    chatLeadInfo: "Lead info",
    chatNoPhoneYet: "No known phone number for this contact yet.",
    chatContactChain: "Contact chain",
    chatMarkReplied: "Mark as Replied",
    chatMarkRepliedByBot: "Replied by Bot",
    chatMarkUnreplied: "Mark as Unreplied",
    chatRemoveTagPrefix: "Remove",
    chatYes: "Yes",
    chatNotYet: "Not yet",
    chatAutoNoManual: "Automatic — can't be tagged manually.",

    // ConversationList
    convAll: "All",
    convUnrepliedSuffix: "unreplied",
    convSearchPlaceholder: "Search name, number, or chat content…",
    convLoading: "Loading conversations…",
    convNoMatch: (q: string) => `No matches for "${q}".`,
    convNoConversations: "No conversations yet.",
    convYouPrefix: "You: ",
    convMedia: "[media]",
    convNoMessagesYet: "No messages yet",
    convUnknown: "Unknown",
    convNeedsReplyTitle: "Unreplied — lead has replied",
    convUnrepliedBadge: "Unreplied",
    convRepliedByBotBadge: "🤖 Replied by bot",
    convNotLinked: "Not linked to a lead",

    // Reports — shared
    salesReportTitle: "Sales report",
    loading: "Loading…",
    empty: "Empty",
    close: "Close",

    // Reports overview
    reportsOverviewSubtitle: "Where leads flow, from untouched all the way to appointment.",
    reportsOverviewHeading: "Lead Segmentation",
    reportsOverviewDesc1: "“Touched” = contact was attempted (message sent, whether it succeeded or failed) — not just viewed on the dashboard. Numbers here reflect the ",
    reportsOverviewDescNow: "current",
    reportsOverviewDesc2: " status — for when something happened, see ",
    reportsOverviewHistoryLink: "Kanban → History",
    totalLead: "Total Leads",
    untouchedLabel: "Untouched",
    touchedLabel: "Touched",
    onGoingSuffix: "(On Going)",
    seePerLeadKanban: "See per-lead in Kanban board →",

    // Kanban shared
    quickTagFailedGeneric: "Failed to move lead.",
    quickTagFailedConn: "Failed to move lead — check your connection.",
    quickTagClearSuffix: "(clear tag)",
    untouchedToTouched: "Untouched → Touched",
    popupNomor: "Number",
    popupLastMessage: "Last message",
    popupNever: "Never",
    popupMoveTo: "Move to",
    popupOpenChat: "Open Chat",
    kanbanSubnavBoard: "Board",
    kanbanSubnavHistory: "History",

    // Kanban overview
    kanbanOverviewDesc:
      "Flow, left to right: Untouched → No WhatsApp Contact → (No Reply) → (Replied) → other. Click a card to see a summary & move its tag, or drag it to another column. “Untouched”, “Awaiting Reply”, “Not-Interested”, and “Non-Responsive” can't be moved manually — those are automatic statuses, not tags. “Needs Review” isn't a safe resting state — check the chat and move it into the right category.",
    replyBranchNoReply: "No Reply",
    replyBranchReply: "Replied",

    // Kanban daily/history
    kanbanDailyDesc1: "History of ",
    kanbanDailyDescEvent: "events",
    kanbanDailyDesc2: " (when something was tagged), one board per period — drag a card to re-tag a lead right now. For today's status, see ",
    kanbanDailyOverviewLink: "Overview",
    tabPerDay: "By Day",
    tabPerWeek: "By Week",
    kanbanDailyFootnote:
      "Every tag (including automatic \"No WhatsApp Contact\" failures) is now timestamped. Events from before this logging went live use an approximate date (the lead's creation date), not the true event date — don't read older entries as a precise day-by-day history.",
    eventCountSuffix: "events",
    noActivity: "No activity",
    notTracked: "Not tracked",
    groupNoReply: "No Reply",
    groupUnanswered: "Awaiting Reply",
    groupNeedsMore: "Needs Follow-up",
    groupResolved: "Resolved",

    // Reports history
    historySubtitle: "Activity history — when a lead was contacted, when status changed, etc. Max 200 most recent rows.",
    historyDays7: "Last 7 days",
    historyDays30: "Last 30 days",
    historyDays90: "Last 90 days",
    historyAllTypes: "All types",
    historyNoActivity: "No activity in this range.",
    historyColTime: "Time",
    historyColLead: "Lead",
    historyColType: "Type",
    historyColDetail: "Detail",
    activityTagMarked: "marked",
    activityTagCleared: "cleared",
    activityRepliedBot: "Marked as replied by bot",
    activityRepliedManual: "Marked as replied (manual)",
    activityRepliedCleared: "Marked as replied: cleared",
    activityLeadCreatedManually: "Lead created manually (not from scrape)",
    activityFieldPrefix: "Field",
  },
} satisfies Record<Locale, Record<string, string | ((...args: never[]) => string)>>;

export type Translations = (typeof dict)["id"];

export const translations: Record<Locale, Translations> = dict;

// Nav labels + activity-log type labels are keyed maps rather than flat
// strings — separate exports so callers can still index by their own key
// without a giant switch statement.
export const NAV_LABELS: Record<Locale, Record<"dashboard" | "map" | "chat" | "templates" | "reports" | "scrapes", string>> = {
  id: { dashboard: "Dashboard", map: "Peta", chat: "Chat", templates: "Templat", reports: "Laporan", scrapes: "Scrape Jobs" },
  en: { dashboard: "Dashboard", map: "Map", chat: "Chat", templates: "Templates", reports: "Reports", scrapes: "Scrape Jobs" },
};

export const ACTIVITY_TYPE_LABELS: Record<Locale, Record<string, string>> = {
  id: {
    stage_change: "Ganti Stage",
    wa_message_sent: "Pesan Terkirim",
    wa_message_received: "Pesan Masuk",
    manual_edit: "Edit Manual",
    scrape_update: "Update Scrape",
    contact_chain_updated: "Kontak Chain Diubah",
    tag_change: "Ubah Tag",
    replied_marked: "Tandai Dibalas",
    note: "Catatan",
  },
  en: {
    stage_change: "Stage Changed",
    wa_message_sent: "Message Sent",
    wa_message_received: "Message Received",
    manual_edit: "Manual Edit",
    scrape_update: "Scrape Update",
    contact_chain_updated: "Contact Chain Updated",
    tag_change: "Tag Changed",
    replied_marked: "Marked Replied",
    note: "Note",
  },
};
