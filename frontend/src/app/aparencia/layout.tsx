// A página de Aparência é client component e não pode exportar metadata,
// então o título da aba fica aqui (o layout raiz completa com " — <marca>").

export const metadata = { title: "Aparência" };

export default function LayoutAparencia({ children }: { children: React.ReactNode }) {
  return children;
}
