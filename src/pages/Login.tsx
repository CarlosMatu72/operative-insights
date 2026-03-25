import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn } from "lucide-react";
import { toast } from "sonner";
import gapLogo from "@/assets/gap-logo.png";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);
    if (error) {
      toast.error("Credenciales inválidas o usuario inactivo");
    } else {
      navigate("/");
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[480px] bg-foreground items-center justify-center p-12">
        <div className="text-center space-y-4">
          <img src={gapLogo} alt="GAP Agencia Aduanal" className="mx-auto h-20 w-auto object-contain" />
          <h2 className="text-2xl font-bold text-primary-foreground tracking-tight">
            Control de Glosa
          </h2>
          <p className="text-sm text-primary-foreground/60 max-w-xs mx-auto">
            Sistema de Eficiencia Operativa para el control y evaluación de trámites aduaneros
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="mb-8 lg:hidden text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <span className="text-lg font-bold text-primary-foreground tracking-tight">CG</span>
            </div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              Control de Glosa
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Sistema de Eficiencia Operativa
            </p>
          </div>

          <div className="hidden lg:block mb-8">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Iniciar sesión
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Ingrese sus credenciales para acceder al sistema
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-11"
              />
            </div>
            <Button type="submit" className="w-full h-11" disabled={isLoading}>
              {isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Iniciar sesión
                </>
              )}
            </Button>
          </form>
          <p className="mt-8 text-center text-[11px] text-muted-foreground leading-relaxed">
            Acceso exclusivo para personal autorizado.
            <br />
            Contacte al administrador para obtener credenciales.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
