import type { Metadata } from "next";

import "./panel.css";

export const metadata: Metadata = {
  title: {
    default: "Panel administrativo",
    template: "%s · Panel Marea Rizada",
  },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="admin-area min-h-screen bg-canvas">{children}</div>;
}
