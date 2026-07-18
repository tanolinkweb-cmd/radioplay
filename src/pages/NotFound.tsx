import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Página não encontrada</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Voltar ao RadioPlay
        </a>
        <p className="mt-8 text-xs text-muted-foreground">
          <a href="https://www.magicpage.com.br" className="hover:text-primary">
            MagicPage — RadioPlay Tonelada Elétrica
          </a>
        </p>
      </div>
    </div>
  );
};

export default NotFound;
