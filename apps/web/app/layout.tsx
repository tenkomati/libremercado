import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "libremercado",
  description: "Marketplace C2C de alta confianza para Argentina."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
