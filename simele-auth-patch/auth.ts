import type { Express, Request, Response } from "express";
import * as db from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

const getSecret = () => {
  const s = process.env.SESSION_SECRET ?? "simele_dev_secret_2026";
  return new TextEncoder().encode(s);
};

export async function createSessionToken(openId: string, name: string): Promise<string> {
  return new SignJWT({ openId, name })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("365d")
    .sign(getSecret());
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as { openId: string; name: string };
  } catch {
    return null;
  }
}

export function registerAuthRoutes(app: Express) {
  // Inscription
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      res.status(400).json({ error: "email, password et name requis" });
      return;
    }
    try {
      const openId = `local_${email.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
      const existing = await db.getUserByOpenId(openId);
      if (existing) {
        res.status(400).json({ error: "Un compte existe déjà avec cet email" });
        return;
      }
      const hash = await bcrypt.hash(password, 10);
      await db.upsertUser({ openId, email, name, loginMethod: `local:${hash}`, lastSignedIn: new Date() });
      const token = await createSessionToken(openId, name);
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({ success: true, user: { openId, email, name } });
    } catch (error) {
      console.error("[Auth] Register error", error);
      res.status(500).json({ error: "Erreur lors de l'inscription" });
    }
  });

  // Connexion
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "email et password requis" });
      return;
    }
    try {
      const openId = `local_${email.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
      const user = await db.getUserByOpenId(openId);
      if (!user) {
        res.status(401).json({ error: "Email ou mot de passe incorrect" });
        return;
      }
      const hash = user.loginMethod?.replace("local:", "") ?? "";
      const valid = await bcrypt.compare(password, hash);
      if (!valid) {
        res.status(401).json({ error: "Email ou mot de passe incorrect" });
        return;
      }
      await db.upsertUser({ ...user, lastSignedIn: new Date() });
      const token = await createSessionToken(openId, user.name ?? email);
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({ success: true, user: { openId, email: user.email, name: user.name } });
    } catch (error) {
      console.error("[Auth] Login error", error);
      res.status(500).json({ error: "Erreur lors de la connexion" });
    }
  });

  // Déconnexion
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.json({ success: true });
  });
}
