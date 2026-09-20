import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { Notification } from "../types/domain";
import { BellIcon } from "./icons";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Polling, same as messages/unread-count — no push channel behind this app.
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();

  const loadCount = useCallback(() => {
    api.getUnreadNotificationCount().then(setCount).catch(() => {});
  }, []);

  useEffect(() => {
    loadCount();
    const interval = setInterval(loadCount, 20000);
    return () => clearInterval(interval);
  }, [loadCount]);

  useEffect(() => {
    if (!open) return;
    api.getNotifications().then(setNotifications).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  async function markAllRead() {
    await api.markAllNotificationsRead();
    setCount(0);
    setNotifications((prev) => (prev ? prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })) : prev));
  }

  async function openNotification(n: Notification) {
    if (!n.readAt) {
      await api.markNotificationRead(n.id);
      setCount((c) => Math.max(0, c - 1));
      setNotifications((prev) => (prev ? prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)) : prev));
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  }

  return (
    <div className="notification-bell" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        className="icon-btn notification-bell-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        aria-haspopup="true"
        aria-expanded={open}
        title="Notifications"
      >
        <BellIcon />
        {count > 0 && <span className="notification-count">{count > 9 ? "9+" : count}</span>}
      </button>

      {open && (
        <div className="notification-panel card" role="dialog" aria-label="Notifications">
          <div className="notification-panel-header">
            <span>Notifications</span>
            {notifications && notifications.some((n) => !n.readAt) && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>
          <div className="notification-panel-list">
            {!notifications && <p className="notification-empty">Loading…</p>}
            {notifications && notifications.length === 0 && <p className="notification-empty">No notifications.</p>}
            {notifications?.map((n) => (
              <button
                type="button"
                key={n.id}
                className={`notification-item ${n.readAt ? "" : "unread"}`}
                onClick={() => openNotification(n)}
              >
                <span className="notification-item-title">{n.title}</span>
                <span className="notification-item-body">{n.body}</span>
                <span className="notification-item-time">{timeAgo(n.createdAt)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
