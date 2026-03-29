import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import ClientDetail from "./pages/ClientDetail";
import NouvelEntretien from "./pages/NouvelEntretien";
import DossierDetail from "./pages/DossierDetail";
import Login from "./pages/Login";
import { useAuth } from "./_core/hooks/useAuth";
import { getLoginUrl } from "./const";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import React from "react";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  React.useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  }, [isAuthenticated, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Redirection...</p>
        </div>
      </div>
    );
  }

  return <Component />;
}

const ProtectedDashboard = () => <ProtectedRoute component={Dashboard} />;
const ProtectedClientDetail = () => <ProtectedRoute component={ClientDetail} />;
const ProtectedNouvelEntretien = () => <ProtectedRoute component={NouvelEntretien} />;
const ProtectedDossierDetail = () => <ProtectedRoute component={DossierDetail} />;

function Router() {
  return (
    <Switch>
      <Route path="/" component={ProtectedDashboard} />
      <Route path="/clients/:id" component={ProtectedClientDetail} />
      <Route path="/clients/:clientId/entretien" component={ProtectedNouvelEntretien} />
      <Route path="/dossiers/:id" component={ProtectedDossierDetail} />
      <Route path="/login" component={Login} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
