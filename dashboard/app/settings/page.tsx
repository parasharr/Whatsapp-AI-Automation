import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cpu, Server, Smartphone, Key } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold">System Status & Settings</CardTitle>
          <CardDescription>
            Overview of connection nodes and parameters for the Grox AI WhatsApp agent.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Node Status Lists */}
          <div className="space-y-4">
            
            {/* WhatsApp node */}
            <div className="flex items-start justify-between p-4 rounded-xl border border-border bg-zinc-900/30">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400 shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-foreground">WhatsApp Gateway</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Connects Ollama generated responses back to customer chats.
                  </p>
                </div>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                Active
              </Badge>
            </div>

            {/* Firestore node */}
            <div className="flex items-start justify-between p-4 rounded-xl border border-border bg-zinc-900/30">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400 shrink-0">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-foreground">Firestore Database</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Hosts knowledge-base fragments and dialog history schemas.
                  </p>
                </div>
              </div>
              <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px]">
                Connected
              </Badge>
            </div>

            {/* LLM Engine node */}
            <div className="flex items-start justify-between p-4 rounded-xl border border-border bg-zinc-900/30">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center border border-violet-500/20 text-violet-400 shrink-0">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-foreground">Ollama Model Engine</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Executes dynamic prompt context completions using qwen3:8b.
                  </p>
                </div>
              </div>
              <Badge className="bg-violet-500/10 text-violet-400 border border-violet-500/20 text-[10px]">
                qwen3:8b
              </Badge>
            </div>

            {/* Service Account node */}
            <div className="flex items-start justify-between p-4 rounded-xl border border-border bg-zinc-900/30">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20 text-yellow-400 shrink-0">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-foreground">Admin Credentials</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Loaded secure Google Cloud service key json file successfully.
                  </p>
                </div>
              </div>
              <Badge className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[10px]">
                Valid Key
              </Badge>
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  );
}
