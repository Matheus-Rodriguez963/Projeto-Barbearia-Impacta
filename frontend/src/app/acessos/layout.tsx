// A página de Acessos é client component e não pode exportar metadata,
// então o título da aba fica aqui.

export const metadata = { title: "Acessos" };

export default function LayoutAcessos({ children }: { children: React.ReactNode }) {
  return children;
}
