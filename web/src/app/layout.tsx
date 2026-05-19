import type { Metadata, Viewport } from "next"
import { Inter, Bricolage_Grotesque, JetBrains_Mono } from "next/font/google"
import { Toaster } from "sonner"
import "./globals.css"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
})

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "DEP — Plateforme de gestion électrique",
    template: "%s · DEP",
  },
  description:
    "Le devis d'électricien le plus rapide du marché. Parlez, c'est facturé. DEP transcrit votre chantier en devis prêt à signer en moins de 2 minutes. Conçu pour les chefs d'entreprise qui ne veulent pas se prendre la tête.",
  keywords: [
    "devis électricien",
    "logiciel devis BTP",
    "facturation électricien",
    "devis vocal",
    "gestion chantier",
    "DEP",
    "Maelig",
  ],
  authors: [{ name: "DEP — Maelig" }],
  openGraph: {
    type: "website",
    locale: "fr_FR",
    title: "DEP — Le devis d'électricien le plus rapide",
    description: "Parlez votre chantier, on s'occupe du reste. Devis + facture + relance en 1 vocal.",
    siteName: "DEP",
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: "#07070b",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className="dark">
      <body
        className={`${inter.variable} ${bricolage.variable} ${jetbrains.variable} antialiased grain`}
      >
        {children}
        <Toaster
          position="top-right"
          theme="dark"
          richColors
          closeButton
          toastOptions={{
            classNames: {
              toast: "!bg-surface-2 !border !border-border !text-foreground",
              title: "!text-foreground !font-medium",
              description: "!text-muted",
            },
          }}
        />
      </body>
    </html>
  )
}
