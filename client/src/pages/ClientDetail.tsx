import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Plus, FileText, MessageSquare, BarChart3,
  User, Phone, Mail, Briefcase, Calendar, ChevronRight,
  TrendingUp, Clock, CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const STATUT_LABELS: Record<string, { label: string; color: string }> = {
  prospect: { label: "Prospect", color: "bg-blue-100 text-blue-700 border-blue-200" },
  en_cours: { label: "En cours", color: "bg-amber-100 text-amber-700 border-amber-200" },
  suivi: { label: "Suivi", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  clos: { label: "Clos", color: "bg-gray-100 text-gray-600 border-gray-200" },
};

function ScoreGauge({ score, label }: { score: number; label: string }) {
  const pct = Math.min(100, (score / 10) * 100);
  const color = score >= 7 ? "#10b981" : score >= 5 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-14 h-14">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
          <circle cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3"
            strokeDasharray={`${pct} 100`} strokeLinecap="round" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color }}>
          {score.toFixed(0)}
        </span>
      </div>
      <p className="text-xs text-muted-foreground text-center leading-tight max-w-14">{label}</p>
    </div>
  );
}

export default function ClientDetail() {
  const params = useParams<{ id: string }>();
  const clientId = parseInt(params.id ?? "0");
  const [, navigate] = useLocation();
  const [openSuivi, setOpenSuivi] = useState(false);
  const [suiviForm, setSuiviForm] = useState({ avancement: "", actionsRealisees: "", prochainesEtapes: "", pointsBlockage: "" });

  const { data: client, isLoading, refetch } = trpc.clients.getById.useQuery({ id: clientId });
  const { data: dossiers = [] } = trpc.dossiers.listByClient.useQuery({ clientId });
  const { data: suivis = [], refetch: refetchSuivis } = trpc.suivi.listByClient.useQuery({ clientId });

  const utils = trpc.useUtils();
  const updateStatutMutation = trpc.clients.update.useMutation({
    onSuccess: () => { utils.clients.getById.invalidate({ id: clientId }); toast.success("Statut mis à jour"); },
  });
  const createSuiviMutation = trpc.suivi.create.useMutation({
    onSuccess: () => { setOpenSuivi(false); refetchSuivis(); toast.success("Note de suivi ajoutée"); },
  });
  const createDossierMutation = trpc.dossiers.create.useMutation({
    onSuccess: (d) => { if (d) navigate(`/dossiers/${d.id}`); },
  });

  if (isLoading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  );

  if (!client) return (
    <DashboardLayout>
      <div className="p-6 text-center text-muted-foreground">Client introuvable</div>
    </DashboardLayout>
  );

  const lastDossier = dossiers[0];
  const scoreTotal = client.scoreTotal;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Navigation */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-1.5 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Tableau de bord
          </Button>
        </div>

        {/* En-tête client */}
        <div className="flex flex-wrap items-start gap-4 justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xl font-bold text-primary">
                {(client.prenom?.[0] ?? client.nom[0]).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {client.prenom ? `${client.prenom} ${client.nom}` : client.nom}
              </h1>
              <p className="text-muted-foreground text-sm">{client.titreProjet ?? "Projet non renseigné"}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge variant="outline" className={`text-xs border ${STATUT_LABELS[client.statut]?.color ?? ""}`}>
                  {STATUT_LABELS[client.statut]?.label}
                </Badge>
                {scoreTotal !== null && scoreTotal !== undefined && (
                  <Badge variant="outline" className={`text-xs border ${scoreTotal >= 45 ? "bg-emerald-100 text-emerald-800 border-emerald-200" : scoreTotal >= 30 ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-red-100 text-red-800 border-red-200"}`}>
                    {scoreTotal.toFixed(0)}/60 — {scoreTotal >= 45 ? "Premium" : scoreTotal >= 30 ? "Accompagnement" : "À filtrer"}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={client.statut} onValueChange={(v) => updateStatutMutation.mutate({ id: clientId, statut: v as any })}>
              <SelectTrigger className="w-36 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="prospect">Prospect</SelectItem>
                <SelectItem value="en_cours">En cours</SelectItem>
                <SelectItem value="suivi">Suivi</SelectItem>
                <SelectItem value="clos">Clos</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="gap-1.5" onClick={() => navigate(`/clients/${clientId}/entretien`)}>
              <Plus className="h-4 w-4" /> Nouvel entretien
            </Button>
          </div>
        </div>

        <Tabs defaultValue="dossiers">
          <TabsList className="bg-muted">
            <TabsTrigger value="dossiers" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Dossiers ({dossiers.length})</TabsTrigger>
            <TabsTrigger value="scoring" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Scoring</TabsTrigger>
            <TabsTrigger value="suivi" className="gap-1.5"><Clock className="h-3.5 w-3.5" /> Suivi ({suivis.length})</TabsTrigger>
            <TabsTrigger value="infos" className="gap-1.5"><User className="h-3.5 w-3.5" /> Informations</TabsTrigger>
          </TabsList>

          {/* Onglet Dossiers */}
          <TabsContent value="dossiers" className="mt-4 space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">{dossiers.length} dossier(s) pour ce client</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1.5 text-xs"
                  onClick={() => createDossierMutation.mutate({ clientId, type: "entretien_initial", titre: "Entretien initial" })}>
                  <Plus className="h-3.5 w-3.5" /> Entretien initial
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs"
                  onClick={() => createDossierMutation.mutate({ clientId, type: "diagnostic", titre: "Diagnostic projet" })}>
                  <Plus className="h-3.5 w-3.5" /> Diagnostic
                </Button>
              </div>
            </div>
            {dossiers.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center">
                  <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">Aucun dossier. Démarrez un entretien.</p>
                  <Button className="mt-4 gap-2" onClick={() => navigate(`/clients/${clientId}/entretien`)}>
                    <Plus className="h-4 w-4" /> Démarrer l'entretien
                  </Button>
                </CardContent>
              </Card>
            ) : (
              dossiers.map((d) => (
                <Card key={d.id} className="cursor-pointer hover:shadow-md transition-shadow border-border"
                  onClick={() => navigate(`/dossiers/${d.id}`)}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${d.type === "diagnostic" ? "bg-purple-100" : "bg-blue-100"}`}>
                        <FileText className={`h-4 w-4 ${d.type === "diagnostic" ? "text-purple-600" : "text-blue-600"}`} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{d.titre ?? (d.type === "entretien_initial" ? "Entretien initial" : "Diagnostic projet")}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(d.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                          {" · "}
                          <Badge variant="outline" className={`text-xs ${d.statut === "finalise" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                            {d.statut === "finalise" ? "Finalisé" : "Brouillon"}
                          </Badge>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {d.scoreTotal !== null && d.scoreTotal !== undefined && (
                        <span className={`text-sm font-semibold ${d.scoreTotal >= 45 ? "text-emerald-600" : d.scoreTotal >= 30 ? "text-amber-600" : "text-red-600"}`}>
                          {d.scoreTotal.toFixed(0)}/60
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Onglet Scoring */}
          <TabsContent value="scoring" className="mt-4">
            {!lastDossier?.scoreTotal ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center">
                  <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">Aucun scoring disponible. Générez une fiche d'entretien.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Scoring SIMELE — {lastDossier.scoreTotal?.toFixed(0)}/60</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-6 justify-center py-4">
                    {[
                      { score: lastDossier.scoreClarte ?? 0, label: "Clarté projet" },
                      { score: lastDossier.scoreMarche ?? 0, label: "Marché" },
                      { score: lastDossier.scoreModeleEco ?? 0, label: "Modèle éco." },
                      { score: lastDossier.scoreFaisabilite ?? 0, label: "Faisabilité fin." },
                      { score: lastDossier.scoreMotivation ?? 0, label: "Motivation" },
                      { score: lastDossier.scoreCapacitePayer ?? 0, label: "Capacité payer" },
                    ].map((s) => <ScoreGauge key={s.label} {...s} />)}
                  </div>
                  <div className="text-center p-4 rounded-xl bg-muted/50">
                    <p className="text-3xl font-bold text-foreground">{lastDossier.scoreTotal?.toFixed(0)}<span className="text-lg text-muted-foreground">/60</span></p>
                    <Badge className={`mt-2 text-sm px-3 py-1 border ${lastDossier.scoreTotal! >= 45 ? "bg-emerald-100 text-emerald-800 border-emerald-200" : lastDossier.scoreTotal! >= 30 ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-red-100 text-red-800 border-red-200"}`}>
                      {lastDossier.scoreTotal! >= 45 ? "Client Premium" : lastDossier.scoreTotal! >= 30 ? "Accompagnement recommandé" : "À filtrer"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Onglet Suivi */}
          <TabsContent value="suivi" className="mt-4 space-y-3">
            <div className="flex justify-end">
              <Button size="sm" className="gap-1.5" onClick={() => setOpenSuivi(true)}>
                <Plus className="h-4 w-4" /> Ajouter une note
              </Button>
            </div>
            {suivis.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center">
                  <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">Aucune note de suivi pour ce client.</p>
                </CardContent>
              </Card>
            ) : (
              suivis.map((s) => (
                <Card key={s.id} className="border-border">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground font-medium">
                        {new Date(s.dateEchange).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                      </p>
                    </div>
                    {s.avancement && <div><p className="text-xs font-semibold text-foreground mb-1">Avancement</p><p className="text-sm text-muted-foreground">{s.avancement}</p></div>}
                    {s.actionsRealisees && <div><p className="text-xs font-semibold text-foreground mb-1">Actions réalisées</p><p className="text-sm text-muted-foreground">{s.actionsRealisees}</p></div>}
                    {s.prochainesEtapes && <div><p className="text-xs font-semibold text-foreground mb-1">Prochaines étapes</p><p className="text-sm text-muted-foreground">{s.prochainesEtapes}</p></div>}
                    {s.pointsBlockage && <div><p className="text-xs font-semibold text-destructive mb-1">Points de blocage</p><p className="text-sm text-muted-foreground">{s.pointsBlockage}</p></div>}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Onglet Informations */}
          <TabsContent value="infos" className="mt-4">
            <Card>
              <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
                {[
                  { icon: User, label: "Nom complet", value: `${client.prenom ?? ""} ${client.nom}`.trim() },
                  { icon: Mail, label: "Email", value: client.email ?? "—" },
                  { icon: Phone, label: "Téléphone", value: client.telephone ?? "—" },
                  { icon: Briefcase, label: "Situation", value: client.situation ?? "—" },
                  { icon: TrendingUp, label: "Secteur d'activité", value: client.secteurActivite ?? "—" },
                  { icon: Calendar, label: "Date de création", value: new Date(client.createdAt).toLocaleDateString("fr-FR") },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
                    </div>
                  </div>
                ))}
                {client.descriptionProjet && (
                  <div className="col-span-full flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Description du projet</p>
                      <p className="text-sm text-foreground mt-0.5">{client.descriptionProjet}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal suivi */}
      <Dialog open={openSuivi} onOpenChange={setOpenSuivi}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Ajouter une note de suivi</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            {[
              { key: "avancement", label: "Avancement", placeholder: "Décrivez l'avancement du projet..." },
              { key: "actionsRealisees", label: "Actions réalisées", placeholder: "Listez les actions effectuées..." },
              { key: "prochainesEtapes", label: "Prochaines étapes", placeholder: "Quelles sont les prochaines actions ?" },
              { key: "pointsBlockage", label: "Points de blocage", placeholder: "Y a-t-il des obstacles ?" },
            ].map(({ key, label, placeholder }) => (
              <div key={key} className="space-y-1.5">
                <Label>{label}</Label>
                <Textarea placeholder={placeholder} rows={2}
                  value={suiviForm[key as keyof typeof suiviForm]}
                  onChange={(e) => setSuiviForm(f => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setOpenSuivi(false)}>Annuler</Button>
              <Button className="flex-1" disabled={createSuiviMutation.isPending}
                onClick={() => createSuiviMutation.mutate({ clientId, ...suiviForm })}>
                {createSuiviMutation.isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
