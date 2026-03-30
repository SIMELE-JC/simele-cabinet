import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  User, Briefcase, Target, Users, Banknote, TrendingUp,
  Flame, DollarSign, Stethoscope, Compass, ChevronLeft,
  Download, Save, CheckCircle2,
} from "lucide-react";

interface FicheEntretien {
  nom: string; telephone: string; email: string;
  situation: "salarie" | "demandeur" | "entrepreneur" | "";
  projetPhrase: string; stade: "idee" | "en_cours" | "lance" | "";
  objectif: "creation" | "financement" | "structuration" | "autre" | "";
  objectifAutre: string;
  situationActuelle: "seul" | "associe" | "deja_entreprise" | "";
  contraintesFinancieres: boolean; contraintesTemps: boolean; contraintesAutres: string;
  budgetEstime: string; apport: string; financementSouhaite: string;
  dejaDemarcheBanque: boolean; aucunContact: boolean;
  avancement: "rien_fait" | "reflexion" | "debut_structuration" | "deja_avance" | "";
  tempsDispoSemaine: string; echeance: string;
  actionsEnPlace: boolean; aucuneAction: boolean;
  capacite: "oui" | "hesitant" | "non" | "";
  diagnostic: "flou" | "structurable" | "pret" | "";
  orientationCoaching: boolean; orientationPackCreation: boolean;
  orientationPackFinancement: boolean; orientationARevoir: boolean;
  scoreClarte: number; scoreFaisabilite: number; scoreMotivation: number; scoreBudget: number;
}

const EMPTY: FicheEntretien = {
  nom:"",telephone:"",email:"",situation:"",projetPhrase:"",stade:"",
  objectif:"",objectifAutre:"",situationActuelle:"",contraintesFinancieres:false,
  contraintesTemps:false,contraintesAutres:"",budgetEstime:"",apport:"",
  financementSouhaite:"",dejaDemarcheBanque:false,aucunContact:false,avancement:"",
  tempsDispoSemaine:"",echeance:"",actionsEnPlace:false,aucuneAction:false,
  capacite:"",diagnostic:"",orientationCoaching:false,orientationPackCreation:false,
  orientationPackFinancement:false,orientationARevoir:false,
  scoreClarte:0,scoreFaisabilite:0,scoreMotivation:0,scoreBudget:0,
};

function SectionCard({icon:Icon,number,title,children}:{icon:React.ComponentType<{className?:string}>;number:number;title:string;children:React.ReactNode}) {
  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3 pt-5 px-6">
        <CardTitle className="flex items-center gap-3 text-base font-semibold">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-primary">{number}</span>
          </div>
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6 space-y-4">{children}</CardContent>
    </Card>
  );
}

