// A página de Trocar senha é client component e não pode exportar metadata,
// então o título da aba fica aqui.

export const metadata = { title: "Trocar senha" };

export default function LayoutSenha({ children }: { children: React.ReactNode }) {
  return children;
}
