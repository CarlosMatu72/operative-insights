import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, X, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useCatalogs } from "@/hooks/useCatalogs";

interface Props {
  featureId: string;
  featureName: string;
  onClose: () => void;
}

export function ClassificationRulesConfig({ featureId, featureName, onClose }: Props) {
  const queryClient = useQueryClient();
  const { branches, clients } = useCatalogs();

  const [showForm, setShowForm] = useState(false);
  const [ruleType, setRuleType] = useState<"sucursal" | "cliente" | "clave">("sucursal");
  const [selectedId, setSelectedId] = useState("");
  const [defaultValue, setDefaultValue] = useState(false);

  const { data: customsKeys = [] } = useQuery({
    queryKey: ["customs-keys-for-rules"],
    queryFn: async () => {
      const { data } = await supabase.from("customs_keys").select("id, clave, descripcion").eq("activo", true).order("clave");
      return data ?? [];
    },
  });

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["classification-rules", featureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classification_feature_rules")
        .select("*, branches(nombre), clients(nombre), customs_keys(clave)")
        .eq("classification_feature_id", featureId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const createRule = useMutation({
    mutationFn: async () => {
      if (!selectedId) throw new Error("Selecciona un elemento");
      const payload: Record<string, string | boolean> = { classification_feature_id: featureId, default_value: defaultValue };
      if (ruleType === "sucursal") payload.sucursal_id = selectedId;
      else if (ruleType === "cliente") payload.cliente_id = selectedId;
      else payload.customs_key_id = selectedId;
      const { error } = await supabase.from("classification_feature_rules").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classification-rules", featureId] });
      toast.success("Regla creada");
      setShowForm(false);
      setSelectedId("");
      setDefaultValue(false);
    },
    onError: (err: Error) => toast.error(err.message || "Error al crear regla"),
  });

  const deleteRule = useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase.from("classification_feature_rules").delete().eq("id", ruleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classification-rules", featureId] });
      toast.success("Regla eliminada");
    },
  });

  const getRuleName = (rule: { branches: { nombre: string } | null; clients: { nombre: string } | null; customs_keys: { clave: string } | null }) => {
    if (rule.branches) return rule.branches.nombre;
    if (rule.clients) return rule.clients.nombre;
    if (rule.customs_keys) return rule.customs_keys.clave;
    return "—";
  };

  const getRuleType = (rule: { sucursal_id: string | null; cliente_id: string | null; customs_key_id: string | null }) => {
    if (rule.sucursal_id) return "Sucursal";
    if (rule.cliente_id) return "Cliente";
    if (rule.customs_key_id) return "Clave";
    return "—";
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">
              Reglas de Auto-Selección
              <Badge variant="secondary" className="ml-2">{featureName}</Badge>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Define valores por defecto según sucursal, cliente o clave aduanal
            </p>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm ? (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tipo de Regla</Label>
                <Select value={ruleType} onValueChange={(v: string) => { setRuleType(v as "sucursal" | "cliente" | "clave"); setSelectedId(""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sucursal">Sucursal</SelectItem>
                    <SelectItem value="cliente">Cliente</SelectItem>
                    <SelectItem value="clave">Clave Aduanal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">
                  {ruleType === "sucursal" ? "Sucursal" : ruleType === "cliente" ? "Cliente" : "Clave"}
                </Label>
                <Select value={selectedId} onValueChange={setSelectedId}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {ruleType === "sucursal" && (branches.data ?? []).map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.nombre}</SelectItem>
                    ))}
                    {ruleType === "cliente" && (clients.data ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                    ))}
                    {ruleType === "clave" && customsKeys.map((k) => (
                      <SelectItem key={k.id} value={k.id}>{k.clave} - {k.descripcion}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Valor por Defecto</Label>
                <div className="flex items-center gap-2 h-10">
                  <Switch checked={defaultValue} onCheckedChange={setDefaultValue} />
                  <span className="text-sm">{defaultValue ? "☑ Sí" : "☐ No"}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button size="sm" onClick={() => createRule.mutate()} disabled={!selectedId || createRule.isPending}>
                {createRule.isPending ? "Creando..." : "Agregar Regla"}
              </Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)} className="w-full gap-1">
            <Plus className="h-3 w-3" /> Agregar Regla
          </Button>
        )}

        <div className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Cargando reglas...</p>
          ) : rules.length === 0 ? (
            <div className="text-center py-4">
              <AlertTriangle className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
              <p className="text-sm text-muted-foreground">No hay reglas configuradas</p>
              <p className="text-xs text-muted-foreground">Sin reglas, el valor por defecto será "No"</p>
            </div>
          ) : (
            rules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  {rule.default_value ? (
                    <CheckCircle className="h-4 w-4 text-success" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{getRuleType(rule)}</Badge>
                      <span className="text-sm font-medium">{getRuleName(rule)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Auto-seleccionar: {rule.default_value ? "Sí" : "No"}
                    </p>
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => deleteRule.mutate(rule.id)} disabled={deleteRule.isPending}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
