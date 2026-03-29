import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import type { Client } from "../../../drizzle/schema";
import {
  Users,
  Plus,
  Search,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Star,
  ChevronRight,
  UserPlus,
  BarChart3,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

type StatutFilter = "all" | "prospect" | "en_cours" | "suivi" | "clos";

const STATUT_LABELS: Record<string, { label: string; color: string }> = {
  prospect: { label: "Prospect", color: "bg-blue-100 text-blue-700 border-blue-200" },
  en_cours: { label: "En cours", color: "bg-amber-100 text-amber-700 border-amber-200" },
  suivi: { label: "Suivi", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  clos: { label: "Clos", color: "bg-gray-100 text-gray-600 border-gray-200" },
};

const SCORE_BADGE: Record<string, string> = {
  client_premium: "bg-emerald-100 text-emerald-800 border-emerald-200",
  accompagnement: "bg-amber-100 text-amber-800 border-amber-200",
  a_filtrer: "bg-red-100 text-red-800 border-red-200",
};

const SCORE_LABEL: Record<string, string> = {
  client_premium: "Premium",
  accompagnement: "Accompagnement",
  a_filtrer: "À filtrer",
};

function ScoreBar({ score }: { score: number | null }) {
  if (score === null || score === undefined) return <span className="text-muted-foreground text-xs">—</span>;
  const pct = Math.min(100, (score / 60) * 100);
  const color = score >= 45 ? "bg-emerald-500" : score >= 30 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium tabular-nums">{score.toFixed(0)}/60</span>
    </div>
  );
}

export default function Dashboard() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState<StatutFilter>("all");
  const [scoreMin, setScoreMin] = useState<number | undefined>();
  const [scoreMax, setScoreMax] = useState<number | undefined>();
  const [openNewClient, setOpenNewClient] = useState(false);

  const { data: stats } = trpc.clients.stats.useQuery();
  const { data: clients = [], isLoading, refetch } = trpc.clients.list.useQuery({
    statut: statutFilter === "all" ? undefined : statutFilter,
    search: search || undefined,
    scoreMin,
    scoreMax,
  });

  const utils = trpc.useUtils();
  const createClientMutation = trpc.clients.create.useMutation({
    onSuccess: (newClient) => {
      toast.success("Client créé avec succès");
      setOpenNewClient(false);
      utils.clients.list.invalidate();
      utils.clients.stats.invalidate();
      if (newClient) navigate(`/clients/${newClient.id}/entretien`);
    },
    onError: (err) => toast.error(`Erreur : ${err.message}`),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<{
    nom: string; prenom: string; email: string; telephone: string;
    situation: string; titreProjet: string;
  }>();

  const onCreateClient = handleSubmit((data) => {
    createClientMutation.mutate(data);
  });

  const statCards = [
    { label: "Total clients", value: stats?.total ?? 0, icon: Users, color: "text-primary", bg: "bg-primary/10" },
    { label: "Prospects", value: stats?.prospects ?? 0, icon: UserPlus, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "En cours", value: stats?.enCours ?? 0, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Suivis actifs", value: stats?.suivis ?? 0, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Gestion des dossiers clients SIMELE</p>
          </div>
          <Dialog open={openNewClient} onOpenChange={setOpenNewClient}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nouveau client
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Créer un nouveau dossier client</DialogTitle>
              </DialogHeader>
              <form onSubmit={onCreateClient} className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="nom">Nom *</Label>
                    <Input id="nom" {...register("nom", { required: true })} placeholder="Dupont" />
                    {errors.nom && <p className="text-xs text-destructive">Champ requis</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="prenom">Prénom</Label>
                    <Input id="prenom" {...register("prenom")} placeholder="Jean" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" {...register("email")} placeholder="jean@exemple.fr" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="telephone">Téléphone</Label>
                    <Input id="telephone" {...register("telephone")} placeholder="06 12 34 56 78" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="situation">Situation professionnelle</Label>
                  <Input id="situation" {...register("situation")} placeholder="Salarié, demandeur d'emploi, étudiant..." />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="titreProjet">Titre du projet</Label>
                  <Input id="titreProjet" {...register("titreProjet")} placeholder="Ex : Création d'une boulangerie artisanale" />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => { setOpenNewClient(false); reset(); }}>
                    Annuler
                  </Button>
                  <Button type="submit" className="flex-1" disabled={createClientMutation.isPending}>
                    {createClientMutation.isPending ? "Création..." : "Créer et démarrer l'entretien"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label} className="border-border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">{label}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filtres */}
        <Card className="border-border shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un client ou projet..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={statutFilter} onValueChange={(v) => setStatutFilter(v as StatutFilter)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="prospect">Prospect</SelectItem>
                  <SelectItem value="en_cours">En cours</SelectItem>
                  <SelectItem value="suivi">Suivi</SelectItem>
                  <SelectItem value="clos">Clos</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Input
                  type="number" placeholder="Score min" className="w-28"
                  onChange={(e) => setScoreMin(e.target.value ? Number(e.target.value) : undefined)}
                />
                <span className="text-muted-foreground text-sm">—</span>
                <Input
                  type="number" placeholder="Score max" className="w-28"
                  onChange={(e) => setScoreMax(e.target.value ? Number(e.target.value) : undefined)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liste clients */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3 px-6 pt-5">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Dossiers clients
              <Badge variant="secondary" className="ml-1 text-xs">{clients.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-muted-foreground">Chargement...</p>
                </div>
              </div>
            ) : clients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="font-medium text-foreground">Aucun client trouvé</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {search || statutFilter !== "all" ? "Modifiez vos filtres" : "Créez votre premier dossier client"}
                </p>
                {!search && statutFilter === "all" && (
                  <Button className="mt-4 gap-2" onClick={() => setOpenNewClient(true)}>
                    <Plus className="h-4 w-4" /> Nouveau client
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {clients.map((client: Client) => (
                  <div
                    key={client.id}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-muted/40 cursor-pointer transition-colors group"
                    onClick={() => navigate(`/clients/${client.id}`)}
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-primary">
                        {(client.prenom?.[0] ?? client.nom[0]).toUpperCase()}
                      </span>
                    </div>

                    {/* Infos */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground truncate">
                          {client.prenom ? `${client.prenom} ${client.nom}` : client.nom}
                        </p>
                        <Badge variant="outline" className={`text-xs border ${STATUT_LABELS[client.statut]?.color ?? ""}`}>
                          {STATUT_LABELS[client.statut]?.label ?? client.statut}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {client.titreProjet ?? "Projet non renseigné"}
                        {client.secteurActivite && ` · ${client.secteurActivite}`}
                      </p>
                    </div>

                    {/* Score */}
                    <div className="hidden sm:flex flex-col items-end gap-1.5">
                      <ScoreBar score={client.scoreTotal ?? null} />
                    </div>

                    {/* Date */}
                    <div className="hidden md:block text-right">
                      <p className="text-xs text-muted-foreground">
                        {new Date(client.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    </div>

                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
