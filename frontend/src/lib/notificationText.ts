// A notification's title and body in the interface language, built from
// its type and the values the server stored with it (Notification.params,
// backend routes that call createNotification). Notifications from before
// params existed — or of a type this doesn't know — show the server's own
// English text.
import type { MessageKey } from "../i18n/messages/en";
import type { Notification } from "../types/domain";

type Translate = (key: MessageKey, params?: Record<string, string | number>) => string;

const STATUS_KEYS: Record<string, [MessageKey, MessageKey]> = {
  reviewing: ["notification.reviewingTitle", "notification.reviewingBody"],
  interview: ["notification.interviewStageTitle", "notification.interviewStageBody"],
  offer: ["notification.offerTitle", "notification.offerBody"],
  rejected: ["notification.rejectedTitle", "notification.rejectedBody"],
};

export function notificationText(
  n: Notification,
  t: Translate,
  formatTime: (iso: string) => string
): { title: string; body: string } {
  const p = n.params;
  if (!p) return { title: n.title, body: n.body };

  switch (n.type) {
    case "new_application":
      return {
        title: t("notification.newApplicationTitle"),
        body: t("notification.newApplicationBody", {
          name: p.applicantName || t("notification.someApplicant"),
          listing: p.listingTitle ?? "",
        }),
      };
    case "saved_search_match":
      return {
        title: t("notification.savedSearchTitle"),
        body: t("notification.savedSearchBody", { listing: p.listingTitle ?? "", search: p.searchName ?? "" }),
      };
    case "status_change": {
      const keys = STATUS_KEYS[p.status];
      if (!keys) break;
      return { title: t(keys[0]), body: t(keys[1], { listing: p.listingTitle ?? "" }) };
    }
    case "interview_proposed":
      return {
        title: t("notification.interviewProposedTitle"),
        body: t("notification.interviewProposedBody", { time: formatTime(p.scheduledAt) }),
      };
    case "interview_responded": {
      const accepted = p.response === "accepted";
      return {
        title: t(accepted ? "notification.interviewAcceptedTitle" : "notification.interviewDeclinedTitle"),
        body: t(accepted ? "notification.interviewAcceptedBody" : "notification.interviewDeclinedBody", {
          time: formatTime(p.scheduledAt),
        }),
      };
    }
  }
  return { title: n.title, body: n.body };
}
