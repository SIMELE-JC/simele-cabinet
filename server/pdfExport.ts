import { Router, type Request, type Response } from "express";
import { getDossierById, getClientById } from "./db";
import { sdk } from "./_core/sdk";

export const pdfRouter = Router();

const renderList = (items: string[] | undefined): string => {
  if (!items || items.length === 0) return "<p style='color:#6b7280;font-size:13px;'>—</p>";
  return items.map((i: string) => `<li style='margin-bottom:4px;font-size:13px;'>${i}</li>`).join("");
};

const renderSection = (title: string, content: string): string =>
  `<div style='margin-bottom:20px;'>
    <h3 style='font-size:13px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #e5e7eb;'>${title}</h3>
    ${content}
  </div>`;

pdfRouter.get("/export-pdf/:id", async (req: Request, res: Response) => {
  try {
    let user = null;
    try { user = await sdk.authenticateRequest(req); } catch { user = null; }
    if (!user) { res.status(401).json({ error: "Non autorisé" }); return; }

    const id = parseInt(req.params.id);
    const dossier = await getDossierById(id);
    if (!dossier) { res.status(404).json({ error: "Dossier introuvable" }); return; }

    const client = await getClientById(dossier.clientId);
    const fiche = (dossier.ficheStructuree as any) ?? {};

    const typeLabel = dossier.type === "entretien_initial" ? "Entretien Initial"
      : dossier.type === "diagnostic" ? "Diagnostic Projet" : "Suivi";

    const scoreColor = dossier.scoreTotal
      ? dossier.scoreTotal >= 45 ? "#059669" : dossier.scoreTotal >= 30 ? "#d97706" : "#dc2626"
      : "#6b7280";
    const scoreLabel = dossier.scoreTotal
      ? dossier.scoreTotal >= 45 ? "Client Premium" : dossier.scoreTotal >= 30 ? "Accompagnement" : "À filtrer"
      : "Non évalué";

    let ficheContent = "";

    if (fiche.informationsGenerales) {
      const ig = fiche.informationsGenerales;
      ficheContent += renderSection("Informations générales", `
        <table style='width:100%;border-collapse:collapse;font-size:13px;'>
          <tr><td style='padding:4px 8px;color:#6b7280;width:40%;'>Nom complet</td><td style='padding:4px 8px;font-weight:500;'>${ig.nom ?? ""} ${ig.prenom ?? ""}</td></tr>
          <tr style='background:#f9fafb;'><td style='padding:4px 8px;color:#6b7280;'>Situation</td><td style='padding:4px 8px;font-weight:500;'>${ig.situation ?? "—"}</td></tr>
          <tr><td style='padding:4px 8px;color:#6b7280;'>Contact</td><td style='padding:4px 8px;font-weight:500;'>${ig.contact ?? "—"}</td></tr>
        </table>`);
    }

    if (fiche.projet) {
      const p = fiche.projet;
      ficheContent += renderSection("Projet", `
        <p style='font-size:14px;font-weight:600;color:#111827;margin-bottom:6px;'>${p.titre ?? "—"}</p>
        <p style='font-size:13px;color:#374151;margin-bottom:8px;'>${p.description ?? "—"}</p>
        <div style='display:flex;gap:16px;flex-wrap:wrap;'>
          ${p.secteurActivite ? `<span style='font-size:12px;background:#eff6ff;color:#1d4ed8;padding:2px 8px;border-radius:4px;'>Secteur : ${p.secteurActivite}</span>` : ""}
          ${p.stadeAvancement ? `<span style='font-size:12px;background:#f0fdf4;color:#15803d;padding:2px 8px;border-radius:4px;'>Stade : ${p.stadeAvancement}</span>` : ""}
        </div>`);
    }

    if (fiche.analyse) {
      const a = fiche.analyse;
      ficheContent += renderSection("Analyse", `
        <div style='display:grid;grid-template-columns:1fr 1fr;gap:16px;'>
          ${a.pointsForts?.length ? `<div><p style='font-size:12px;font-weight:700;color:#059669;margin-bottom:6px;'>Points forts</p><ul style='padding-left:16px;margin:0;'>${renderList(a.pointsForts)}</ul></div>` : ""}
          ${a.pointsFaibles?.length ? `<div><p style='font-size:12px;font-weight:700;color:#d97706;margin-bottom:6px;'>Points faibles</p><ul style='padding-left:16px;margin:0;'>${renderList(a.pointsFaibles)}</ul></div>` : ""}
          ${a.risques?.length ? `<div><p style='font-size:12px;font-weight:700;color:#dc2626;margin-bottom:6px;'>Risques</p><ul style='padding-left:16px;margin:0;'>${renderList(a.risques)}</ul></div>` : ""}
        </div>`);
    }

    if (fiche.financier) {
      const f = fiche.financier;
      ficheContent += renderSection("Analyse financière", `
        <div style='display:grid;grid-template-columns:repeat(3,1fr);gap:12px;'>
          ${f.budgetTotal ? `<div style='background:#f9fafb;padding:10px;border-radius:6px;'><p style='font-size:11px;color:#6b7280;'>Budget total</p><p style='font-size:14px;font-weight:600;'>${f.budgetTotal}</p></div>` : ""}
          ${f.apportPersonnel ? `<div style='background:#f9fafb;padding:10px;border-radius:6px;'><p style='font-size:11px;color:#6b7280;'>Apport personnel</p><p style='font-size:14px;font-weight:600;'>${f.apportPersonnel}</p></div>` : ""}
          ${f.besoinFinancement ? `<div style='background:#f9fafb;padding:10px;border-radius:6px;'><p style='font-size:11px;color:#6b7280;'>Besoin financement</p><p style='font-size:14px;font-weight:600;'>${f.besoinFinancement}</p></div>` : ""}
        </div>`);
    }

    if (fiche.recommandation) {
      const r = fiche.recommandation;
      ficheContent += renderSection("Recommandation", `
        ${r.prestation ? `<p style='font-size:13px;'><strong>Prestation :</strong> ${r.prestation.replace(/_/g, " ")}</p>` : ""}
        ${r.justification ? `<p style='font-size:13px;margin-top:6px;'><strong>Justification :</strong> ${r.justification}</p>` : ""}
        ${r.prochainRdv ? `<p style='font-size:13px;margin-top:6px;'><strong>Prochain RDV :</strong> ${r.prochainRdv}</p>` : ""}`);
    }

    if (fiche.restitution) {
      const rs = fiche.restitution;
      ficheContent += renderSection("Restitution & Recommandations", `
        ${rs.synthese ? `<p style='font-size:13px;margin-bottom:10px;'>${rs.synthese}</p>` : ""}
        ${rs.pointsCritiques?.length ? `<p style='font-size:12px;font-weight:700;color:#dc2626;margin-bottom:4px;'>Points critiques</p><ul style='padding-left:16px;margin:0 0 10px;'>${renderList(rs.pointsCritiques)}</ul>` : ""}
        ${rs.axesTravail?.length ? `<p style='font-size:12px;font-weight:700;color:#d97706;margin-bottom:4px;'>Axes de travail</p><ul style='padding-left:16px;margin:0 0 10px;'>${renderList(rs.axesTravail)}</ul>` : ""}
        ${rs.recommandations?.length ? `<p style='font-size:12px;font-weight:700;color:#1e3a5f;margin-bottom:4px;'>Recommandations</p><ul style='padding-left:16px;margin:0 0 10px;'>${renderList(rs.recommandations)}</ul>` : ""}
        ${rs.prochainEtapes?.length ? `<p style='font-size:12px;font-weight:700;color:#059669;margin-bottom:4px;'>Prochaines étapes</p><ul style='padding-left:16px;margin:0;'>${renderList(rs.prochainEtapes)}</ul>` : ""}`);
    }

    let scoringContent = "";
    if (dossier.scoreTotal !== null && dossier.scoreTotal !== undefined) {
      const bars = [
        { label: "Clarté du projet", score: dossier.scoreClarte },
        { label: "Marché", score: dossier.scoreMarche },
        { label: "Modèle économique", score: dossier.scoreModeleEco },
        { label: "Faisabilité financière", score: dossier.scoreFaisabilite },
        { label: "Motivation", score: dossier.scoreMotivation },
        { label: "Capacité à payer", score: dossier.scoreCapacitePayer },
      ];
      scoringContent = `
        <div style='margin-top:20px;padding:16px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;'>
          <h3 style='font-size:13px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px;'>Scoring SIMELE</h3>
          ${bars.filter(b => b.score !== null && b.score !== undefined).map(b => `
            <div style='display:flex;align-items:center;gap:12px;margin-bottom:8px;'>
              <span style='font-size:12px;color:#6b7280;width:160px;flex-shrink:0;'>${b.label}</span>
              <div style='flex:1;height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden;'>
                <div style='height:100%;background:${(b.score ?? 0) >= 7 ? "#059669" : (b.score ?? 0) >= 5 ? "#d97706" : "#dc2626"};width:${((b.score ?? 0) / 10) * 100}%;border-radius:3px;'></div>
              </div>
              <span style='font-size:12px;font-weight:700;width:36px;text-align:right;color:${(b.score ?? 0) >= 7 ? "#059669" : (b.score ?? 0) >= 5 ? "#d97706" : "#dc2626"};'>${b.score?.toFixed(0)}/10</span>
            </div>`).join("")}
          <div style='display:flex;align-items:center;justify-content:space-between;margin-top:12px;padding-top:12px;border-top:1px solid #e5e7eb;'>
            <span style='font-size:14px;font-weight:700;color:#111827;'>Score total</span>
            <div style='display:flex;align-items:center;gap:12px;'>
              <span style='font-size:24px;font-weight:800;color:${scoreColor};'>${dossier.scoreTotal.toFixed(0)}<span style='font-size:14px;color:#6b7280;'>/60</span></span>
              <span style='font-size:12px;font-weight:600;padding:4px 10px;border-radius:4px;background:${dossier.scoreTotal >= 45 ? "#d1fae5" : dossier.scoreTotal >= 30 ? "#fef3c7" : "#fee2e2"};color:${scoreColor};'>${scoreLabel}</span>
            </div>
          </div>
        </div>`;
    }

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Fiche ${typeLabel} — ${client?.nom ?? ""} ${client?.prenom ?? ""}</title>
<style>* { margin:0; padding:0; box-sizing:border-box; } body { font-family:'Helvetica Neue',Arial,sans-serif; color:#111827; background:white; } @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }</style>
</head>
<body style='padding:40px;max-width:800px;margin:0 auto;'>
  <div style='display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:30px;padding-bottom:20px;border-bottom:3px solid #1e3a5f;'>
    <div>
      <div style='font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;'>Cabinet de Conseils SIMELE</div>
      <h1 style='font-size:22px;font-weight:800;color:#1e3a5f;'>${typeLabel}</h1>
      <p style='font-size:14px;color:#374151;margin-top:4px;'>${client?.prenom ?? ""} ${client?.nom ?? ""} ${client?.titreProjet ? "— " + client.titreProjet : ""}</p>
    </div>
    <div style='text-align:right;'>
      <p style='font-size:11px;color:#6b7280;'>Date</p>
      <p style='font-size:13px;font-weight:600;'>${new Date(dossier.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</p>
      ${dossier.scoreTotal !== null && dossier.scoreTotal !== undefined ? `<div style='margin-top:8px;'><span style='font-size:20px;font-weight:800;color:${scoreColor};'>${dossier.scoreTotal.toFixed(0)}/60</span><br><span style='font-size:11px;color:${scoreColor};font-weight:600;'>${scoreLabel}</span></div>` : ""}
    </div>
  </div>
  ${ficheContent}
  ${scoringContent}
  <div style='margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;'>
    <p style='font-size:11px;color:#9ca3af;'>Cabinet SIMELE — Document confidentiel</p>
    <p style='font-size:11px;color:#9ca3af;'>Généré le ${new Date().toLocaleDateString("fr-FR")}</p>
  </div>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Disposition", `inline; filename="fiche-${dossier.type}-${id}.html"`);
    res.send(html);
  } catch (err) {
    console.error("[PDF Export] Error:", err);
    res.status(500).json({ error: "Erreur lors de la génération" });
  }
});
