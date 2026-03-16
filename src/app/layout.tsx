import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Fonte limpa e moderna
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "IRPF Copilot",
  description: "O seu assistente fiscal de Inteligência Artificial.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>{children}</body>
    </html>
  );
}