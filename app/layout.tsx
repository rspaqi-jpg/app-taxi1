import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gjakova Taksi",
  description: "Rezervo udhëtimin tënd me Gjakova Taksi.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="sq"><body>{children}</body></html>;
}
