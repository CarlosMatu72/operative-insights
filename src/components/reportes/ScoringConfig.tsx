import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Settings2 } from "lucide-react";
import { toast } from "sonner";

export function ScoringConfig() {
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [editRule, setEditRule] = useState<{ id?: string; nombre: string; activo: boolean } | null>(null);
  const [penaltyOpen, setPenaltyOpen] = useState(false);
  const [penaltyRuleId, setPenaltyRuleId] = useState("");
  const [penaltyErrorId, setPenaltyErrorId] = useState("");
  const [penaltyPoints, setPenaltyPoints] = useState("");

  const { data: rules = [] } = useQuery({
    queryKey: ["scoring-rules"],
    queryFn: async () => {
      const { data } = await supabase.from("scoring_rules").select("*").order("nombre");
      return data ?? [];
    },
  });

  const { data: penalties = [] } = useQuery({
    queryKey: ["scoring-penalties"],
    queryFn: async () => {
      const { data } = await supabase
        .from("scoring_rule_error_penalties")
        .select("*, observation_errors(descripcion, codigo_error), scoring_rules(nombre)")
        .order("penalty_points", { ascending: false });
      return data ?? [];
    },
  });

  const { data: errors = [] } = useQuery({
    queryKey: ["obs-errors-all"],
    queryFn: async () => {
      const { data } = await supabase.from("observation_errors").select("id, descripcion, codigo_error").eq("activo", true).order("descripcion");
      return data ?? [];
    },
  });

  const saveRule = useMutation({
    mutationFn: async (rule: { id?: string; nombre: string; activo?: boolean }) => {
      if (rule.id) {
        await supabase.from("scoring_rules").update({
          nombre: rule.nombre,
          activo: rule.activo,
        }).eq("id", rule.id);
      } else {
        await supabase.from("scoring_rules").insert({
          nombre: rule.nombre,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scoring-rules"] });
      toast.success("Regla guardada");
      setEditOpen(false);
    },
    onError: () => toast.error("Error al guardar"),
  });

  const savePenalty = useMutation({
    mutationFn: async () => {
      await supabase.from("scoring_rule_error_penalties").insert({
        scoring_rule_id: penaltyRuleId,
        observation_error_id: penaltyErrorId,
        penalty_points: Number(penaltyPoints),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scoring-penalties"] });
      toast.success("Penalización agregada");
      setPenaltyOpen(false);
      setPenaltyErrorId("");
      setPenaltyPoints("");
    },
    onError: () => toast.error("Error al guardar"),
  });

  const deletePenalty = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("scoring_rule_error_penalties").delete().eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scoring-penalties"] });
      toast.success("Penalización eliminada");
    },
  });

  const openNewRule = () => {
    setEditRule({ nombre: "", activo: true });
    setEditOpen(true);
  };

  const openEditRule = r => {
    setEditRule({ id: r.id, nombre: r.nombre, activo: r.activo });
    setEditOpen(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Settings2 className="h-4 w-4" /> Reglas de Calificación</CardTitle>
          <Button size="sm" onClick={openNewRule} className="gap-1"><Plus className="h-3 w-3" /> Nueva Regla</Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Activa</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-sm">{r.nombre}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium ${r.activo ? "text-success" : "text-muted-foreground"}`}>
                        {r.activo ? "Sí" : "No"}
                      </span>
                    </TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => openEditRule(r)}>Editar</Button></TableCell>
                  </TableRow>
                ))}
                {rules.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center py-6 text-sm text-muted-foreground">Sin reglas configuradas</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Penalizaciones por Error</CardTitle>
          <Button size="sm" variant="outline" onClick={() => { setPenaltyOpen(true); setPenaltyRuleId(rules[0]?.id ?? ""); }} disabled={rules.length === 0} className="gap-1">
            <Plus className="h-3 w-3" /> Agregar
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Regla</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead>Puntos</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {penalties.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">{p.scoring_rules?.nombre}</TableCell>
                    <TableCell className="text-sm">{p.observation_errors?.codigo_error ? `[${p.observation_errors.codigo_error}] ` : ""}{p.observation_errors?.descripcion}</TableCell>
                    <TableCell className="text-sm font-medium text-destructive">-{p.penalty_points}</TableCell>
                    <TableCell><Button size="sm" variant="ghost" className="text-destructive" onClick={() => deletePenalty.mutate(p.id)}>×</Button></TableCell>
                  </TableRow>
                ))}
                {penalties.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center py-6 text-sm text-muted-foreground">Sin penalizaciones</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit rule dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editRule?.id ? "Editar" : "Nueva"} Regla de Calificación</DialogTitle></DialogHeader>
          {editRule && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Nombre</Label>
                <Input value={editRule.nombre} onChange={(e) => setEditRule({ ...editRule, nombre: e.target.value })} className="h-9 text-sm" />
              </div>
              <p className="text-xs text-muted-foreground">
                La fórmula de calificación es fija: 20 pts por clasificación + 80 pts por observaciones.
                Las penalizaciones adicionales se configuran en la sección de abajo.
              </p>
              {editRule.id && (
                <div className="flex items-center gap-2">
                  <Switch checked={editRule.activo} onCheckedChange={(v) => setEditRule({ ...editRule, activo: v })} />
                  <Label className="text-xs">Activa</Label>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveRule.mutate(editRule)} disabled={saveRule.isPending}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add penalty dialog */}
      <Dialog open={penaltyOpen} onOpenChange={setPenaltyOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Agregar Penalización</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Regla</Label>
              <Select value={penaltyRuleId} onValueChange={setPenaltyRuleId}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {rules.map(r => <SelectItem key={r.id} value={r.id}>{r.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Error</Label>
              <Select value={penaltyErrorId} onValueChange={setPenaltyErrorId}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar error" /></SelectTrigger>
                <SelectContent>
                  {errors.map(e => <SelectItem key={e.id} value={e.id}>{e.codigo_error ? `[${e.codigo_error}] ` : ""}{e.descripcion}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Puntos a descontar</Label>
              <Input type="number" value={penaltyPoints} onChange={(e) => setPenaltyPoints(e.target.value)} className="h-9 text-sm" placeholder="5" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPenaltyOpen(false)}>Cancelar</Button>
            <Button onClick={() => savePenalty.mutate()} disabled={!penaltyErrorId || !penaltyPoints || savePenalty.isPending}>Agregar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
