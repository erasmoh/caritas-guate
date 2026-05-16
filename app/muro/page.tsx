import Image from "next/image";
import {
  getSupabaseBrowserConfig,
  listWallImages,
  shuffleWallImages,
  SupabaseWallConfigError,
  type SupabaseBrowserConfig,
  type WallImageRecord,
} from "../lib/wall";
import WallRealtime from "./wall-realtime";

export const dynamic = "force-dynamic";

type WallPageState =
  | {
      configured: true;
      images: WallImageRecord[];
      supabaseConfig: SupabaseBrowserConfig | null;
    }
  | {
      configured: false;
      images: [];
      supabaseConfig: null;
    };

type MuroPageProps = {
  searchParams: Promise<{
    preview?: string | string[] | undefined;
  }>;
};

function getPreviewCount(searchParams: Awaited<MuroPageProps["searchParams"]>) {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const value = Array.isArray(searchParams.preview) ? searchParams.preview[0] : searchParams.preview;
  const count = value === "true" || value === "1" ? 80 : Number.parseInt(value ?? "", 10);

  return Number.isFinite(count) && count > 0 ? Math.min(count, 160) : null;
}

function makePreviewWallImages(count: number): WallImageRecord[] {
  const now = new Date().toISOString();

  return Array.from({ length: count }, (_, index) => ({
    id: `preview-${index + 1}`,
    image_url: `/style-reference.png?preview=${index + 1}`,
    storage_path: `preview/${index + 1}.png`,
    image_hash: `preview-${index + 1}`,
    created_at: now,
    updated_at: new Date(Date.now() + index * 1000).toISOString(),
  }));
}

async function getWallPageState(): Promise<WallPageState> {
  try {
    return {
      configured: true,
      images: shuffleWallImages(await listWallImages()),
      supabaseConfig: getSupabaseBrowserConfig(),
    };
  } catch (error) {
    if (error instanceof SupabaseWallConfigError) {
      return {
        configured: false,
        images: [],
        supabaseConfig: null,
      };
    }

    throw error;
  }
}

export default async function MuroPage({ searchParams }: MuroPageProps) {
  const previewCount = getPreviewCount(await searchParams);
  const state =
    previewCount === null
      ? await getWallPageState()
      : {
          configured: true,
          images: makePreviewWallImages(previewCount),
          supabaseConfig: null,
        };

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#f8fafd] text-[#202124]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(66,133,244,0.22),transparent_34%),radial-gradient(circle_at_top_right,rgba(234,67,53,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(251,188,4,0.24),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(52,168,83,0.18),transparent_28%)]" />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-50 flex items-start justify-between gap-6 bg-gradient-to-b from-white/95 via-white/70 to-transparent p-5 pb-20 sm:p-8 sm:pb-24">
        <h1
          className="max-w-[calc(100%-8rem)] text-2xl font-black uppercase leading-[0.98] tracking-[0.08em] text-[#4285f4] [font-variant-ligatures:none] [text-shadow:3px_3px_0_rgba(251,188,4,0.9)] sm:max-w-[calc(100%-11rem)] sm:text-4xl lg:text-5xl"
          style={{
            fontFamily:
              "'Courier New', Courier, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
          }}
        >
          MURO BUILD WITH AI - GUATEMALA
        </h1>
        <div className="shrink-0 border-4 border-[#34a853] bg-white p-2 shadow-[0_18px_55px_rgba(60,64,67,0.22)] sm:p-3">
          <Image
            src="/qr-guate-caritas.png"
            alt="QR para generar tu imagen de Build with AI Guatemala"
            width={144}
            height={144}
            priority
            className="h-24 w-24 object-contain sm:h-36 sm:w-36"
          />
        </div>
      </header>

      <WallRealtime
        configured={state.configured}
        initialImages={state.images}
        supabaseConfig={state.supabaseConfig}
        previewMode={previewCount !== null}
      />
      <footer className="pointer-events-auto absolute inset-x-0 bottom-0 z-50 border-t border-[#dadce0] bg-white/80 px-5 py-4 text-center font-mono text-xs leading-6 text-[#5f6368] backdrop-blur-sm sm:text-sm">
        Creado por{" "}
        <a
          href="https://erasmoh.dev"
          target="_blank"
          rel="noreferrer"
          className="font-black text-[#4285f4] underline decoration-[#4285f4]/40 underline-offset-4 transition hover:text-[#ea4335]"
        >
          @ErasmoHernandez
        </a>
        , con amor para Build with AI Guatemala ·{" "}
        <a
          href="https://erasmoh.dev"
          target="_blank"
          rel="noreferrer"
          className="font-black text-[#34a853] underline decoration-[#34a853]/40 underline-offset-4 transition hover:text-[#fbbc04]"
        >
          erasmoh.dev
        </a>
      </footer>
    </main>
  );
}
