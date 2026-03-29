import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  json,
  float,
  boolean,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Clients ──────────────────────────────────────────────────────────────────
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  // Informations générales
  nom: varchar("nom", { length: 255 }).notNull(),
  prenom: varchar("prenom", { length: 255 }),
  email: varchar("email", { length: 320 }),
  telephone: varchar("telephone", { length: 50 }),
  situation: varchar("situation", { length: 100 }), // salarié, demandeur d'emploi, etc.
  // Projet
  titreProjet: varchar("titreProjet", { length: 500 }),
  descriptionProjet: text("descriptionProjet"),
  secteurActivite: varchar("secteurActivite", { length: 255 }),
  stadeAvancement: mysqlEnum("stadeAvancement", ["idee", "structurable", "avance", "en_cours"]).default("idee"),
  // Statut dossier
  statut: mysqlEnum("statut", ["prospect", "en_cours", "suivi", "clos"]).default("prospect").notNull(),
  // Scoring
  scoreTotal: float("scoreTotal"),
  niveauMaturite: mysqlEnum("niveauMaturite", ["flou", "structurable", "avance"]),
  niveauMotivation: mysqlEnum("niveauMotivation", ["elevee", "moyenne", "faible"]),
  capaciteFinanciere: mysqlEnum("capaciteFinanciere", ["forte", "moyenne", "faible"]),
  // Recommandation
  recommandation: varchar("recommandation", { length: 500 }),
  // Métadonnées
  conseillerId: int("conseillerId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

// ─── Dossiers (sessions d'entretien) ─────────────────────────────────────────
export const dossiers = mysqlTable("dossiers", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  type: mysqlEnum("type", ["entretien_initial", "diagnostic", "suivi"]).notNull(),
  titre: varchar("titre", { length: 500 }),
  statut: mysqlEnum("statut", ["brouillon", "finalise"]).default("brouillon").notNull(),
  // Contenu structuré JSON (fiche générée par LLM)
  ficheStructuree: json("ficheStructuree"),
  // Scoring détaillé
  scoreClarte: float("scoreClarte"),        // /10
  scoreMarche: float("scoreMarche"),         // /10
  scoreModeleEco: float("scoreModeleEco"),   // /10
  scoreFaisabilite: float("scoreFaisabilite"), // /10
  scoreMotivation: float("scoreMotivation"), // /10
  scoreCapacitePayer: float("scoreCapacitePayer"), // /10
  scoreTotal: float("scoreTotal"),           // /60
  interpretationScore: varchar("interpretationScore", { length: 100 }), // premium / accompagnement / à filtrer
  // Notes brutes
  notesBrutes: text("notesBrutes"),
  audioUrl: varchar("audioUrl", { length: 1000 }),
  transcription: text("transcription"),
  // Métadonnées
  conseillerId: int("conseillerId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Dossier = typeof dossiers.$inferSelect;
export type InsertDossier = typeof dossiers.$inferInsert;

// ─── Messages de chat ─────────────────────────────────────────────────────────
export const chatMessages = mysqlTable("chatMessages", {
  id: int("id").autoincrement().primaryKey(),
  dossierId: int("dossierId").notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  metadata: json("metadata"), // données structurées extraites, scores, etc.
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

// ─── Suivi client ─────────────────────────────────────────────────────────────
export const suiviClients = mysqlTable("suiviClients", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  dateEchange: timestamp("dateEchange").defaultNow().notNull(),
  avancement: text("avancement"),
  actionsRealisees: text("actionsRealisees"),
  prochainesEtapes: text("prochainesEtapes"),
  pointsBlockage: text("pointsBlockage"),
  conseillerId: int("conseillerId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SuiviClient = typeof suiviClients.$inferSelect;
export type InsertSuiviClient = typeof suiviClients.$inferInsert;
