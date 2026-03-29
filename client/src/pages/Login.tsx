import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Loader2, Building2, Shield, FileText, BarChart3 } from "lucide-react";

export default function Login() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isAuthenticated) navigate("/");
  }, [isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Panneau gauche — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12"
        style={{ background: "oklch(0.20 0.06 245)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-lg leading-tight">Cabinet SIMELE</p>
            <p className="text-white/60 text-xs">Conseil & Accompagnement</p>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              Gérez vos entretiens clients avec l'intelligence artificielle
            </h1>
            <p className="text-white/70 text-lg leading-relaxed">
              Structurez vos notes, générez des fiches professionnelles et suivez l'avancement de vos dossiers en quelques clics.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {[
              { icon: FileText, label: "Fiches d'entretien automatiques", desc: "Structuration IA selon la méthodologie SIMELE" },
              { icon: BarChart3, label: "Scoring automatique /60", desc: "Évaluation objective de chaque projet" },
              { icon: Shield, label: "Données sécurisées", desc: "Accès restreint aux conseillers autorisés" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="h-4 w-4 text-white/80" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{label}</p>
                  <p className="text-white/50 text-xs mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/30 text-sm">© 2025 Cabinet SIMELE — Tous droits réservés</p>
      </div>

      {/* Panneau droit — connexion */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold text-lg leading-tight">Cabinet SIMELE</p>
              <p className="text-muted-foreground text-xs">Conseil & Accompagnement</p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground">Connexion</h2>
            <p className="text-muted-foreground mt-2">
              Accédez à votre espace conseiller pour gérer vos dossiers clients.
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-8 shadow-sm space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                Authentification sécurisée via Manus OAuth
              </p>
            </div>

            <Button
              className="w-full h-12 text-base font-medium"
              onClick={() => { window.location.href = getLoginUrl(); }}
            >
              Se connecter
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Accès réservé aux conseillers du Cabinet SIMELE
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
