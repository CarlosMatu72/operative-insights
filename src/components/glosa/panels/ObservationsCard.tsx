import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, X, FileCheck, Check, ChevronsUpDown, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ReviewPanelState } from "@/hooks/useReviewPanelState";

const findingStatusLabels: Record<string, { label: string; className: string }> = {
  open: { label: "Abierta", className: "bg-warning/10 text-warning border-warning/20" },
  closed: { label: "Cerrada", className: "bg-muted text-muted-foreground border-border" },
  CORRECTED: { label: "Corregido", className: "bg-success/10 text-success border-success/20" },
  NOT_CORRECTED: { label: "No corregido", className: "bg-destructive/10 text-destructive border-destructive/20" },
  PARTIALLY_CORRECTED: { label: "Parcialmente", className: "bg-warning/10 text-warning border-warning/20" },
};

interface Props {
  state: ReviewPanelState;
}

export function ObservationsCard({ state }: Props) {
  const {
    caseId, findings, openFindings, categories, subcategories, activeErrors,
    isActiveReview, isReadOnly, isCorrection, needsCorrection,
    showObsForm, setShowObsForm,
    obsCategoryId, setObsCategoryId, obsSubcategoryId, setObsSubcategoryId,
    obsErrorId, setObsErrorId, obsSearch, setObsSearch, obsComment, setObsComment,
    errorPopoverOpen, setErrorPopoverOpen,
    handleAddFinding, actions, queryClient,
    editingFindingId, setEditingFindingId,
    editCategoryId, setEditCategoryId, editSubcategoryId, setEditSubcategoryId,
    editErrorId, setEditErrorId, editErrorSearch, setEditErrorSearch,
    editComment, setEditComment,
    setStatusUpdateFinding, setStatusUpdateValue, setStatusUpdateComment,
    previousFindings, newFindings,
  } = state;

  return (
    <Card id="obs-section">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold tracking-tight">
          Observaciones
          {openFindings.length > 0 && (
            <Badge variant="destructive" className="ml-2 text-[10px]">{openFindings.length} abiertas</Badge>
          )}
          {findings.length > 0 && openFindings.length === 0 && (
            <Badge variant="secondary" className="ml-2 text-[10px]">{findings.length} total</Badge>
          )}
        </CardTitle>
        {isActiveReview && !needsCorrection && (
          <Button size="sm" variant={showObsForm ? "secondary" : "outline"} className="h-7 text-xs gap-1"
            onClick={() => setShowObsForm(!showObsForm)}>
            {showObsForm ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
            {showObsForm ? "Cerrar" : "Agregar"}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {showObsForm && (
          <div className="rounded-lg border border-primary/20 bg-primary/[0.02] p-4 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Categoría *</Label>
              <Select value={obsCategoryId} onValueChange={(v) => {
                setObsCategoryId(v);
                setObsSubcategoryId("");
                setObsErrorId("");
                setObsSearch("");
              }}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar categoría..." /></SelectTrigger>
                <SelectContent>
                  {(categories.data ?? []).map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {obsCategoryId && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Subcategoría *</Label>
                <Select value={obsSubcategoryId} onValueChange={(v) => {
                  setObsSubcategoryId(v);
                  setObsErrorId("");
                  setObsSearch("");
                }}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar subcategoría..." /></SelectTrigger>
                  <SelectContent>
                    {(subcategories.data ?? [])
                      .filter(s => s.category_id === obsCategoryId)
                      .map(sub => (
                        <SelectItem key={sub.id} value={sub.id}>{sub.nombre}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {obsSubcategoryId && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Error específico <span className="text-destructive ml-0.5">*</span>
                </Label>
                <Popover open={errorPopoverOpen} onOpenChange={setErrorPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={errorPopoverOpen}
                      className="w-full h-9 text-sm justify-between font-normal"
                    >
                      <span className="truncate text-left">
                        {obsErrorId
                          ? activeErrors.find(e => e.id === obsErrorId)?.descripcion ?? "Seleccionar error..."
                          : "Seleccionar o escribir para filtrar..."}
                      </span>
                      <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar error..." className="h-9" />
                      <CommandList>
                        <CommandEmpty>Sin resultados</CommandEmpty>
                        <CommandGroup>
                          {activeErrors.map(error => (
                            <CommandItem
                              key={error.id}
                              value={`${error.codigo_error ?? ""} ${error.descripcion}`}
                              onSelect={() => {
                                const isSame = obsErrorId === error.id;
                                setObsErrorId(isSame ? "" : error.id);
                                setObsSearch(isSame ? "" : error.descripcion);
                                setErrorPopoverOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-3.5 w-3.5", obsErrorId === error.id ? "opacity-100" : "opacity-0")} />
                              <span className="flex-1 truncate">
                                {error.codigo_error && (
                                  <span className="text-xs text-muted-foreground mr-1.5">[{error.codigo_error}]</span>
                                )}
                                {error.descripcion}
                              </span>
                              {error.descuento_puntos && (
                                <span className="ml-2 text-xs text-destructive shrink-0">−{error.descuento_puntos} pts</span>
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {obsErrorId ? (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
                    onClick={() => { setObsErrorId(""); setObsSearch(""); }}
                  >
                    <X className="h-3 w-3" /> Quitar error seleccionado
                  </button>
                ) : (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Selecciona el tipo de error para poder agregar la observación
                  </p>
                )}
              </div>
            )}
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Comentario</Label>
                <Input value={obsComment} onChange={(e) => setObsComment(e.target.value)}
                  placeholder="Comentario de la observación..." className="h-8 text-xs mt-1" />
              </div>
              <Button variant="outline" size="sm" className="h-8 text-xs"
                onClick={() => { setShowObsForm(false); setObsCategoryId(""); setObsSubcategoryId(""); setObsErrorId(""); setObsSearch(""); setObsComment(""); }}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleAddFinding}
                disabled={actions.addFinding.isPending || !obsCategoryId || !obsSubcategoryId || !obsErrorId}
                className="h-8 text-xs gap-1 shrink-0">
                <Plus className="h-3 w-3" /> Agregar
              </Button>
            </div>
          </div>
        )}

        {/* Previous findings (correction mode) */}
        {isCorrection && previousFindings.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Errores de rondas anteriores</p>
            {previousFindings.map((f) => {
              const st = findingStatusLabels[f.current_status] ?? findingStatusLabels.open;
              return (
                <div key={f.id} className={`rounded-lg border p-3 text-sm space-y-1 ${
                  f.current_status === "CORRECTED" ? "border-success/20 bg-success/[0.03]" :
                  f.current_status === "NOT_CORRECTED" ? "border-destructive/20 bg-destructive/[0.03]" :
                  "border-warning/20 bg-warning/[0.03]"
                }`}>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p className="font-semibold text-sm leading-tight">{f.observation_categories?.nombre || "—"}</p>
                      {f.observation_subcategories?.nombre && (
                        <p className="text-sm text-foreground/80 leading-tight">{f.observation_subcategories.nombre}</p>
                      )}
                      {f.comentario_inicial && (
                        <p className="text-sm text-muted-foreground italic leading-snug">{f.comentario_inicial}</p>
                      )}
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        {f.observation_errors?.descripcion && (
                          <span className="text-[11px] text-muted-foreground">
                            {f.observation_errors.codigo_error ? `[${f.observation_errors.codigo_error}] ` : ""}{f.observation_errors.descripcion}
                          </span>
                        )}
                        {f.observation_errors?.descuento_puntos && (
                          <span className="text-[10px] font-medium text-destructive bg-destructive/5 px-1.5 py-0.5 rounded">−{f.observation_errors.descuento_puntos} pts</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium ${st.className}`}>{st.label}</span>
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2"
                        onClick={() => { setStatusUpdateFinding(f.id); setStatusUpdateValue(""); setStatusUpdateComment(""); }}>
                        Evaluar
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {isCorrection && newFindings.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-primary uppercase tracking-wider">Nuevos errores (esta ronda)</p>
          </div>
        )}

        {(isCorrection ? newFindings : findings).length === 0 && !isCorrection ? (
          <div className="flex flex-col items-center py-8 text-muted-foreground">
            <FileCheck className="h-8 w-8 opacity-20 mb-2" />
            <p className="text-sm">Sin observaciones registradas</p>
            {isActiveReview && <p className="text-xs mt-1">Usa el botón "Agregar" para capturar observaciones</p>}
          </div>
        ) : (
          <div className="space-y-2">
            {(isCorrection ? newFindings : findings).map((f) => {
              const st = findingStatusLabels[f.current_status] ?? findingStatusLabels.open;
              return (
                <div key={f.id} className={`rounded-lg border p-3 text-sm space-y-1 ${
                  f.is_open ? "border-warning/30 bg-warning/[0.03]" :
                  f.current_status === "CORRECTED" ? "border-success/20 bg-success/[0.03]" :
                  f.current_status === "NOT_CORRECTED" ? "border-destructive/20 bg-destructive/[0.03]" :
                  "border-muted bg-muted/5"
                }`}>
                  {editingFindingId === f.id ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Categoría</Label>
                          <Select value={editCategoryId} onValueChange={v => { setEditCategoryId(v); setEditSubcategoryId(""); setEditErrorId(""); setEditErrorSearch(""); }}>
                            <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {(categories.data ?? []).map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.nombre}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {editCategoryId && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Subcategoría</Label>
                            <Select value={editSubcategoryId} onValueChange={v => { setEditSubcategoryId(v); setEditErrorId(""); setEditErrorSearch(""); }}>
                              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {(subcategories.data ?? []).filter(s => s.category_id === editCategoryId).map(sub => (
                                  <SelectItem key={sub.id} value={sub.id}>{sub.nombre}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                      {editSubcategoryId && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Error (opcional)</Label>
                          <Input value={editErrorSearch}
                            onChange={e => { setEditErrorSearch(e.target.value); setEditErrorId(""); }}
                            placeholder="Buscar error..." className="h-8 text-xs mt-1" />
                          {editErrorSearch.length > 1 && (
                            <div className="rounded border bg-card mt-1 max-h-32 overflow-y-auto divide-y">
                              {activeErrors.filter(e => e.descripcion.toLowerCase().includes(editErrorSearch.toLowerCase())).slice(0, 6).map(err => (
                                <button key={err.id} type="button"
                                  className={`w-full text-left px-2 py-1.5 text-xs hover:bg-muted/50 ${editErrorId === err.id ? "bg-primary/5" : ""}`}
                                  onClick={() => { setEditErrorId(err.id); setEditErrorSearch(err.descripcion); }}>
                                  {err.descripcion} {err.descuento_puntos ? <span className="text-destructive">−{err.descuento_puntos}pts</span> : null}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      <Input value={editComment} onChange={e => setEditComment(e.target.value)}
                        placeholder="Comentario..." className="h-8 text-xs" />
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" className="h-7 text-xs"
                          onClick={() => setEditingFindingId(null)}>Cancelar</Button>
                        <Button size="sm" className="h-7 text-xs"
                          disabled={!editCategoryId || !editSubcategoryId || actions.editFinding.isPending}
                          onClick={async () => {
                            await actions.editFinding.mutateAsync({
                              findingId: f.id, category_id: editCategoryId,
                              subcategory_id: editSubcategoryId,
                              observation_error_id: editErrorId || null,
                              comentario_inicial: editComment,
                            });
                            setEditingFindingId(null);
                          }}>Guardar</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <p className="font-semibold text-sm leading-tight">{f.observation_categories?.nombre || "—"}</p>
                        {f.observation_subcategories?.nombre && (
                          <p className="text-sm text-foreground/80 leading-tight">{f.observation_subcategories.nombre}</p>
                        )}
                        {f.comentario_inicial && (
                          <p className="text-sm text-muted-foreground italic leading-snug">{f.comentario_inicial}</p>
                        )}
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                          {f.observation_errors?.descripcion && (
                            <span className="text-[11px] text-muted-foreground">
                              {f.observation_errors.codigo_error ? `[${f.observation_errors.codigo_error}] ` : ""}{f.observation_errors.descripcion}
                            </span>
                          )}
                          {f.observation_errors?.descuento_puntos && (
                            <span className="text-[10px] font-medium text-destructive bg-destructive/5 px-1.5 py-0.5 rounded">−{f.observation_errors.descuento_puntos} pts</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium ${st.className}`}>{st.label}</span>
                        <div className="flex gap-1">
                          {isCorrection && f.current_status !== "closed" && (
                            <Button size="sm" variant="outline" className="h-6 text-[10px] px-2"
                              onClick={() => { setStatusUpdateFinding(f.id); setStatusUpdateValue(""); setStatusUpdateComment(""); }}>Evaluar</Button>
                          )}
                          {!isReadOnly && f.is_open && (
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0"
                              title="Duplicar observación"
                              onClick={() => actions.duplicateFinding.mutate(f.id)}>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                            </Button>
                          )}
                          {!isReadOnly && f.is_open && (
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" title="Editar"
                              onClick={() => {
                                setEditingFindingId(f.id);
                                setEditCategoryId(f.category_id ?? "");
                                setEditSubcategoryId(f.subcategory_id ?? "");
                                setEditErrorId(f.observation_error_id ?? "");
                                setEditErrorSearch(f.observation_errors?.descripcion ?? "");
                                setEditComment(f.comentario_inicial ?? "");
                              }}>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </Button>
                          )}
                          {!isCorrection && f.is_open && !isReadOnly && (
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive/60 hover:text-destructive"
                              title="Eliminar observación"
                              onClick={async () => {
                                await supabase.from("review_findings").delete().eq("id", f.id);
                                queryClient.invalidateQueries({ queryKey: ["review-findings", caseId] });
                                toast.success("Observación eliminada");
                              }}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
