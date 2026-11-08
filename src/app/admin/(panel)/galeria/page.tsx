import Link from "next/link";

import { EmptyState, PageHeader } from "@/components/admin/ui";
import { prisma } from "@/lib/db";
import { GALLERY_SIZE_LABEL, type GallerySize } from "@/lib/constants";

export const metadata = { title: "Galería" };

export default async function GalleryAdminPage() {
  const items = await prisma.galleryItem.findMany({ orderBy: { order: "asc" } });

  return (
    <>
      <PageHeader
        title="Galería"
        description="El mosaico de Instagram y los reels destacados de la portada."
        action={{ label: "Nuevo elemento", href: "/admin/galeria/nuevo" }}
      />

      {items.length === 0 ? (
        <EmptyState
          title="Todavía no hay elementos"
          action={{ label: "Nuevo elemento", href: "/admin/galeria/nuevo" }}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/admin/galeria/${item.id}`}
              className="group border border-stone/70 bg-white transition-colors hover:border-gold-300"
            >
              <div
                className="relative overflow-hidden bg-sand/40"
                style={{ aspectRatio: item.size === "TALL" ? "9/16" : item.size === "WIDE" ? "4/3" : "1/1" }}
              >
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt={item.caption ?? ""}
                    className="h-full w-full object-cover"
                  />
                ) : item.videoUrl ? (
                  <video
                    src={item.videoUrl}
                    muted
                    loop
                    playsInline
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="media-hatch flex h-full w-full items-center justify-center text-sm opacity-60">
                    {item.kind === "REEL" ? "🎥" : "📷"}
                  </span>
                )}

                {item.kind === "REEL" && (
                  <span className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink/60 text-[9px] text-white">
                    ▶
                  </span>
                )}

                {!item.active && (
                  <span className="absolute inset-0 flex items-center justify-center bg-bone/80 text-[10px] tracking-[0.16em] text-muted uppercase">
                    Oculto
                  </span>
                )}
              </div>

              <div className="p-3.5">
                <p className="truncate text-xs text-ink">
                  {item.caption || "Sin descripción"}
                </p>
                <p className="mt-1 text-[10px] text-muted">
                  {GALLERY_SIZE_LABEL[item.size as GallerySize] ?? item.size} ·
                  orden {item.order}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
