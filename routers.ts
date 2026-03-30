import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { transcribeAudio, type WhisperResponse } from "./_core/voiceTranscription";
import { notifyOwner } from "./_core/notification";
import {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getDossiersByClientId,
  getDossierById,
  createDossier,
  updateDossier,
  getChatMessagesByDossierId,
  createChatMessage,
  getSuiviByClientId,
  createSuivi,
  updateSuivi,
  getDashboardStats,
  getDb,
} from "./db";
import {
  SIMELE_SYSTEM_PROMPT,
  FICHE_EXTRACTION_PROMPT,
  DIAGNOSTIC_EXTRACTION_PROMPT,
} from "./simelePrompt";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";
import { dossiers } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// ─── Clients Router ───────────────────────────────────────────────────────────
const clientsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        statut: z.string().optional(),
        scoreMin: z.number().optional(),
        scoreMax: z.number().optional(),
        search: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return await getAllClients(input);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const client = await getClientById(input.id);
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Client introuvable" });
      return client;
    }),

  create: protectedProcedure
    .input(
      z.object({
        nom: z.string().min(1),
        prenom: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        telephone: z.string().optional(),
        situation: z.string().optional(),
        titreProjet: z.string().optional(),
        descriptionProjet: z.string().optional(),
        secteurActivite: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await createClient({ ...input, conseillerId: ctx.user.id });
      const db = await import("./db");
      const all = await db.getAllClients();
      const newClient = all[0];
      // Notification au propriétaire
      await notifyOwner({
        title: `Nouveau client : ${input.nom} ${input.prenom ?? ""}`,
        content: `Un nouveau dossier client a été créé pour ${input.nom} ${input.prenom ?? ""}.\nProjet : ${input.titreProjet ?? "Non renseigné"}\nConseiller : ${ctx.user.name ?? ctx.user.email ?? "Inconnu"}`,
      });
      return newClient;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        nom: z.string().optional(),
        prenom: z.string().optional(),
        email: z.string().optional(),
        telephone: z.string().optional(),
        situation: z.string().optional(),
        titreProjet: z.string().optional(),
        descriptionProjet: z.string().optional(),
        secteurActivite: z.string().optional(),
        statut: z.enum(["prospect", "en_cours", "suivi", "clos"]).optional(),
        scoreTotal: z.number().optional(),
        niveauMaturite: z.enum(["flou", "structurable", "avance"]).optional(),
        niveauMotivation: z.enum(["elevee", "moyenne", "faible"]).optional(),
        capaciteFinanciere: z.enum(["forte", "moyenne", "faible"]).optional(),
        recommandation: z.string().optional(),
      })
    )
     .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateClient(id, data);
      return { success: true };
    }),
});
// ─── Dossiers Router ──────────────────────────────────────────────────────────
const dossiersRouter = router({
  listByClient: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      return await getDossiersByClientId(input.clientId);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const dossier = await getDossierById(input.id);
      if (!dossier) throw new TRPCError({ code: "NOT_FOUND", message: "Dossier introuvable" });
      return dossier;
    }),

  create: protectedProcedure
    .input(
      z.object({
        clientId: z.number(),
        type: z.enum(["entretien_initial", "diagnostic", "suivi"]),
        titre: z.string().optional(),
        notesBrutes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await createDossier({ ...input, conseillerId: ctx.user.id });
      const dossiers = await getDossiersByClientId(input.clientId);
      return dossiers[0];
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        titre: z.string().optional(),
        statut: z.enum(["brouillon", "finalise"]).optional(),
        notesBrutes: z.string().optional(),
        ficheStructuree: z.any().optional(),
        scoreClarte: z.number().optional(),
        scoreMarche: z.number().optional(),
        scoreModeleEco: z.number().optional(),
        scoreFaisabilite: z.number().optional(),
        scoreMotivation: z.number().optional(),
        scoreCapacitePayer: z.number().optional(),
        scoreTotal: z.number().optional(),
        interpretationScore: z.string().optional(),
        audioUrl: z.string().optional(),
        transcription: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateDossier(id, data);
      return { success: true };
    }),

  extractFromPDF: protectedProcedure
    .input(z.object({ dossierId: z.number(), pdfBase64: z.string(), fileName: z.string() }))
    .mutation(async ({ input }) => {
      const { extractDataFromPDF } = await import("./pdfExtraction");
      const extractedData = await extractDataFromPDF(input.pdfBase64);
      return extractedData;
    }),

  uploadAudio: protectedProcedure
    .input(z.object({ dossierId: z.number(), audioBase64: z.string(), fileName: z.string() }))
    .mutation(async ({ input }) => {
      const buffer = Buffer.from(input.audioBase64, "base64");
      const { url } = await storagePut(`audio/${input.dossierId}-${Date.now()}.mp3`, buffer, "audio/mpeg");
      const { transcribeAudio } = await import("./_core/voiceTranscription");
      const transcription = await transcribeAudio({ audioUrl: url });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await updateDossier(input.dossierId, {
        audioUrl: url,
        transcription: ("text" in transcription ? transcription.text : ""),
      });
      return { url, transcription: ("text" in transcription ? transcription.text : "") };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const dossier = await getDossierById(input.id);
      if (!dossier) throw new TRPCError({ code: "NOT_FOUND", message: "Dossier not found" });
      await db.delete(dossiers).where(eq(dossiers.id, input.id));
      return { success: true };
    }),

});

