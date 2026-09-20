import { useEffect, useState } from "react";
import { api } from "../api/client";

// Polling instead of a push channel — simple, and fine at this cadence for
// a one-on-one inbox with no real-time infrastructure behind it.
export function useUnreadMessages(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    function load() {
      api
        .getConversations()
        .then((conversations) => {
          if (!cancelled) setCount(conversations.reduce((sum, c) => sum + c.unreadCount, 0));
        })
        .catch(() => {});
    }
    load();
    const interval = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return count;
}
