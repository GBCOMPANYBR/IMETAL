import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IMETAL — Gestão de Pedidos",
  description: "Sistema interno de gestão de pedidos e clientes da IMETAL",
  // ferramenta interna com dados reais de clientes/pedidos — nunca deve aparecer em busca
  robots: { index: false, follow: false, nocache: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
