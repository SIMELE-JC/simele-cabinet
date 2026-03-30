import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { verifySessionToken } from "../auth";
import * as db from "../db";
import { COOKIE_NAME } from "@shared/const";
import { parse as parseCookies } from "cookie";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  let user: User | null = null;
  try {
    const cookieHeader = opts.req.headers.cookie ?? "";
    const cookies = parseCookies(cookieHeader);
    const token = cookies[COOKIE_NAME];
    if (token) {
      const payload = await verifySessionToken(token);
      if (payload?.openId) {
        const found = await db.getUserByOpenId(payload.openId);
        user = found ?? null;
      }
    }
  } catch {
    user = null;
  }
  return { req: opts.req, res: opts.res, user };
}
