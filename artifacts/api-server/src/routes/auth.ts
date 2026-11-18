import { Router, type IRouter, type Request, type Response } from "express";
import { db, users, eq } from "@workspace/db";
import { hashPassword, verifyPassword, createSession, getSessionUser, revokeSession, getSessionTokenFromCookie, setSessionCookie, clearSessionCookie } from "../lib/auth";

const router: IRouter = Router();

router.post("/auth/register", async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }
  if (typeof email !== "string" || typeof password !== "string") {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db.insert(users).values({ email: email.toLowerCase(), passwordHash }).returning({ id: users.id, email: users.email });
  const token = await createSession(user.id);
  setSessionCookie(res, token, req);
  res.status(201).json({ user: { id: user.id, email: user.email } });
});

router.post("/auth/login", async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }

  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = await createSession(user.id);
  setSessionCookie(res, token, req);
  res.json({ user: { id: user.id, email: user.email } });
});

router.post("/auth/logout", async (req: Request, res: Response): Promise<void> => {
  const token = getSessionTokenFromCookie(req.headers.cookie);
  if (token) await revokeSession(token);
  clearSessionCookie(res, req);
  res.status(204).send();
});

router.get("/auth/me", async (req: Request, res: Response): Promise<void> => {
  const token = getSessionTokenFromCookie(req.headers.cookie);
  const user = token ? await getSessionUser(token) : null;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json({ user: { id: user.id, email: user.email } });
});

export default router;