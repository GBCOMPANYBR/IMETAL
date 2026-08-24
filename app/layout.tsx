import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IMETAL — Gestão de Pedidos",
  description: "Sistema interno de gestão de pedidos e clientes da IMETAL",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