function RadioGroup({label,options,value,onChange}:{label?:string;options:{value:string;label:string}[];value:string;onChange:(v:string)=>void}) {
  return (
    <div className="space-y-1.5">
      {label && <Label className="text-sm text-muted-foreground">{label}</Label>}
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button key={opt.value} type="button" onClick={()=>onChange(value===opt.value?"":opt.value)}
            className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${value===opt.value?"bg-primary text-primary-foreground border-primary":"bg-background border-border text-foreground hover:border-primary/50 hover:bg-primary/5"}`}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function CheckboxItem({checked,onChange,label}:{checked:boolean;onChange:(v:boolean)=>void;label:string}) {
  return (
    <button type="button" onClick={()=>onChange(!checked)}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${checked?"bg-primary/10 border-primary text-primary":"bg-background border-border text-foreground hover:border-primary/30"}`}>
      <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${checked?"bg-primary border-primary":"border-muted-foreground"}`}>
        {checked && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
      </div>
      {label}
    </button>
  );
}

function ScoreInput({label,value,onChange}:{label:string;value:number;onChange:(v:number)=>void}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm font-medium flex-1">{label}</span>
      <div className="flex items-center gap-1.5">
        {[...Array(11)].map((_,i)=>(
          <button key={i} type="button" onClick={()=>onChange(i)}
            className={`w-7 h-7 rounded text-xs font-medium transition-all ${i>0&&i<=value?i<=3?"bg-red-500 text-white":i<=6?"bg-amber-500 text-white":"bg-emerald-500 text-white":"bg-muted text-muted-foreground hover:bg-muted/80"} ${i===value?"ring-2 ring-offset-1 ring-primary scale-110":""}`}>
            {i}
          </button>
        ))}
        <span className="text-sm font-bold tabular-nums w-10 text-right">{value}/10</span>
      </div>
    </div>
  );
}

export default function EntretienInitial() {
  const params = useParams<{clientId?:string}>();
  const [,navigate] = useLocation();
  const clientId = params.clientId ? parseInt(params.clientId) : undefined;
  const [fiche,setFiche] = useState<FicheEntretien>(EMPTY);
  const [saved,setSaved] = useState(false);

  const {data:client} = trpc.clients.getById.useQuery({id:clientId!},{enabled:!!clientId});
  const saveMutation = trpc.ficheInitiale.save.useMutation({
    onSuccess:()=>{toast.success("Fiche sauvegardée dans le dossier client ✓");setSaved(true);},
    onError:(err)=>toast.error(`Erreur : ${err.message}`),
  });

  const set = <K extends keyof FicheEntretien>(key:K,value:FicheEntretien[K]) => setFiche(prev=>({...prev,[key]:value}));
  const scoreTotal = fiche.scoreClarte+fiche.scoreFaisabilite+fiche.scoreMotivation+fiche.scoreBudget;
  const scorePct = Math.round((scoreTotal/40)*100);
  const scoreColor = scoreTotal>=30?"text-emerald-600":scoreTotal>=20?"text-amber-600":"text-red-600";
  const scoreBarColor = scoreTotal>=30?"bg-emerald-500":scoreTotal>=20?"bg-amber-500":"bg-red-500";

  const handleSave = () => {
    if (!clientId){toast.error("Aucun client sélectionné");return;}
    const contraintes = [fiche.contraintesFinancieres&&"financières",fiche.contraintesTemps&&"temps",fiche.contraintesAutres&&fiche.contraintesAutres].filter(Boolean) as string[];
    const orientations = [fiche.orientationCoaching&&"coaching",fiche.orientationPackCreation&&"pack_creation",fiche.orientationPackFinancement&&"pack_financement",fiche.orientationARevoir&&"a_revoir"].filter(Boolean) as string[];
    saveMutation.mutate({
      clientId,nom:fiche.nom,telephone:fiche.telephone,email:fiche.email,situation:fiche.situation,
      projetDescription:fiche.projetPhrase,stade:fiche.stade,objectifPrincipal:fiche.objectif,
      objectifAutre:fiche.objectifAutre,situationActuelle:fiche.situationActuelle,
      contraintes:JSON.stringify(contraintes),budgetEstimé:fiche.budgetEstime,apport:fiche.apport,
      financement:fiche.financementSouhaite,démarrchéBanque:fiche.dejaDemarcheBanque,
      aucunContact:fiche.aucunContact,avancement:fiche.avancement,tempsDisponible:fiche.tempsDispoSemaine,
      échéance:fiche.echeance,actionsEnPlace:fiche.actionsEnPlace,capacité:fiche.capacite,
      diagnostic:fiche.diagnostic,orientation:JSON.stringify(orientations),
      scoreClarte:fiche.scoreClarte,scoreFaisabilite:fiche.scoreFaisabilite,
      scoreMotivation:fiche.scoreMotivation,scoreBudget:fiche.scoreBudget,scoreTotal,
    });
  };

  const handleExportPDF = () => {
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><title>Fiche – ${fiche.nom||"Client"}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:11px;color:#1a1a2e;padding:20px}
.header{text-align:center;margin-bottom:20px;border-bottom:3px solid #1a1a2e;padding-bottom:12px}
.header h1{font-size:18px;font-weight:700}.header p{font-size:10px;color:#666;margin-top:4px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
.section{border:1px solid #ddd;border-radius:6px;padding:10px;break-inside:avoid}
.stitle{font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:1px solid #eee;padding-bottom:5px;margin-bottom:8px}
.n{background:#1a1a2e;color:#fff;border-radius:50%;width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;font-size:9px;margin-right:5px}
.fl{margin-bottom:5px}.fl-l{font-size:9px;color:#666;text-transform:uppercase}.fl-v{font-size:11px;font-weight:500;border-bottom:1px dotted #ccc;min-height:16px}
.chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}.chip{background:#e8e8f0;border-radius:3px;padding:2px 6px;font-size:9px;font-weight:600}.chip.on{background:#1a1a2e;color:#fff}
.stbl{width:100%;border-collapse:collapse}.stbl td{padding:4px 6px;border:1px solid #eee;font-size:10px}.stbl td:last-child{text-align:center;font-weight:700}
.total{font-size:18px;font-weight:800;text-align:center;margin-top:8px;color:${scoreTotal>=30?"#059669":scoreTotal>=20?"#d97706":"#dc2626"}}
.footer{margin-top:16px;border-top:1px solid #eee;padding-top:8px;font-size:9px;color:#999;display:flex;justify-content:space-between}
</style></head><body>
<div class="header"><h1>Cabinet de Conseils SIMELE</h1><p>Fiche d'Entretien Initial — ${new Date().toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"})}</p></div>
<div class="grid2">
<div class="section"><div class="stitle"><span class="n">1</span>Identité</div>
<div class="fl"><div class="fl-l">Nom</div><div class="fl-v">${fiche.nom||"—"}</div></div>
<div class="fl"><div class="fl-l">Téléphone</div><div class="fl-v">${fiche.telephone||"—"}</div></div>
<div class="fl"><div class="fl-l">Email</div><div class="fl-v">${fiche.email||"—"}</div></div>
<div class="chips"><span class="chip ${fiche.situation==="salarie"?"on":""}">Salarié</span><span class="chip ${fiche.situation==="demandeur"?"on":""}">Demandeur</span><span class="chip ${fiche.situation==="entrepreneur"?"on":""}">Entrepreneur</span></div></div>
<div class="section"><div class="stitle"><span class="n">2</span>Projet</div>
<div class="fl"><div class="fl-l">Projet en une phrase</div><div class="fl-v" style="min-height:32px">${fiche.projetPhrase||"—"}</div></div>
<div class="chips"><span class="chip ${fiche.stade==="idee"?"on":""}">Idée</span><span class="chip ${fiche.stade==="en_cours"?"on":""}">En cours</span><span class="chip ${fiche.stade==="lance"?"on":""}">Lancé</span></div></div></div>
<div class="grid2">
<div class="section"><div class="stitle"><span class="n">3</span>Objectif</div>
<div class="chips"><span class="chip ${fiche.objectif==="creation"?"on":""}">Création</span><span class="chip ${fiche.objectif==="financement"?"on":""}">Financement</span><span class="chip ${fiche.objectif==="structuration"?"on":""}">Structuration</span><span class="chip ${fiche.objectif==="autre"?"on":""}">Autre</span></div></div>
<div class="section"><div class="stitle"><span class="n">4</span>Situation actuelle</div>
<div class="chips"><span class="chip ${fiche.situationActuelle==="seul"?"on":""}">Seul</span><span class="chip ${fiche.situationActuelle==="associe"?"on":""}">Associé</span><span class="chip ${fiche.situationActuelle==="deja_entreprise"?"on":""}">Déjà entreprise</span></div>
<div class="chips" style="margin-top:6px"><span class="chip ${fiche.contraintesFinancieres?"on":""}">Financières</span><span class="chip ${fiche.contraintesTemps?"on":""}">Temps</span></div></div></div>
<div class="section" style="margin-bottom:12px"><div class="stitle"><span class="n">5</span>Financement 🔥</div>
<div class="grid2" style="margin:0;gap:8px">
<div class="fl"><div class="fl-l">Budget estimé</div><div class="fl-v">${fiche.budgetEstime||"—"}</div></div>
<div class="fl"><div class="fl-l">Apport</div><div class="fl-v">${fiche.apport||"—"}</div></div>
<div class="fl"><div class="fl-l">Financement souhaité</div><div class="fl-v">${fiche.financementSouhaite||"—"}</div></div>
<div class="chips"><span class="chip ${fiche.dejaDemarcheBanque?"on":""}">Déjà démarché banque</span><span class="chip ${fiche.aucunContact?"on":""}">Aucun contact</span></div></div></div>
<div class="grid2">
<div class="section"><div class="stitle"><span class="n">6</span>Avancement</div>
<div class="chips"><span class="chip ${fiche.avancement==="rien_fait"?"on":""}">Rien fait</span><span class="chip ${fiche.avancement==="reflexion"?"on":""}">Réflexion</span><span class="chip ${fiche.avancement==="debut_structuration"?"on":""}">Début structuration</span><span class="chip ${fiche.avancement==="deja_avance"?"on":""}">Déjà avancé</span></div></div>
<div class="section"><div class="stitle"><span class="n">7</span>Motivation ⚠️</div>
<div class="fl"><div class="fl-l">Temps dispo / semaine</div><div class="fl-v">${fiche.tempsDispoSemaine||"—"}</div></div>
<div class="fl"><div class="fl-l">Échéance</div><div class="fl-v">${fiche.echeance||"—"}</div></div>
<div class="chips"><span class="chip ${fiche.actionsEnPlace?"on":""}">Actions en place</span><span class="chip ${fiche.aucuneAction?"on":""}">Aucune action</span></div></div></div>
<div class="grid2" style="margin-top:12px">
<div class="section"><div class="stitle"><span class="n">8</span>Capacité à investir</div>
<div class="chips"><span class="chip ${fiche.capacite==="oui"?"on":""}">Oui</span><span class="chip ${fiche.capacite==="hesitant"?"on":""}">Hésitant</span><span class="chip ${fiche.capacite==="non"?"on":""}">Non</span></div></div>
<div class="section"><div class="stitle"><span class="n">9</span>Diagnostic express 🔥</div>
<div class="chips"><span class="chip ${fiche.diagnostic==="flou"?"on":""}">Flou</span><span class="chip ${fiche.diagnostic==="structurable"?"on":""}">Structurable</span><span class="chip ${fiche.diagnostic==="pret"?"on":""}">Prêt</span></div></div></div>
<div class="section" style="margin-top:12px"><div class="stitle"><span class="n">10</span>Orientation</div>
<div class="chips"><span class="chip ${fiche.orientationCoaching?"on":""}">Coaching</span><span class="chip ${fiche.orientationPackCreation?"on":""}">Pack Création</span><span class="chip ${fiche.orientationPackFinancement?"on":""}">Pack Financement</span><span class="chip ${fiche.orientationARevoir?"on":""}">À revoir</span></div></div>
<div class="section" style="margin-top:12px"><div class="stitle">🧮 Score rapide</div>
<table class="stbl"><tr><td>Clarté</td><td>${fiche.scoreClarte}/10</td></tr><tr><td>Faisabilité</td><td>${fiche.scoreFaisabilite}/10</td></tr><tr><td>Motivation</td><td>${fiche.scoreMotivation}/10</td></tr><tr><td>Budget</td><td>${fiche.scoreBudget}/10</td></tr></table>
<div class="total">TOTAL : ${scoreTotal}/40</div></div>
<div class="footer"><span>Cabinet de Conseils SIMELE — ccs.guadeloupe@outlook.fr</span><span>Généré le ${new Date().toLocaleDateString("fr-FR")}</span></div>
</body></html>`;
    const blob = new Blob([html],{type:"text/html"});
    const url = URL.createObjectURL(blob);
    const win = window.open(url,"_blank");
    if(win){win.onload=()=>{win.print();URL.revokeObjectURL(url);};}
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={()=>navigate(clientId?`/clients/${clientId}`:"/") } className="gap-1">
              <ChevronLeft className="h-4 w-4"/>Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Entretien Initial</h1>
              <p className="text-muted-foreground text-sm mt-0.5">{client?`${client.prenom?`${client.prenom} ${client.nom}`:client.nom}`:"Formulaire libre"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportPDF} className="gap-2"><Download className="h-4 w-4"/>Exporter PDF</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending||!clientId} className="gap-2">
              <Save className="h-4 w-4"/>{saveMutation.isPending?"Sauvegarde...":saved?"Sauvegardé ✓":"Sauvegarder"}
            </Button>
          </div>
        </div>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Score rapide</p>
                <p className={`text-3xl font-bold tabular-nums ${scoreColor}`}>{scoreTotal}<span className="text-lg font-normal text-muted-foreground">/40</span></p>
              </div>
              <div className="flex-1 max-w-xs">
                <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${scoreBarColor}`} style={{width:`${scorePct}%`}}/>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{scoreTotal>=30?"🟢 Dossier solide":scoreTotal>=20?"🟡 À accompagner":scoreTotal>0?"🔴 À filtrer":"Remplissez le score ci-dessous"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <SectionCard icon={User} number={1} title="Identité">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Nom</Label><Input value={fiche.nom} onChange={e=>set("nom",e.target.value)} placeholder="Nom du client"/></div>
            <div className="space-y-1.5"><Label>Téléphone</Label><Input value={fiche.telephone} onChange={e=>set("telephone",e.target.value)} placeholder="06 12 34 56 78"/></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={fiche.email} onChange={e=>set("email",e.target.value)} placeholder="email@exemple.fr"/></div>
            <RadioGroup label="Situation" value={fiche.situation} onChange={v=>set("situation",v as any)} options={[{value:"salarie",label:"Salarié"},{value:"demandeur",label:"Demandeur d'emploi"},{value:"entrepreneur",label:"Entrepreneur"}]}/>
          </div>
        </SectionCard>

        <SectionCard icon={Briefcase} number={2} title="Projet (3 lignes max)">
          <div className="space-y-1.5"><Label>Projet en une phrase</Label><Textarea value={fiche.projetPhrase} onChange={e=>set("projetPhrase",e.target.value)} placeholder="Décrivez le projet en une phrase claire..." rows={3}/></div>
          <RadioGroup label="Stade" value={fiche.stade} onChange={v=>set("stade",v as any)} options={[{value:"idee",label:"Idée"},{value:"en_cours",label:"En cours"},{value:"lance",label:"Lancé"}]}/>
        </SectionCard>

        <SectionCard icon={Target} number={3} title="Objectif principal">
          <RadioGroup value={fiche.objectif} onChange={v=>set("objectif",v as any)} options={[{value:"creation",label:"Création"},{value:"financement",label:"Financement"},{value:"structuration",label:"Structuration"},{value:"autre",label:"Autre"}]}/>
          {fiche.objectif==="autre"&&<Input value={fiche.objectifAutre} onChange={e=>set("objectifAutre",e.target.value)} placeholder="Précisez l'objectif..."/>}
        </SectionCard>

        <SectionCard icon={Users} number={4} title="Situation actuelle">
          <RadioGroup value={fiche.situationActuelle} onChange={v=>set("situationActuelle",v as any)} options={[{value:"seul",label:"Seul"},{value:"associe",label:"Associé"},{value:"deja_entreprise",label:"Déjà entreprise"}]}/>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Contraintes</Label>
            <div className="flex flex-wrap gap-2">
              <CheckboxItem checked={fiche.contraintesFinancieres} onChange={v=>set("contraintesFinancieres",v)} label="Financières"/>
              <CheckboxItem checked={fiche.contraintesTemps} onChange={v=>set("contraintesTemps",v)} label="Temps"/>
            </div>
            <Input value={fiche.contraintesAutres} onChange={e=>set("contraintesAutres",e.target.value)} placeholder="Autres contraintes..."/>
          </div>
        </SectionCard>

        <SectionCard icon={Banknote} number={5} title="Financement 🔥">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5"><Label>Budget estimé</Label><Input value={fiche.budgetEstime} onChange={e=>set("budgetEstime",e.target.value)} placeholder="Ex : 50 000 €"/></div>
            <div className="space-y-1.5"><Label>Apport</Label><Input value={fiche.apport} onChange={e=>set("apport",e.target.value)} placeholder="Ex : 15 000 €"/></div>
            <div className="space-y-1.5"><Label>Financement souhaité</Label><Input value={fiche.financementSouhaite} onChange={e=>set("financementSouhaite",e.target.value)} placeholder="Prêt bancaire, BPI..."/></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <CheckboxItem checked={fiche.dejaDemarcheBanque} onChange={v=>set("dejaDemarcheBanque",v)} label="Déjà démarché banque"/>
            <CheckboxItem checked={fiche.aucunContact} onChange={v=>set("aucunContact",v)} label="Aucun contact"/>
          </div>
        </SectionCard>

        <SectionCard icon={TrendingUp} number={6} title="Avancement">
          <RadioGroup value={fiche.avancement} onChange={v=>set("avancement",v as any)} options={[{value:"rien_fait",label:"Rien fait"},{value:"reflexion",label:"Réflexion"},{value:"debut_structuration",label:"Début structuration"},{value:"deja_avance",label:"Déjà avancé"}]}/>
        </SectionCard>

        <SectionCard icon={Flame} number={7} title="Motivation ⚠️ (filtre)">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Temps disponible / semaine</Label><Input value={fiche.tempsDispoSemaine} onChange={e=>set("tempsDispoSemaine",e.target.value)} placeholder="Ex : 10h / semaine"/></div>
            <div className="space-y-1.5"><Label>Échéance envisagée</Label><Input value={fiche.echeance} onChange={e=>set("echeance",e.target.value)} placeholder="Ex : Dans 6 mois"/></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <CheckboxItem checked={fiche.actionsEnPlace} onChange={v=>set("actionsEnPlace",v)} label="Actions déjà mises en place"/>
            <CheckboxItem checked={fiche.aucuneAction} onChange={v=>set("aucuneAction",v)} label="Aucune action"/>
          </div>
        </SectionCard>

        <SectionCard icon={DollarSign} number={8} title="Capacité à investir">
          <RadioGroup value={fiche.capacite} onChange={v=>set("capacite",v as any)} options={[{value:"oui",label:"Oui"},{value:"hesitant",label:"Hésitant"},{value:"non",label:"Non"}]}/>
        </SectionCard>

        <SectionCard icon={Stethoscope} number={9} title="Ton diagnostic express 🔥">
          <RadioGroup value={fiche.diagnostic} onChange={v=>set("diagnostic",v as any)} options={[{value:"flou",label:"Flou"},{value:"structurable",label:"Structurable"},{value:"pret",label:"Prêt"}]}/>
        </SectionCard>

        <SectionCard icon={Compass} number={10} title="Orientation">
          <div className="flex flex-wrap gap-2">
            <CheckboxItem checked={fiche.orientationCoaching} onChange={v=>set("orientationCoaching",v)} label="Coaching"/>
            <CheckboxItem checked={fiche.orientationPackCreation} onChange={v=>set("orientationPackCreation",v)} label="Pack Création"/>
            <CheckboxItem checked={fiche.orientationPackFinancement} onChange={v=>set("orientationPackFinancement",v)} label="Pack Financement"/>
            <CheckboxItem checked={fiche.orientationARevoir} onChange={v=>set("orientationARevoir",v)} label="À revoir"/>
          </div>
        </SectionCard>

        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3 pt-5 px-6">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">🧮 Score rapide<Badge variant="secondary" className="ml-1">{scoreTotal}/40</Badge></CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6 space-y-5">
            <ScoreInput label="Clarté" value={fiche.scoreClarte} onChange={v=>set("scoreClarte",v)}/>
            <ScoreInput label="Faisabilité" value={fiche.scoreFaisabilite} onChange={v=>set("scoreFaisabilite",v)}/>
            <ScoreInput label="Motivation" value={fiche.scoreMotivation} onChange={v=>set("scoreMotivation",v)}/>
            <ScoreInput label="Budget" value={fiche.scoreBudget} onChange={v=>set("scoreBudget",v)}/>
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Total</span>
                <span className={`text-2xl font-bold tabular-nums ${scoreColor}`}>{scoreTotal}<span className="text-base font-normal text-muted-foreground">/40</span></span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden mt-2">
                <div className={`h-full rounded-full transition-all duration-500 ${scoreBarColor}`} style={{width:`${scorePct}%`}}/>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pb-8">
          <Button variant="outline" onClick={handleExportPDF} className="gap-2"><Download className="h-4 w-4"/>Exporter PDF</Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending||!clientId} size="lg" className="gap-2">
            <Save className="h-4 w-4"/>{saveMutation.isPending?"Sauvegarde en cours...":saved?"✓ Sauvegardé dans le dossier":"Sauvegarder dans le dossier client"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
