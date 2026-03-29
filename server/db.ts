import { eq, desc, and, gte, lte, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  clients,
  dossiers,
  chatMessages,
  suiviClients,
  InsertClient,
  InsertDossier,
  InsertChatMessage,
  InsertSuiviClient,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;

  textFields.forEach((field) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  });

  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Clients ──────────────────────────────────────────────────────────────────
export async function getAllClients(filters?: {
  statut?: string;
  scoreMin?: number;
  scoreMax?: number;
  search?: string;
}) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(clients);
  const conditions = [];
  if (filters?.statut) conditions.push(eq(clients.statut, filters.statut as any));
  if (filters?.scoreMin !== undefined) conditions.push(gte(clients.scoreTotal, filters.scoreMin));
  if (filters?.scoreMax !== undefined) conditions.push(lte(clients.scoreTotal, filters.scoreMax));
  if (filters?.search) {
    conditions.push(
      or(
        like(clients.nom, `%${filters.search}%`),
        like(clients.prenom, `%${filters.search}%`),
        like(clients.titreProjet, `%${filters.search}%`)
      )
    );
  }
  if (conditions.length > 0) {
    return await (query as any).where(and(...conditions)).orderBy(desc(clients.createdAt));
  }
  return await query.orderBy(desc(clients.createdAt));
}

export async function getClientById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createClient(data: InsertClient) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(clients).values(data);
  return result;
}

export async function updateClient(id: number, data: Partial<InsertClient>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(clients).set(data).where(eq(clients.id, id));
}

export async function deleteClient(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(clients).where(eq(clients.id, id));
}

// ─── Dossiers ─────────────────────────────────────────────────────────────────
export async function getDossiersByClientId(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(dossiers).where(eq(dossiers.clientId, clientId)).orderBy(desc(dossiers.createdAt));
}

export async function getDossierById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(dossiers).where(eq(dossiers.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createDossier(data: InsertDossier) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(dossiers).values(data);
  return result;
}

export async function updateDossier(id: number, data: Partial<InsertDossier>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(dossiers).set(data).where(eq(dossiers.id, id));
}

// ─── Chat Messages ────────────────────────────────────────────────────────────
export async function getChatMessagesByDossierId(dossierId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(chatMessages).where(eq(chatMessages.dossierId, dossierId)).orderBy(chatMessages.createdAt);
}

export async function createChatMessage(data: InsertChatMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(chatMessages).values(data);
}

// ─── Suivi Clients ────────────────────────────────────────────────────────────
export async function getSuiviByClientId(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(suiviClients).where(eq(suiviClients.clientId, clientId)).orderBy(desc(suiviClients.dateEchange));
}

export async function createSuivi(data: InsertSuiviClient) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(suiviClients).values(data);
}

export async function updateSuivi(id: number, data: Partial<InsertSuiviClient>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(suiviClients).set(data).where(eq(suiviClients.id, id));
}

// ─── Stats dashboard ──────────────────────────────────────────────────────────
export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return { total: 0, prospects: 0, enCours: 0, suivis: 0, clos: 0 };
  const all = await db.select().from(clients);
  return {
    total: all.length,
    prospects: all.filter((c) => c.statut === "prospect").length,
    enCours: all.filter((c) => c.statut === "en_cours").length,
    suivis: all.filter((c) => c.statut === "suivi").length,
    clos: all.filter((c) => c.statut === "clos").length,
    scoresMoyens: all.filter((c) => c.scoreTotal).reduce((acc, c) => acc + (c.scoreTotal ?? 0), 0) / (all.filter((c) => c.scoreTotal).length || 1),
  };
}
