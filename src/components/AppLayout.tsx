import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, role } = useAuth();

  const initials = profile?.nombre
    ?.split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "U";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-card px-4">
            <SidebarTrigger />
            <div className="ml-auto flex items-center gap-3">
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {profile?.correo}
              </span>
              <span className="inline-flex items-center rounded-md bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
                {role === "admin" ? "Admin" : "Glosa"}
              </span>
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.nombre} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
          </header>
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