// ─── Chat Router ──────────────────────────────────────────────────────────────
const chatRouter = router({
  getMessages: protectedProcedure
    .input(z.object({ dossierId: z.number() }))
    .query(async ({ input }) => {
      return await getChatMessagesByDossierId(input.dossierId);
    }),

  sendMessage: protectedProcedure
    .input(
      z.object({
        dossierId: z.number(),
        content: z.string().min(1),
        context: z.string().optional(), // notes ou contexte supplémentaire
      })
    )
    .mutation(async ({ input }) => {
      // Sauvegarder le message utilisateur
      await createChatMessage({
        dossierId: input.dossierId,
        role: "user",
        content: input.content,
      });

      // Récupérer l'historique
      const history = await getChatMessagesByDossierId(input.dossierId);
      const messages = [
        { role: "system" as const, content: SIMELE_SYSTEM_PROMPT },
        ...history.map((m) => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
        })),
      ];

      // Appel LLM
      const response = await invokeLLM({ messages });
      const rawMsg = response.choices[0]?.message?.content;
      const assistantContent = (typeof rawMsg === "string" ? rawMsg : JSON.stringify(rawMsg)) ?? "Désolé, je n'ai pas pu générer une réponse.";

      // Sauvegarder la réponse
      await createChatMessage({
        dossierId: input.dossierId,
        role: "assistant",
        content: assistantContent,
      });

      return { content: assistantContent };
    }),
});

