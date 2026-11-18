import type { Request, Response, NextFunction } from "express";
import { getSessionUser, getSessionTokenFromCookie } from "../lib/auth";

export type AuthedRequest = Request & {
  user: { id: number; email: string };
  userId: string;
};

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = getSessionTokenFromCookie(req.headers.cookie);
  const user = await getSessionUser(token ?? "");
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const authed = req as AuthedRequest;
  authed.user = user;
  authed.userId = String(user.id);
  next();
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = getSessionTokenFromCookie(req.headers.cookie);
  const user = await getSessionUser(token ?? "");
  if (user) {
    const authed = req as AuthedRequest;
    authed.user = user;
    authed.userId = String(user.id);
  }
  next();
}