import { Router } from "express";
import { db } from "../models/store.js";

export const notificationsRouter = Router();

notificationsRouter.get("/", async (req, res) => {
  const notifications = await db.listNotifications(req.session.userId!, req.session.role!);
  res.json(notifications);
});

notificationsRouter.get("/unread-count", async (req, res) => {
  const count = await db.countUnreadNotifications(req.session.userId!, req.session.role!);
  res.json({ count });
});

notificationsRouter.post("/mark-read", async (req, res) => {
  await db.markAllNotificationsRead(req.session.userId!, req.session.role!);
  res.status(204).send();
});

notificationsRouter.post("/:id/mark-read", async (req, res) => {
  await db.markNotificationRead(req.params.id, req.session.userId!, req.session.role!);
  res.status(204).send();
});
