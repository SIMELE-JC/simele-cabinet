import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Shield, FileText, BarChart3, Loader2, Eye, EyeOff } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function Login() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const utils = trpc.useUtils();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login" ? { email, password } : { email, password, name };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erreur de connexion"); return; }
      await utils.auth.me.invalidate();
      navigate("/");
    } catch {
      setError("Erreur réseau, veuillez réessayer");
    } finally {
      setLoading(false);
    }
  };

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
              Structurez vos notes, générez des fiches professionnelles et suivez l'avancement de vos dossiers.
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

      {/* Panneau droit — formulaire */}
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
            <h2 className="text-2xl font-bold text-foreground">
              {mode === "login" ? "Connexion" : "Créer un compte"}
            </h2>
            <p className="text-muted-foreground mt-2">
              {mode === "login" ? "Accédez à votre espace conseiller." : "Créez votre accès conseiller."}
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === "register" && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nom complet</Label>
                  <Input id="name" value={name} onChange={e => setName(e.target.value)}
                    placeholder="Jean-Christophe..." required autoComplete="name" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="ccs.guadeloupe@outlook.fr" required autoComplete="email" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"}
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" required autoComplete={mode === "login" ? "current-password" : "new-password"}
                    className="pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full h-11 text-base font-medium" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {mode === "login" ? "Se connecter" : "Créer mon compte"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "login" ? (
                <>Pas encore de compte ?{" "}
                  <button onClick={() => { setMode("register"); setError(""); }}
                    className="text-primary hover:underline font-medium">
                    Créer un compte
                  </button>
                </>
              ) : (
                <>Déjà un compte ?{" "}
                  <button onClick={() => { setMode("login"); setError(""); }}
                    className="text-primary hover:underline font-medium">
                    Se connecter
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
