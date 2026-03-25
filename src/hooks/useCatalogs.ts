import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCatalogs() {
  const branches = useQuery({
    queryKey: ["branches-active"],
    queryFn: async () => {
      const { data } = await supabase.from("branches").select("*").eq("activo", true).order("nombre");
      return data ?? [];
    },
  });

  const clients = useQuery({
    queryKey: ["clients-active"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("*").eq("activo", true).order("nombre");
      return data ?? [];
    },
  });

  const executives = useQuery({
    queryKey: ["executives-active"],
    queryFn: async () => {
      const { data } = await supabase.from("executives").select("*").eq("activo", true).order("nombre");
      return data ?? [];
    },
  });

  const documentTypes = useQuery({
    queryKey: ["document-types"],
    queryFn: async () => {
      const { data } = await supabase.from("document_types").select("*").order("code");
      return data ?? [];
    },
  });

  const glosadores = useQuery({
    queryKey: ["glosadores"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const glosadorIds = (roles ?? []).filter(r => r.role === "glosa" || r.role === "admin").map(r => r.user_id);
      if (glosadorIds.length === 0) return [];
      const { data: profiles } = await supabase.from("profiles").select("*").in("id", glosadorIds).eq("activo", true).order("nombre");
      return profiles ?? [];
    },
  });

  return { branches, clients, executives, documentTypes, glosadores };
}

export function useActiveRemesas() {
  return useQuery({
    queryKey: ["active-remesas"],
    queryFn: async () => {
      const { data } = await supabase
        .from("review_cases")
        .select("*, branches(nombre), clients(nombre)")
        .eq("is_active_remesa", true)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });
}
