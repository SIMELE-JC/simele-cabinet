import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Download, FileText, BarChart3, CheckCircle,
  AlertTriangle, TrendingUp, Target, Users, DollarSign, Loader2,
} from "lucide-react";
import { toast } from "sonner";

function ScoreBar({ label, score }: { label: string; score: number | null }) {
  if (score === null || score === undefined) return null;
  const pct = Math.min(100, (score / 10) * 100);
  const color = score >= 7 ? "bg-emerald-500" : score >= 5 ? "bg-amber-500" : "bg-red-500";
  const textColor = score >= 7 ? "text-emerald-600" : score >= 5 ? "text-amber-600" : "text-red-600";
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground w-36 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-sm font-bold tabular-nums w-10 text-right ${textColor}`}>{score.toFixed(0)}/10</span>
    </div>
  );
}

function Section({ title, icon: Icon, children, color = "text-primary", bg = "bg-primary/10" }: {
  title: string; icon: any; children: React.ReactNode; color?: string; bg?: string;
}) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}>
            <Icon className={`h-3.5 w-3.5 ${color}`} />
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ListItems({ items }: { items: string[] }) {
  if (!items || items.length === 0) return <p className="text-sm text-muted-foreground">—</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function DossierDetail() {
  const params = useParams<{ id: string }>();
  const dossierId = parseInt(params.id ?? "0");
  const [, navigate] = useLocation();

  const { data: dossier, isLoading } = trpc.dossiers.getById.useQuery({ id: dossierId });

  const handleExportPDF = async () => {
    if (!dossier) return;
    toast.info("Génération du PDF en cours...");
    try {
      const response = await fetch(`/api/export-pdf/${dossierId}`, { credentials: "include" });
      if (!response.ok) throw new Error("Erreur serveur");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fiche-${dossier.type}-${dossierId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF téléchargé");
    } catch {
      // Fallback : impression navigateur
      window.print();
    }
  };

  if (isLoading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    </DashboardLayout>
  );

  if (!dossier) return (
    <DashboardLayout>
      <div className="p-6 text-center text-muted-foreground">Dossier introuvable</div>
    </DashboardLayout>
  );

  const fiche = dossier.ficheStructuree as any;
  const scoring = fiche?.scoring ?? {};
  const hasScoring = dossier.scoreTotal !== null && dossier.scoreTotal !== undefined;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6" id="dossier-print">
        {/* Navigation */}
        <div className="flex items-center justify-between flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/clients/${dossier.clientId}`)} className="gap-1.5 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Retour au client
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportPDF}>
              <Download className="h-4 w-4" /> Exporter PDF
            </Button>
          </div>
        </div>

        {/* En-tête dossier */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className={`text-xs ${dossier.type === "diagnostic" ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                {dossier.type === "entretien_initial" ? "Entretien initial" : dossier.type === "diagnostic" ? "Diagnostic projet" : "Suivi"}
              </Badge>
              <Badge variant="outline" className={`text-xs ${dossier.statut === "finalise" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                {dossier.statut === "finalise" ? "Finalisé" : "Brouillon"}
              </Badge>
            </div>
            <h1 className="text-xl font-bold text-foreground">{dossier.titre ?? "Dossier sans titre"}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Créé le {new Date(dossier.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
          </div>
          {hasScoring && (
            <div className="text-right">
              <p className="text-3xl font-bold text-foreground">{dossier.scoreTotal?.toFixed(0)}<span className="text-lg text-muted-foreground">/60</span></p>
              <Badge className={`mt-1 text-xs border ${dossier.scoreTotal! >= 45 ? "bg-emerald-100 text-emerald-800 border-emerald-200" : dossier.scoreTotal! >= 30 ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-red-100 text-red-800 border-red-200"}`}>
                {dossier.scoreTotal! >= 45 ? "Client Premium" : dossier.scoreTotal! >= 30 ? "Accompagnement" : "À filtrer"}
              </Badge>
            </div>
          )}
        </div>

        {!fiche || Object.keys(fiche).length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium text-foreground">Aucune fiche générée</p>
              <p className="text-sm text-muted-foreground mt-1">Retournez à l'entretien pour générer la fiche IA.</p>
              <Button className="mt-4" onClick={() => navigate(`/clients/${dossier.clientId}/entretien`)}>
                Démarrer l'entretien
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="fiche">
            <TabsList className="bg-muted">
              <TabsTrigger value="fiche" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Fiche structurée</TabsTrigger>
              {hasScoring && <TabsTrigger value="scoring" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Scoring</TabsTrigger>}
              {dossier.notesBrutes && <TabsTrigger value="notes" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Notes brutes</TabsTrigger>}
            </TabsList>

            {/* Fiche structurée */}
            <TabsContent value="fiche" className="mt-4 space-y-4">
              {/* Informations générales */}
              {fiche.informationsGenerales && (
                <Section title="Informations générales" icon={Users} color="text-blue-600" bg="bg-blue-50">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {Object.entries(fiche.informationsGenerales).map(([k, v]) => (
                      <div key={k}>
                        <p className="text-xs text-muted-foreground capitalize">{k.replace(/([A-Z])/g, " $1")}</p>
                        <p className="text-sm font-medium text-foreground mt-0.5">{String(v) || "—"}</p>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Projet */}
              {fiche.projet && (
                <Section title="Projet" icon={Target} color="text-primary" bg="bg-primary/10">
                  <div className="space-y-3">
                    {fiche.projet.titre && <div><p className="text-xs text-muted-foreground">Titre</p><p className="text-sm font-semibold text-foreground">{fiche.projet.titre}</p></div>}
                    {fiche.projet.description && <div><p className="text-xs text-muted-foreground">Description</p><p className="text-sm text-foreground">{fiche.projet.description}</p></div>}
                    <div className="flex flex-wrap gap-3">
                      {fiche.projet.secteurActivite && <div><p className="text-xs text-muted-foreground">Secteur</p><p className="text-sm font-medium">{fiche.projet.secteurActivite}</p></div>}
                      {fiche.projet.stadeAvancement && <div><p className="text-xs text-muted-foreground">Stade</p><Badge variant="outline" className="text-xs">{fiche.projet.stadeAvancement}</Badge></div>}
                      {fiche.projet.formJuridique && <div><p className="text-xs text-muted-foreground">Forme juridique</p><p className="text-sm font-medium">{fiche.projet.formJuridique}</p></div>}
                    </div>
                  </div>
                </Section>
              )}

              {/* Analyse */}
              {fiche.analyse && (
                <Section title="Analyse" icon={TrendingUp} color="text-emerald-600" bg="bg-emerald-50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {fiche.analyse.pointsForts?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-emerald-700 mb-2 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Points forts</p>
                        <ListItems items={fiche.analyse.pointsForts} />
                      </div>
                    )}
                    {fiche.analyse.pointsFaibles?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Points faibles</p>
                        <ListItems items={fiche.analyse.pointsFaibles} />
                      </div>
                    )}
                    {fiche.analyse.risques?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Risques</p>
                        <ListItems items={fiche.analyse.risques} />
                      </div>
                    )}
                    {fiche.analyse.incoherences?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-orange-700 mb-2">Incohérences détectées</p>
                        <ListItems items={fiche.analyse.incoherences} />
                      </div>
                    )}
                  </div>
                </Section>
              )}

              {/* Financier */}
              {fiche.financier && (
                <Section title="Analyse financière" icon={DollarSign} color="text-emerald-600" bg="bg-emerald-50">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: "Budget total", value: fiche.financier.budgetTotal },
                      { label: "Apport personnel", value: fiche.financier.apportPersonnel },
                      { label: "Besoin financement", value: fiche.financier.besoinFinancement },
                    ].filter(f => f.value).map(({ label, value }) => (
                      <div key={label} className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-sm font-semibold text-foreground mt-1">{value}</p>
                      </div>
                    ))}
                  </div>
                  {fiche.financier.sourcesFinancement?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground mb-1.5">Sources de financement envisagées</p>
                      <div className="flex flex-wrap gap-1.5">
                        {fiche.financier.sourcesFinancement.map((s: string) => (
                          <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </Section>
              )}

              {/* Niveaux & Recommandation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Section title="Évaluation" icon={BarChart3} color="text-purple-600" bg="bg-purple-50">
                  <div className="space-y-3">
                    {[
                      { label: "Niveau de maturité", value: fiche.niveauMaturite, map: { flou: "Flou", structurable: "Structurable", avance: "Avancé" } },
                      { label: "Motivation", value: fiche.niveauMotivation, map: { elevee: "Élevée", moyenne: "Moyenne", faible: "Faible" } },
                      { label: "Capacité financière", value: fiche.capaciteFinanciere, map: { forte: "Forte", moyenne: "Moyenne", faible: "Faible" } },
                    ].map(({ label, value, map }) => value && (
                      <div key={label} className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">{label}</p>
                        <Badge variant="outline" className="text-xs">{(map as any)[value] ?? value}</Badge>
                      </div>
                    ))}
                  </div>
                </Section>

                {fiche.recommandation && (
                  <Section title="Recommandation" icon={Target} color="text-primary" bg="bg-primary/10">
                    <div className="space-y-2">
                      {fiche.recommandation.prestation && (
                        <div>
                          <p className="text-xs text-muted-foreground">Prestation recommandée</p>
                          <Badge className="mt-1 text-xs bg-primary text-primary-foreground">{fiche.recommandation.prestation.replace(/_/g, " ")}</Badge>
                        </div>
                      )}
                      {fiche.recommandation.justification && (
                        <div>
                          <p className="text-xs text-muted-foreground">Justification</p>
                          <p className="text-sm text-foreground mt-0.5">{fiche.recommandation.justification}</p>
                        </div>
                      )}
                      {fiche.recommandation.prochainRdv && (
                        <div>
                          <p className="text-xs text-muted-foreground">Prochain RDV</p>
                          <p className="text-sm font-medium text-foreground mt-0.5">{fiche.recommandation.prochainRdv}</p>
                        </div>
                      )}
                    </div>
                  </Section>
                )}
              </div>

              {/* Sections diagnostic */}
              {fiche.vision && (
                <Section title="Vision" icon={Target} color="text-indigo-600" bg="bg-indigo-50">
                  <div className="space-y-3">
                    {fiche.vision.visionPorteur && <div><p className="text-xs text-muted-foreground">Vision du porteur</p><p className="text-sm text-foreground">{fiche.vision.visionPorteur}</p></div>}
                    {fiche.vision.objectifsLongTerme?.length > 0 && <div><p className="text-xs text-muted-foreground mb-1">Objectifs long terme</p><ListItems items={fiche.vision.objectifsLongTerme} /></div>}
                  </div>
                </Section>
              )}

              {fiche.marche && (
                <Section title="Marché" icon={TrendingUp} color="text-cyan-600" bg="bg-cyan-50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {fiche.marche.ciblePrincipale && <div><p className="text-xs text-muted-foreground">Cible principale</p><p className="text-sm font-medium">{fiche.marche.ciblePrincipale}</p></div>}
                    {fiche.marche.tailleMarche && <div><p className="text-xs text-muted-foreground">Taille du marché</p><p className="text-sm font-medium">{fiche.marche.tailleMarche}</p></div>}
                    {fiche.marche.concurrents?.length > 0 && <div><p className="text-xs text-muted-foreground mb-1">Concurrents</p><ListItems items={fiche.marche.concurrents} /></div>}
                    {fiche.marche.avantagesConcurrentiels?.length > 0 && <div><p className="text-xs text-muted-foreground mb-1">Avantages concurrentiels</p><ListItems items={fiche.marche.avantagesConcurrentiels} /></div>}
                  </div>
                </Section>
              )}

              {fiche.restitution && (
                <Section title="Restitution & Recommandations" icon={CheckCircle} color="text-emerald-600" bg="bg-emerald-50">
                  <div className="space-y-4">
                    {fiche.restitution.synthese && <div><p className="text-xs text-muted-foreground mb-1">Synthèse</p><p className="text-sm text-foreground">{fiche.restitution.synthese}</p></div>}
                    {fiche.restitution.pointsCritiques?.length > 0 && <div><p className="text-xs font-semibold text-red-700 mb-1.5">Points critiques</p><ListItems items={fiche.restitution.pointsCritiques} /></div>}
                    {fiche.restitution.axesTravail?.length > 0 && <div><p className="text-xs font-semibold text-amber-700 mb-1.5">Axes de travail</p><ListItems items={fiche.restitution.axesTravail} /></div>}
                    {fiche.restitution.recommandations?.length > 0 && <div><p className="text-xs font-semibold text-primary mb-1.5">Recommandations</p><ListItems items={fiche.restitution.recommandations} /></div>}
                    {fiche.restitution.prochainEtapes?.length > 0 && <div><p className="text-xs font-semibold text-emerald-700 mb-1.5">Prochaines étapes</p><ListItems items={fiche.restitution.prochainEtapes} /></div>}
                  </div>
                </Section>
              )}
            </TabsContent>

            {/* Scoring */}
            {hasScoring && (
              <TabsContent value="scoring" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Scoring SIMELE détaillé</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <ScoreBar label="Clarté du projet" score={dossier.scoreClarte ?? null} />
                      <ScoreBar label="Marché" score={dossier.scoreMarche ?? null} />
                      <ScoreBar label="Modèle économique" score={dossier.scoreModeleEco ?? null} />
                      <ScoreBar label="Faisabilité financière" score={dossier.scoreFaisabilite ?? null} />
                      <ScoreBar label="Motivation" score={dossier.scoreMotivation ?? null} />
                      <ScoreBar label="Capacité à payer" score={dossier.scoreCapacitePayer ?? null} />
                    </div>
                    <div className="border-t border-border pt-4 flex items-center justify-between">
                      <p className="font-semibold text-foreground">Score total</p>
                      <div className="flex items-center gap-3">
                        <p className="text-2xl font-bold text-foreground">{dossier.scoreTotal?.toFixed(0)}<span className="text-base text-muted-foreground">/60</span></p>
                        <Badge className={`text-sm px-3 py-1 border ${dossier.scoreTotal! >= 45 ? "bg-emerald-100 text-emerald-800 border-emerald-200" : dossier.scoreTotal! >= 30 ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-red-100 text-red-800 border-red-200"}`}>
                          {dossier.scoreTotal! >= 45 ? "Client Premium (+45)" : dossier.scoreTotal! >= 30 ? "Accompagnement (30-45)" : "À filtrer (<30)"}
                        </Badge>
                      </div>
                    </div>
                    {/* Justifications */}
                    {scoring && Object.keys(scoring).length > 0 && (
                      <div className="space-y-3 pt-2">
                        <p className="text-sm font-semibold text-foreground">Justifications détaillées</p>
                        {[
                          { key: "clarte", label: "Clarté" },
                          { key: "marche", label: "Marché" },
                          { key: "modeleEconomique", label: "Modèle économique" },
                          { key: "faisabiliteFinanciere", label: "Faisabilité financière" },
                          { key: "motivation", label: "Motivation" },
                          { key: "capacitePayer", label: "Capacité à payer" },
                        ].filter(({ key }) => scoring[key]?.justification).map(({ key, label }) => (
                          <div key={key} className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-xs font-semibold text-foreground mb-1">{label} — {scoring[key]?.note}/10</p>
                            <p className="text-xs text-muted-foreground">{scoring[key]?.justification}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Notes brutes */}
            {dossier.notesBrutes && (
              <TabsContent value="notes" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Notes brutes d'entretien</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-sm text-foreground whitespace-pre-wrap font-mono bg-muted/50 p-4 rounded-lg">
                      {dossier.notesBrutes}
                    </pre>
                    {dossier.transcription && (
                      <div className="mt-4">
                        <p className="text-sm font-semibold text-foreground mb-2">Transcription audio</p>
                        <pre className="text-sm text-foreground whitespace-pre-wrap bg-blue-50 border border-blue-200 p-4 rounded-lg">
                          {dossier.transcription}
                        </pre>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
