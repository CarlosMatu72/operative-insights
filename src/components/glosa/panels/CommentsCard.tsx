import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ReviewPanelState } from "@/hooks/useReviewPanelState";

interface Props {
  state: ReviewPanelState;
}

export function CommentsCard({ state }: Props) {
  const {
    caseId, generalCommentsList, categories, subcategories,
    isActiveReview,
    showCommentForm, setShowCommentForm,
    commentCategory, setCommentCategory, commentSubcategory, setCommentSubcategory,
    generalComment, setGeneralComment,
    editingCommentId, setEditingCommentId,
    editCommentText, setEditCommentText,
    handleAddComment, actions, queryClient,
    setObsCategoryId, setObsSubcategoryId, setObsComment, setObsErrorId, setObsSearch, setShowObsForm,
  } = state;

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold tracking-tight flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          Comentarios Generales
          {generalCommentsList.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-[10px]">{generalCommentsList.length}</Badge>
          )}
        </CardTitle>
        {isActiveReview && !showCommentForm && (
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowCommentForm(true)}>
            <Plus className="h-3 w-3" /> Agregar
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">Comentarios informativos que no afectan la calificación</p>

        {showCommentForm && (
          <div className="rounded-lg border border-info/30 bg-info/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-info">
                Comentario general — no afecta calificación
              </span>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0"
                onClick={() => { setShowCommentForm(false); setCommentCategory(""); setCommentSubcategory(""); setGeneralComment(""); }}>
                <X className="h-3 w-3" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Categoría</Label>
                <Select value={commentCategory} onValueChange={v => { setCommentCategory(v); setCommentSubcategory(""); }}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {(categories.data ?? []).map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {commentCategory && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Subcategoría</Label>
                  <Select value={commentSubcategory} onValueChange={setCommentSubcategory}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      {(subcategories.data ?? []).filter(s => s.category_id === commentCategory).map(sub => (
                        <SelectItem key={sub.id} value={sub.id}>{sub.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <Textarea
              value={generalComment}
              onChange={e => setGeneralComment(e.target.value)}
              placeholder="Escribe el comentario general..."
              rows={2}
              className="text-sm"
            />
            <div className="flex justify-end">
              <Button size="sm" onClick={handleAddComment}
                disabled={!generalComment.trim()} className="gap-1 text-xs">
                <Plus className="h-3 w-3" /> Agregar
              </Button>
            </div>
          </div>
        )}

        {generalCommentsList.length === 0 && !showCommentForm ? (
          <p className="text-xs text-muted-foreground text-center py-4">Sin comentarios generales</p>
        ) : (
          <div className="space-y-2">
            {generalCommentsList.map((c) => (
              <div key={c.id} className={`rounded-lg border p-3 space-y-1.5 ${
                c.is_closed ? "border-muted bg-muted/5 opacity-60" : "border-info/30 bg-info/5"
              }`}>
                {editingCommentId === c.id ? (
                  <div className="space-y-2">
                    <Textarea value={editCommentText} onChange={e => setEditCommentText(e.target.value)}
                      rows={2} className="text-sm" />
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => setEditingCommentId(null)}>Cancelar</Button>
                      <Button size="sm" className="h-7 text-xs"
                        disabled={!editCommentText.trim()}
                        onClick={async () => {
                          try {
                            const { data: updated, error } = await supabase
                              .from("review_comments")
                              .update({ comment_text: editCommentText.trim() })
                              .eq("id", c.id)
                              .select("id");
                            if (error) throw error;
                            if (!updated || updated.length === 0) {
                              throw new Error("No se pudo guardar el comentario");
                            }
                            toast.success("Comentario actualizado");
                            setEditingCommentId(null);
                            queryClient.invalidateQueries({ queryKey: ["review-comments", caseId] });
                          } catch (e: unknown) {
                            toast.error(e instanceof Error ? e.message : "Error al guardar comentario");
                          }
                        }}>Guardar</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0 space-y-0.5">
                      {c.observation_categories?.nombre ? (
                        <p className="font-semibold text-sm leading-tight">
                          {c.observation_categories.nombre}
                        </p>
                      ) : null}
                      {c.observation_subcategories?.nombre && (
                        <p className="text-sm text-foreground/80 leading-tight">
                          {c.observation_subcategories.nombre}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground leading-snug whitespace-pre-wrap">
                        {c.comment_text}
                      </p>
                      <span className="inline-flex items-center text-[10px] text-info bg-info/5 px-1.5 py-0.5 rounded border border-info/20">
                        no afecta calificación
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {c.is_closed && (
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          Cerrado
                        </span>
                      )}
                      {isActiveReview && !c.is_closed && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-1.5 text-warning"
                            title="Mover a observaciones"
                            onClick={async () => {
                              setObsCategoryId(c.category_id ?? "");
                              setObsSubcategoryId(c.subcategory_id ?? "");
                              setObsComment(c.comment_text);
                              setObsErrorId("");
                              setObsSearch("");
                              setShowObsForm(true);
                              try {
                                await supabase.from("review_comments").delete().eq("id", c.id);
                                queryClient.invalidateQueries({ queryKey: ["review-comments", caseId] });
                                toast.success("Comentario movido a observaciones");
                              } catch { /* silent */ }
                              document.getElementById("obs-section")?.scrollIntoView({ behavior: "smooth" });
                            }}>↑ Obs</Button>
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-1.5"
                            title="Duplicar comentario"
                            onClick={() => actions.duplicateComment.mutate(c.id)}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                          </Button>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0"
                            onClick={() => { setEditingCommentId(c.id); setEditCommentText(c.comment_text); }}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </Button>
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-1.5 text-muted-foreground"
                            onClick={async () => {
                              await supabase.from("review_comments")
                                .update({ is_closed: true, closed_at: new Date().toISOString() })
                                .eq("id", c.id);
                              queryClient.invalidateQueries({ queryKey: ["review-comments", caseId] });
                            }}>✓</Button>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive/60 hover:text-destructive"
                            title="Eliminar comentario"
                            onClick={async () => {
                              await supabase.from("review_comments").delete().eq("id", c.id);
                              queryClient.invalidateQueries({ queryKey: ["review-comments", caseId] });
                              toast.success("Comentario eliminado");
                            }}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