// ─── Analyse IA Router ────────────────────────────────────────────────────────
const analyseRouter = router({
  genererFiche: protectedProcedure
    .input(
      z.object({
        dossierId: z.number(),
        clientId: z.number(),
        notes: z.string().min(10),
        type: z.enum(["entretien_initial", "diagnostic"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const systemPrompt = input.type === "diagnostic" ? DIAGNOSTIC_EXTRACTION_PROMPT : FICHE_EXTRACTION_PROMPT;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Notes d'entretien :\n\n${input.notes}` },
        ],
        response_format: { type: "json_object" },
      });

      const rawMsg2 = response.choices[0]?.message?.content;
      const rawContent = (typeof rawMsg2 === "string" ? rawMsg2 : JSON.stringify(rawMsg2)) ?? "{}";
      let ficheStructuree: any = {};
      try {
        ficheStructuree = JSON.parse(rawContent);
      } catch {
        ficheStructuree = { error: "Impossible de parser la fiche", raw: rawContent };
      }

      // Extraire le scoring
      const scoring = ficheStructuree.scoring ?? {};
      const scoreTotal = scoring.total ?? 0;
      const interpretation = scoring.interpretation ?? "accompagnement";

      // Mettre à jour le dossier
      await updateDossier(input.dossierId, {
        ficheStructuree,
        notesBrutes: input.notes,
        scoreClarte: scoring.clarte?.note,
        scoreMarche: scoring.marche?.note,
        scoreModeleEco: scoring.modeleEconomique?.note,
        scoreFaisabilite: scoring.faisabiliteFinanciere?.note,
        scoreMotivation: scoring.motivation?.note,
        scoreCapacitePayer: scoring.capacitePayer?.note,
        scoreTotal,
        interpretationScore: interpretation,
        statut: "finalise",
      });

      // Mettre à jour le client avec les infos extraites
      const infos = ficheStructuree.informationsGenerales ?? {};
      const updateData: any = {
        scoreTotal,
        niveauMaturite: ficheStructuree.niveauMaturite,
        niveauMotivation: ficheStructuree.niveauMotivation,
        capaciteFinanciere: ficheStructuree.capaciteFinanciere,
        recommandation: ficheStructuree.recommandation?.prestation,
      };
      if (infos.nom) updateData.nom = infos.nom;
      if (infos.prenom) updateData.prenom = infos.prenom;
      if (ficheStructuree.projet?.titre) updateData.titreProjet = ficheStructuree.projet.titre;
      if (ficheStructuree.projet?.description) updateData.descriptionProjet = ficheStructuree.projet.description;
      if (ficheStructuree.projet?.secteurActivite) updateData.secteurActivite = ficheStructuree.projet.secteurActivite;
      if (ficheStructuree.projet?.stadeAvancement) updateData.stadeAvancement = ficheStructuree.projet.stadeAvancement;

      await updateClient(input.clientId, updateData);

      // Notification si score critique (< 30)
      if (scoreTotal < 30) {
        const client = await getClientById(input.clientId);
        await notifyOwner({
          title: `⚠️ Score critique : ${client?.nom ?? "Client"} (${scoreTotal}/60)`,
          content: `Le projet de ${client?.nom ?? "ce client"} a obtenu un score de ${scoreTotal}/60, ce qui nécessite une attention particulière.\nInterprétation : ${interpretation}\nConseiller : ${ctx.user.name ?? ctx.user.email ?? "Inconnu"}`,
        });
      }

      return { ficheStructuree, scoreTotal, interpretation };
    }),

  transcribeAudio: protectedProcedure
    .input(
      z.object({
        dossierId: z.number(),
        audioUrl: z.string().url(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await transcribeAudio({
        audioUrl: input.audioUrl,
        language: "fr",
        prompt: "Transcription d'un entretien de conseil en création d'entreprise",
      });
      if ("error" in result) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error });
      const whisperResult = result as WhisperResponse;

      await updateDossier(input.dossierId, {
        audioUrl: input.audioUrl,
        transcription: whisperResult.text,
      });

      return { transcription: whisperResult.text };
    }),

  uploadAudio: protectedProcedure
    .input(
      z.object({
        dossierId: z.number(),
        audioBase64: z.string(),
        mimeType: z.string().default("audio/webm"),
      })
    )
    .mutation(async ({ input }) => {
      const buffer = Buffer.from(input.audioBase64, "base64");
      const ext = input.mimeType.includes("mp3") ? "mp3" : input.mimeType.includes("wav") ? "wav" : "webm";
      const key = `audio/entretien-${input.dossierId}-${nanoid(8)}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);

      // Transcription immédiate
      const result2 = await transcribeAudio({
        audioUrl: url,
        language: "fr",
        prompt: "Transcription d'un entretien de conseil en création d'entreprise",
      });
      const transcriptionText = "error" in result2 ? "" : (result2 as WhisperResponse).text;

      await updateDossier(input.dossierId, {
        audioUrl: url,
        transcription: transcriptionText,
      });

      return { audioUrl: url, transcription: transcriptionText };
    }),
});

// ─── Suivi Router ─────────────────────────────────────────────────────────────
const suiviRouter = router({
  listByClient: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      return await getSuiviByClientId(input.clientId);
    }),

  create: protectedProcedure
    .input(
      z.object({
        clientId: z.number(),
        avancement: z.string().optional(),
        actionsRealisees: z.string().optional(),
        prochainesEtapes: z.string().optional(),
        pointsBlockage: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await createSuivi({ ...input, conseillerId: ctx.user.id });
      return { success: true };
    }),

  extractFromPDF: protectedProcedure
    .input(z.object({ dossierId: z.number(), pdfBase64: z.string(), fileName: z.string() }))
    .mutation(async ({ input }) => {
      const { extractDataFromPDF } = await import("./pdfExtraction");
      const extractedData = await extractDataFromPDF(input.pdfBase64);
      return extractedData;
    }),

  uploadAudio: protectedProcedure
    .input(z.object({ dossierId: z.number(), audioBase64: z.string(), fileName: z.string() }))
    .mutation(async ({ input }) => {
      const buffer = Buffer.from(input.audioBase64, "base64");
      const { url } = await storagePut(`audio/${input.dossierId}-${Date.now()}.mp3`, buffer, "audio/mpeg");
      const { transcribeAudio } = await import("./_core/voiceTranscription");
      const transcription = await transcribeAudio({ audioUrl: url });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await updateDossier(input.dossierId, {
        audioUrl: url,
        transcription: ("text" in transcription ? transcription.text : ""),
      });
      return { url, transcription: ("text" in transcription ? transcription.text : "") };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        avancement: z.string().optional(),
        actionsRealisees: z.string().optional(),
        prochainesEtapes: z.string().optional(),
        pointsBlockage: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateSuivi(id, data);
      return { success: true };
    }),

});

// ─── FicheInitiale Router ─────────────────────────────────────────────────────
const ficheInitialeRouter = router({
  save: protectedProcedure
    .input(
      z.object({
        clientId: z.number(),
        nom: z.string().optional().default(""),
        telephone: z.string().optional().default(""),
        email: z.string().optional().default(""),
        situation: z.string().optional().default(""),
        projetDescription: z.string().optional().default(""),
        stade: z.string().optional().default(""),
        objectifPrincipal: z.string().optional().default(""),
        objectifAutre: z.string().optional().default(""),
        situationActuelle: z.string().optional().default(""),
        contraintes: z.string().optional().default("[]"),
        budgetEstimé: z.string().optional().default(""),
        apport: z.string().optional().default(""),
        financement: z.string().optional().default(""),
        démarrchéBanque: z.boolean().optional().default(false),
        aucunContact: z.boolean().optional().default(false),
        avancement: z.string().optional().default(""),
        tempsDisponible: z.string().optional().default(""),
        échéance: z.string().optional().default(""),
        actionsEnPlace: z.boolean().optional().default(false),
        capacité: z.string().optional().default(""),
        diagnostic: z.string().optional().default(""),
        orientation: z.string().optional().default("[]"),
        scoreClarte: z.number().optional().default(0),
        scoreFaisabilite: z.number().optional().default(0),
        scoreMotivation: z.number().optional().default(0),
        scoreBudget: z.number().optional().default(0),
        scoreTotal: z.number().optional().default(0),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { saveFicheInitiale } = await import("./ficheInitiale");

      // Créer un dossier de type entretien_initial
      await createDossier({
        clientId: input.clientId,
        type: "entretien_initial",
        titre: `Entretien initial – ${input.nom || "Client"}`,
        conseillerId: ctx.user.id,
      });
      const dossiersList = await getDossiersByClientId(input.clientId);
      const dossier = dossiersList[0];

      await saveFicheInitiale({ ...input, dossierId: dossier.id });

      // Mettre à jour le client
      const updateData: any = {
        scoreTotal: Math.round((input.scoreTotal / 40) * 60),
      };
      if (input.nom) updateData.nom = input.nom;
      if (input.email) updateData.email = input.email;
      if (input.telephone) updateData.telephone = input.telephone;
      if (input.situation) updateData.situation = input.situation;
      if (input.projetDescription) updateData.titreProjet = input.projetDescription;
      await updateClient(input.clientId, updateData);

      return { success: true, dossierId: dossier.id };
    }),

  getByClient: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      const dossiersList = await getDossiersByClientId(input.clientId);
      const entretiens = dossiersList.filter(d => d.type === "entretien_initial");
      if (entretiens.length === 0) return null;
      const { getFicheInitiale } = await import("./ficheInitiale");
      return await getFicheInitiale(entretiens[0].id);
    }),
});

// ─── App Router ───────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  clients: clientsRouter,
  dossiers: dossiersRouter,
  chat: chatRouter,
  analyse: analyseRouter,
  suivi: suiviRouter,
  ficheInitiale: ficheInitialeRouter,
});

export type AppRouter = typeof appRouter;
