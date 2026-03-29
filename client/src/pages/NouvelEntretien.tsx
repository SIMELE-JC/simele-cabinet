import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Streamdown } from "streamdown";
import {
  ArrowLeft, Send, Mic, MicOff, FileText, Wand2,
  Loader2, Bot, User, StopCircle, Volume2, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

export default function NouvelEntretien() {
  const params = useParams<{ clientId: string }>();
  const clientId = parseInt(params.clientId ?? "0");
  const [, navigate] = useLocation();

  const [dossierId, setDossierId] = useState<number | null>(null);
  const [typeEntretien, setTypeEntretien] = useState<"entretien_initial" | "diagnostic">("entretien_initial");
  const [notes, setNotes] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [transcription, setTranscription] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data: client } = trpc.clients.getById.useQuery({ id: clientId });
  const { data: messages = [], refetch: refetchMessages } = trpc.chat.getMessages.useQuery(
    { dossierId: dossierId ?? 0 },
    { enabled: !!dossierId }
  );

  const utils = trpc.useUtils();

  const createDossierMutation = trpc.dossiers.create.useMutation({
    onSuccess: (d) => { if (d) setDossierId(d.id); },
  });

  const sendMessageMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: () => {
      setChatInput("");
      utils.chat.getMessages.invalidate({ dossierId: dossierId ?? 0 });
    },
    onError: (err) => toast.error(`Erreur : ${err.message}`),
  });

  const genererFicheMutation = trpc.analyse.genererFiche.useMutation({
    onSuccess: (result) => {
      toast.success(`Fiche générée ! Score : ${result.scoreTotal}/60`);
      if (dossierId) navigate(`/dossiers/${dossierId}`);
    },
    onError: (err) => toast.error(`Erreur génération : ${err.message}`),
  });

  const uploadAudioMutation = trpc.analyse.uploadAudio.useMutation({
    onSuccess: (result) => {
      setTranscription(result.transcription);
      setNotes((prev) => prev ? `${prev}\n\n[Transcription audio]\n${result.transcription}` : result.transcription);
      setIsTranscribing(false);
      toast.success("Audio transcrit avec succès");
    },
    onError: (err) => { setIsTranscribing(false); toast.error(`Erreur transcription : ${err.message}`); },
  });

  // Créer le dossier au montage
  useEffect(() => {
    if (clientId && !dossierId) {
      createDossierMutation.mutate({
        clientId,
        type: typeEntretien,
        titre: typeEntretien === "entretien_initial" ? "Entretien initial" : "Diagnostic projet",
      });
    }
  }, [clientId]);

  // Scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!chatInput.trim() || !dossierId) return;
    sendMessageMutation.mutate({ dossierId, content: chatInput });
  };

  const handleGenererFiche = () => {
    if (!dossierId || !notes.trim()) {
      toast.error("Veuillez saisir des notes d'entretien avant de générer la fiche.");
      return;
    }
    genererFicheMutation.mutate({ dossierId, clientId, notes, type: typeEntretien });
  };

  // Enregistrement audio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        if (blob.size > 16 * 1024 * 1024) {
          toast.error("Fichier audio trop volumineux (max 16 Mo)");
          return;
        }
        setIsTranscribing(true);
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(",")[1];
          if (dossierId) uploadAudioMutation.mutate({ dossierId, audioBase64: base64, mimeType: "audio/webm" });
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      toast.info("Enregistrement démarré");
    } catch {
      toast.error("Impossible d'accéder au microphone");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4 h-full flex flex-col">
        {/* Navigation */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/clients/${clientId}`)} className="gap-1.5 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              {client ? `${client.prenom ?? ""} ${client.nom}`.trim() : "Retour"}
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <Select value={typeEntretien} onValueChange={(v) => setTypeEntretien(v as any)}>
              <SelectTrigger className="w-44 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entretien_initial">Entretien initial</SelectItem>
                <SelectItem value="diagnostic">Diagnostic projet</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleGenererFiche}
              disabled={genererFicheMutation.isPending || !notes.trim()}
              className="gap-2"
            >
              {genererFicheMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Génération...</>
              ) : (
                <><Wand2 className="h-4 w-4" /> Générer la fiche</>
              )}
            </Button>
          </div>
        </div>

        {/* En-tête */}
        <div className="flex-shrink-0">
          <h1 className="text-xl font-bold text-foreground">
            {typeEntretien === "entretien_initial" ? "Entretien initial" : "Diagnostic projet"}
            {client && <span className="text-muted-foreground font-normal text-base ml-2">— {client.prenom ?? ""} {client.nom}</span>}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Saisissez vos notes ou utilisez l'assistant IA pour structurer l'entretien
          </p>
        </div>

        <Tabs defaultValue="notes" className="flex-1 flex flex-col min-h-0">
          <TabsList className="flex-shrink-0 bg-muted w-fit">
            <TabsTrigger value="notes" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Notes d'entretien</TabsTrigger>
            <TabsTrigger value="chat" className="gap-1.5"><Bot className="h-3.5 w-3.5" /> Assistant IA</TabsTrigger>
          </TabsList>

          {/* Onglet Notes */}
          <TabsContent value="notes" className="flex-1 flex flex-col gap-4 mt-4 min-h-0">
            <Card className="flex-1 flex flex-col min-h-0">
              <CardHeader className="pb-3 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">
                    {typeEntretien === "entretien_initial"
                      ? "Notes — Accueil · Projet · Situation · Financier · Motivation · Orientation"
                      : "Notes — Vision · Marché · Modèle éco. · Financier · Risques · Motivation · Restitution"}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {isTranscribing && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Transcription...
                      </div>
                    )}
                    <Button
                      variant={isRecording ? "destructive" : "outline"}
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={isTranscribing || !dossierId}
                    >
                      {isRecording ? (
                        <><StopCircle className="h-3.5 w-3.5" /> Arrêter l'enregistrement</>
                      ) : (
                        <><Mic className="h-3.5 w-3.5" /> Enregistrer l'entretien</>
                      )}
                    </Button>
                  </div>
                </div>
                {isRecording && (
                  <div className="flex items-center gap-2 mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <p className="text-xs text-red-700">Enregistrement en cours... Cliquez sur "Arrêter" pour transcrire.</p>
                  </div>
                )}
              </CardHeader>
              <CardContent className="flex-1 flex flex-col min-h-0 pb-4">
                <Textarea
                  className="flex-1 resize-none text-sm font-mono min-h-[300px]"
                  placeholder={typeEntretien === "entretien_initial"
                    ? `Saisissez vos notes d'entretien ici...\n\nStructure suggérée :\n1. ACCUEIL — Présentation, contexte\n2. PROJET — Description, idée, stade\n3. SITUATION — Emploi, famille, disponibilité\n4. FINANCIER — Budget, apport, besoins\n5. MOTIVATION — Pourquoi ce projet ?\n6. ORIENTATION — Prochaines étapes`
                    : `Saisissez vos notes de diagnostic ici...\n\nStructure suggérée :\n1. VISION — Objectifs long terme\n2. MARCHÉ — Cible, concurrents, tendances\n3. MODÈLE ÉCONOMIQUE — Revenus, coûts, marges\n4. FINANCIER — Investissement, prévisionnel\n5. RISQUES — Identification, atténuation\n6. MOTIVATION — Engagement, compétences\n7. RESTITUTION — Synthèse, recommandations`}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                {transcription && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Volume2 className="h-3.5 w-3.5 text-blue-600" />
                      <p className="text-xs font-semibold text-blue-700">Transcription audio intégrée</p>
                    </div>
                    <p className="text-xs text-blue-600 line-clamp-2">{transcription}</p>
                  </div>
                )}
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-muted-foreground">{notes.length} caractères</p>
                  <Button
                    onClick={handleGenererFiche}
                    disabled={genererFicheMutation.isPending || !notes.trim()}
                    className="gap-2"
                  >
                    {genererFicheMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Génération en cours...</>
                    ) : (
                      <><Wand2 className="h-4 w-4" /> Générer la fiche IA</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Chat IA */}
          <TabsContent value="chat" className="flex-1 flex flex-col gap-3 mt-4 min-h-0">
            <Card className="flex-1 flex flex-col min-h-0">
              <CardHeader className="pb-3 flex-shrink-0 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">Assistant SIMELE</CardTitle>
                    <p className="text-xs text-muted-foreground">Expert en conseil création d'entreprise</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <Bot className="h-6 w-6 text-primary" />
                    </div>
                    <p className="font-medium text-foreground text-sm">Assistant SIMELE prêt</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                      Posez vos questions sur le projet client, demandez une analyse ou une recommandation.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 justify-center">
                      {["Analysez ce projet", "Quels sont les risques ?", "Quelle prestation recommandez-vous ?"].map((s) => (
                        <button key={s} className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted hover:bg-accent transition-colors"
                          onClick={() => setChatInput(s)}>{s}</button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === "user" ? "bg-secondary" : "bg-primary"}`}>
                      {msg.role === "user"
                        ? <User className="h-3.5 w-3.5 text-secondary-foreground" />
                        : <Bot className="h-3.5 w-3.5 text-primary-foreground" />}
                    </div>
                    <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                      {msg.role === "assistant"
                        ? <Streamdown>{msg.content}</Streamdown>
                        : <p>{msg.content}</p>}
                    </div>
                  </div>
                ))}
                {sendMessageMutation.isPending && (
                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                      <Bot className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                    <div className="bg-muted rounded-xl px-4 py-3 flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Réflexion en cours...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </CardContent>
              <div className="p-4 border-t border-border flex-shrink-0">
                <div className="flex gap-2">
                  <Textarea
                    className="flex-1 resize-none text-sm min-h-[44px] max-h-32"
                    placeholder="Posez une question à l'assistant SIMELE..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    rows={1}
                  />
                  <Button
                    size="icon"
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim() || sendMessageMutation.isPending || !dossierId}
                    className="h-11 w-11 flex-shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">Entrée pour envoyer · Maj+Entrée pour nouvelle ligne</p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
