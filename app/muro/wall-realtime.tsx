"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseBrowserConfig, WallImageRecord } from "../lib/wall";

type WallRealtimeProps = {
  configured: boolean;
  initialImages: WallImageRecord[];
  supabaseConfig: SupabaseBrowserConfig | null;
  previewMode?: boolean;
};

type WallApiResponse = {
  images?: unknown;
};

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function getCardStyle(image: WallImageRecord, index: number, total: number): CSSProperties {
  const hash = hashString(`${image.id}-${image.updated_at}`);
  const columns = Math.max(1, Math.ceil(Math.sqrt(total * 1.35)));
  const rows = Math.max(1, Math.ceil(total / columns));
  const column = index % columns;
  const row = Math.floor(index / columns);
  const cellWidth = 94 / columns;
  const cellHeight = 78 / rows;
  const jitterX = (((hash >> 3) % 100) / 100 - 0.5) * cellWidth * 0.72;
  const jitterY = (((hash >> 11) % 100) / 100 - 0.5) * cellHeight * 0.72;
  const rotation = (hash % 35) - 17;
  const left = Math.max(2, Math.min(98, 3 + cellWidth * (column + 0.5) + jitterX));
  const top = Math.max(8, Math.min(94, 10 + cellHeight * (row + 0.5) + jitterY));

  return {
    left: `${left}%`,
    top: `${top}%`,
    transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
    zIndex: (hash % 9) + 1,
  };
}

function isWallImageRecord(value: unknown): value is WallImageRecord {
  const record = value as Partial<WallImageRecord>;

  return (
    typeof record.id === "string" &&
    typeof record.image_url === "string" &&
    typeof record.storage_path === "string" &&
    (typeof record.image_hash === "string" || record.image_hash === null) &&
    typeof record.created_at === "string" &&
    typeof record.updated_at === "string"
  );
}

function mergeWallImages(currentImages: WallImageRecord[], incomingImages: WallImageRecord[]) {
  const currentIds = new Set(currentImages.map((image) => image.id));
  const newImages = incomingImages.filter((image) => !currentIds.has(image.id));

  return newImages.length > 0 ? [...newImages, ...currentImages] : currentImages;
}

function WallImageCounter({ count }: { count: number }) {
  return (
    <div className="pointer-events-none absolute left-5 top-24 z-50 border-2 border-[#4285f4] bg-white/85 px-4 py-3 font-mono text-[#4285f4] shadow-[6px_6px_0_#fbbc04] backdrop-blur-sm sm:left-8 sm:top-32 sm:px-5 sm:py-4">
      <div className="text-4xl font-black leading-none tracking-[0.08em] sm:text-6xl">
        {String(count).padStart(3, "0")}
      </div>
      <div className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#34a853] sm:text-xs">
        imágenes en el muro
      </div>
    </div>
  );
}

export default function WallRealtime({
  configured,
  initialImages,
  supabaseConfig,
  previewMode = false,
}: WallRealtimeProps) {
  const [images, setImages] = useState(() => initialImages);
  const [pollingEnabled, setPollingEnabled] = useState(() => configured && !supabaseConfig && !previewMode);

  useEffect(() => {
    if (!configured || !pollingEnabled) {
      return;
    }

    const refreshImages = async () => {
      try {
        const response = await fetch("/api/wall", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as WallApiResponse;

        if (!Array.isArray(data.images)) {
          return;
        }

        const validImages = data.images.filter(isWallImageRecord);

        setImages((currentImages) => mergeWallImages(currentImages, validImages));
      } catch {
        return;
      }
    };

    void refreshImages();
    const interval = window.setInterval(refreshImages, 15000);

    return () => window.clearInterval(interval);
  }, [configured, pollingEnabled]);

  useEffect(() => {
    if (!configured || !supabaseConfig) {
      return;
    }

    let active = true;
    const supabase = createClient(supabaseConfig.url, supabaseConfig.publishableKey);
    const channel = supabase
      .channel("wall_images_realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "wall_images",
        },
        (payload) => {
          const newImage = payload.new;

          if (!isWallImageRecord(newImage)) {
            return;
          }

          setImages((currentImages) => {
            if (currentImages.some((image) => image.id === newImage.id)) {
              return currentImages;
            }

            return [newImage, ...currentImages];
          });
        },
      )
      .subscribe((status) => {
        if (!active) {
          return;
        }

        if (status === "SUBSCRIBED") {
          setPollingEnabled(false);
          return;
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setPollingEnabled(true);
        }
      });

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [configured, supabaseConfig]);

  if (!configured) {
    return (
      <div className="relative z-10 flex min-h-dvh items-center justify-center p-6 text-center text-[#5f4500]">
        Falta configurar Supabase para cargar el muro.
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <>
        <WallImageCounter count={images.length} />
        <div className="relative z-10 flex min-h-dvh items-center justify-center p-8 text-center">
          <div className="max-w-md space-y-3">
            <p className="text-3xl font-black text-[#4285f4]">Aún no hay cards en el muro</p>
            <p className="text-sm leading-6 text-[#5f6368]">
              Cuando alguien autorice compartir su imagen generada, aparecerá aquí.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <WallImageCounter count={images.length} />
      <section className="absolute inset-0">
        {images.map((image, index) => (
          <article
            key={image.id}
            style={getCardStyle(image, index, images.length)}
            className="absolute w-[31vw] min-w-[104px] max-w-[190px] overflow-hidden rounded-[1rem] bg-black shadow-[0_20px_55px_rgba(60,64,67,0.26)] ring-[3px] ring-white transition duration-300 hover:z-50 hover:scale-110 sm:w-[18vw] md:w-[168px]"
          >
            <div className="relative aspect-[2/3]">
              <Image
                src={image.image_url}
                alt="Card compartida en el muro del evento"
                fill
                sizes="(max-width: 640px) 31vw, (max-width: 768px) 18vw, 168px"
                unoptimized
                className="object-cover"
              />
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
