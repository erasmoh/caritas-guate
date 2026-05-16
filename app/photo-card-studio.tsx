"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1620;
const CARD_BORDER = 68;
const COOLDOWN_MS = 60_000;
const CAMERA_IDLE_TIMEOUT_MS = 120_000;
const EVENT_NAME = "Build with AI Guatemala";
const EVENT_LOCATION_LABEL = "Guatemala";
const EVENT_CARD_LABEL = "GUATEMALA";
const EVENT_DATE = "16MAY26";
const DEFAULT_EVENT_UNLOCK_AT = "2026-05-16T00:00:00-06:00";
const EVENT_UNLOCK_AT = process.env.NEXT_PUBLIC_EVENT_UNLOCK_AT ?? DEFAULT_EVENT_UNLOCK_AT;
const DEV_UNLOCK_COOKIE = "build_ai_dev_unlock";
const GOOGLE_BLUE = "#4285f4";
const GOOGLE_RED = "#ea4335";
const GOOGLE_YELLOW = "#fbbc04";
const GOOGLE_GREEN = "#34a853";
const GOOGLE_COLORS = [GOOGLE_BLUE, GOOGLE_RED, GOOGLE_YELLOW, GOOGLE_GREEN];
const INK = "#111111";
const COMIC_WHITE = "#f8f8f2";
const COMIC_GRAY = "#8f8f86";
const PIXEL_FONT: Record<string, string[]> = {
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  " ": ["000", "000", "000", "000", "000", "000", "000"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "11100"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  G: ["01111", "10000", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
};

type PhotoArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type StatusMessage = {
  tone: "info" | "error" | "success";
  text: string;
};

function isLikelyMobileDevice() {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1;
}

function getEventUnlockTime() {
  const configuredTime = Date.parse(EVENT_UNLOCK_AT);

  return Number.isNaN(configuredTime) ? Date.parse(DEFAULT_EVENT_UNLOCK_AT) : configuredTime;
}

function hasCookie(name: string) {
  if (typeof document === "undefined") {
    return false;
  }

  return document.cookie.split("; ").some((cookie) => cookie.startsWith(`${name}=`));
}

function setDevUnlockCookie() {
  document.cookie = `${DEV_UNLOCK_COOKIE}=1; path=/; max-age=2592000; SameSite=Lax`;
}

function clearDevUnlockCookie() {
  document.cookie = `${DEV_UNLOCK_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

function formatCountdown(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    days,
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
  };
}

function luminance(red: number, green: number, blue: number) {
  return red * 0.299 + green * 0.587 + blue * 0.114;
}

function hexToRgb(hex: string) {
  const value = Number.parseInt(hex.slice(1), 16);

  return {
    red: (value >> 16) & 255,
    green: (value >> 8) & 255,
    blue: value & 255,
  };
}

function paintPixel(data: Uint8ClampedArray, index: number, color: string) {
  const { red, green, blue } = hexToRgb(color);

  data[index] = red;
  data[index + 1] = green;
  data[index + 2] = blue;
}

function ditherValue(x: number, y: number) {
  return (x * 17 + y * 31 + ((x ^ y) % 7) * 13) % 100;
}

function pickGooglePixelColor(
  red: number,
  green: number,
  blue: number,
  light: number,
  warm: number,
  edge: number,
  x: number,
  y: number,
) {
  const dither = ditherValue(x, y);
  const cool = blue * 0.95 + green * 0.25 - red * 0.6;
  const verdant = green * 0.9 - red * 0.25 - blue * 0.15;

  if (edge > 86 || light < 42) {
    return dither < 22 ? GOOGLE_BLUE : INK;
  }

  if (edge > 62 && dither < 46) {
    return dither < 20 ? GOOGLE_RED : INK;
  }

  if (light > 225) {
    return dither < 18 ? GOOGLE_YELLOW : COMIC_WHITE;
  }

  if (cool > 68) {
    return dither < 72 ? GOOGLE_BLUE : COMIC_GRAY;
  }

  if (verdant > 56) {
    return dither < 72 ? GOOGLE_GREEN : COMIC_WHITE;
  }

  if (warm > 170) {
    return dither < 46 ? GOOGLE_YELLOW : dither < 74 ? GOOGLE_RED : COMIC_WHITE;
  }

  if (light > 174) {
    return dither < 54 ? COMIC_WHITE : GOOGLE_YELLOW;
  }

  if (light > 122) {
    return dither < 30 ? GOOGLE_GREEN : dither < 62 ? GOOGLE_BLUE : COMIC_GRAY;
  }

  if (light > 82) {
    return dither < 38 ? GOOGLE_BLUE : dither < 68 ? GOOGLE_RED : COMIC_GRAY;
  }

  return dither < 42 ? GOOGLE_BLUE : INK;
}

function getPixelTextUnits(text: string) {
  return [...text.toUpperCase()].reduce((width, character, index) => {
    const glyph = PIXEL_FONT[character] ?? PIXEL_FONT[" "];

    return width + glyph[0].length + (index === text.length - 1 ? 0 : 1);
  }, 0);
}

function drawPixelText(
  context: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  centerY: number,
  maxWidth: number,
  maxScale: number,
  color: string,
) {
  const characters = [...text.toUpperCase()];
  const units = getPixelTextUnits(text);
  const scale = Math.max(1, Math.min(maxScale, Math.floor(maxWidth / units)));
  const width = units * scale;
  const height = 7 * scale;
  let x = centerX - width / 2;
  const y = centerY - height / 2;

  context.fillStyle = color;

  for (const [characterIndex, character] of characters.entries()) {
    const glyph = PIXEL_FONT[character] ?? PIXEL_FONT[" "];

    for (const [rowIndex, row] of glyph.entries()) {
      for (const [columnIndex, pixel] of [...row].entries()) {
        if (pixel === "1") {
          context.fillRect(Math.round(x + columnIndex * scale), Math.round(y + rowIndex * scale), scale, scale);
        }
      }
    }

    x += (glyph[0].length + (characterIndex === characters.length - 1 ? 0 : 1)) * scale;
  }
}

function drawComicVideo(
  context: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = width / height;
  let drawX = x;
  let drawY = y;
  let drawWidth = width;
  let drawHeight = height;

  if (sourceRatio > targetRatio) {
    drawHeight = width / sourceRatio;
    drawY = y + (height - drawHeight) / 2;
  } else {
    drawWidth = height * sourceRatio;
    drawX = x + (width - drawWidth) / 2;
  }

  const lowWidth = 188;
  const lowHeight = Math.round(lowWidth / sourceRatio);
  const pixelCanvas = document.createElement("canvas");
  pixelCanvas.width = lowWidth;
  pixelCanvas.height = lowHeight;

  const pixelContext = pixelCanvas.getContext("2d");

  if (!pixelContext) {
    return;
  }

  pixelContext.translate(lowWidth, 0);
  pixelContext.scale(-1, 1);
  pixelContext.drawImage(video, 0, 0, sourceWidth, sourceHeight, 0, 0, lowWidth, lowHeight);

  const pixels = pixelContext.getImageData(0, 0, lowWidth, lowHeight);
  const source = new Uint8ClampedArray(pixels.data);

  for (let index = 0; index < pixels.data.length; index += 4) {
    const pixel = index / 4;
    const px = pixel % lowWidth;
    const py = Math.floor(pixel / lowWidth);
    const red = pixels.data[index];
    const green = pixels.data[index + 1];
    const blue = pixels.data[index + 2];
    const light = luminance(red, green, blue);
    const warm = red * 0.85 + green * 0.7 - blue * 0.75;
    const right = px < lowWidth - 1 ? (py * lowWidth + px + 1) * 4 : index;
    const bottom = py < lowHeight - 1 ? ((py + 1) * lowWidth + px) * 4 : index;
    const edge =
      Math.abs(light - luminance(source[right], source[right + 1], source[right + 2])) +
      Math.abs(light - luminance(source[bottom], source[bottom + 1], source[bottom + 2]));

    paintPixel(pixels.data, index, pickGooglePixelColor(red, green, blue, light, warm, edge, px, py));
  }

  pixelContext.putImageData(pixels, 0, 0);

  context.imageSmoothingEnabled = false;
  context.drawImage(pixelCanvas, drawX, drawY, drawWidth, drawHeight);
  context.imageSmoothingEnabled = true;
}

function drawCardBackground(context: CanvasRenderingContext2D) {
  const photoX = CARD_BORDER;
  const photoY = CARD_BORDER;
  const photoWidth = CARD_WIDTH - CARD_BORDER * 2;
  const photoHeight = CARD_HEIGHT - CARD_BORDER * 2;

  GOOGLE_COLORS.forEach((color, index) => {
    const inset = index * 17;

    context.fillStyle = color;
    context.fillRect(inset, inset, CARD_WIDTH - inset * 2, CARD_HEIGHT - inset * 2);
  });

  context.fillStyle = INK;
  context.fillRect(CARD_BORDER, CARD_BORDER, CARD_WIDTH - CARD_BORDER * 2, CARD_HEIGHT - CARD_BORDER * 2);

  return {
    x: photoX,
    y: photoY,
    width: photoWidth,
    height: photoHeight,
  };
}

function drawCardChrome(context: CanvasRenderingContext2D, photoArea: PhotoArea) {
  const overlayHeight = 285;
  const overlayY = photoArea.y + photoArea.height - overlayHeight;
  const dateWidth = 250;
  const dateHeight = 70;

  context.strokeStyle = GOOGLE_BLUE;
  context.lineWidth = 18;
  context.strokeRect(photoArea.x - 2, photoArea.y - 2, photoArea.width + 4, photoArea.height + 4);
  context.strokeStyle = INK;
  context.lineWidth = 8;
  context.strokeRect(photoArea.x + 18, photoArea.y + 18, photoArea.width - 36, photoArea.height - 36);

  const gradient = context.createLinearGradient(0, overlayY - 90, 0, photoArea.y + photoArea.height);
  gradient.addColorStop(0, "rgba(17, 17, 17, 0)");
  gradient.addColorStop(0.32, "rgba(17, 17, 17, 0.72)");
  gradient.addColorStop(1, "rgba(17, 17, 17, 0.96)");
  context.fillStyle = gradient;
  context.fillRect(photoArea.x, overlayY - 90, photoArea.width, overlayHeight + 90);

  const stripeWidth = (photoArea.width - 68) / GOOGLE_COLORS.length;

  GOOGLE_COLORS.forEach((color, index) => {
    context.fillStyle = color;
    context.fillRect(photoArea.x + 34 + stripeWidth * index, overlayY + 24, stripeWidth + 1, 12);
  });

  context.fillStyle = GOOGLE_YELLOW;
  context.fillRect(CARD_WIDTH / 2 - dateWidth / 2, overlayY + 58, dateWidth, dateHeight);
  context.strokeStyle = INK;
  context.lineWidth = 7;
  context.strokeRect(CARD_WIDTH / 2 - dateWidth / 2 + 6, overlayY + 64, dateWidth - 12, dateHeight - 12);

  drawPixelText(context, EVENT_DATE, CARD_WIDTH / 2, overlayY + 93, dateWidth - 36, 7, INK);
  drawPixelText(context, "BUILD WITH AI", CARD_WIDTH / 2, overlayY + 176, photoArea.width - 92, 10, GOOGLE_BLUE);
  drawPixelText(context, EVENT_CARD_LABEL, CARD_WIDTH / 2, overlayY + 242, photoArea.width - 124, 8, GOOGLE_GREEN);

  context.fillStyle = GOOGLE_RED;
  context.fillRect(photoArea.x + 34, photoArea.y + photoArea.height - 38, 118, 14);
  context.fillStyle = GOOGLE_YELLOW;
  context.fillRect(photoArea.x + photoArea.width - 152, photoArea.y + photoArea.height - 38, 118, 14);
}

function drawCoverImage(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  area: PhotoArea,
) {
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = area.width / area.height;
  let sx = 0;
  let sy = 0;
  let sw = sourceWidth;
  let sh = sourceHeight;

  if (sourceRatio > targetRatio) {
    sw = sourceHeight * targetRatio;
    sx = (sourceWidth - sw) / 2;
  } else {
    sh = sourceWidth / targetRatio;
    sy = (sourceHeight - sh) * 0.38;
  }

  context.drawImage(image, sx, sy, sw, sh, area.x, area.y, area.width, area.height);
}

function drawCard(context: CanvasRenderingContext2D, video: HTMLVideoElement) {
  const photoArea = drawCardBackground(context);

  drawComicVideo(context, video, photoArea.x, photoArea.y, photoArea.width, photoArea.height);
  drawCardChrome(context, photoArea);
}

function drawCardWithPortrait(context: CanvasRenderingContext2D, image: HTMLImageElement) {
  const photoArea = drawCardBackground(context);

  drawCoverImage(context, image, image.naturalWidth, image.naturalHeight, photoArea);
  drawCardChrome(context, photoArea);
}

function captureSourceImage(video: HTMLVideoElement) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const width = 1024;
  const height = 1024;

  if (!context) {
    return null;
  }

  canvas.width = width;
  canvas.height = height;

  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = width / height;
  let dx = 0;
  let dy = 0;
  let dw = width;
  let dh = height;

  if (sourceRatio > targetRatio) {
    dh = width / sourceRatio;
    dy = (height - dh) / 2;
  } else {
    dw = height * sourceRatio;
    dx = (width - dw) / 2;
  }

  context.fillStyle = "#0f0f0f";
  context.fillRect(0, 0, width, height);
  context.translate(width, 0);
  context.scale(-1, 1);
  context.drawImage(video, 0, 0, sourceWidth, sourceHeight, dx, dy, dw, dh);

  return canvas.toDataURL("image/jpeg", 0.92);
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

export default function PhotoCardStudio() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraIdleTimeoutRef = useRef<number | null>(null);
  const generationInFlightRef = useRef(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [loaderStep, setLoaderStep] = useState(0);
  const [devUnlocked, setDevUnlocked] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [status, setStatus] = useState<StatusMessage>({
    tone: "info",
    text: "Toca Activar cámara para que el navegador solicite permiso de acceso.",
  });
  const eventUnlockTime = getEventUnlockTime();
  const gateLocked = now < eventUnlockTime && !devUnlocked;
  const countdown = formatCountdown(eventUnlockTime - now);
  const cooldownRemainingSeconds = cooldownUntil ? Math.max(0, Math.ceil((cooldownUntil - now) / 1000)) : 0;
  const canGenerate = cooldownRemainingSeconds === 0 && !isGenerating;

  const clearCameraIdleTimer = useCallback(() => {
    if (cameraIdleTimeoutRef.current === null) {
      return;
    }

    window.clearTimeout(cameraIdleTimeoutRef.current);
    cameraIdleTimeoutRef.current = null;
  }, []);

  const stopCamera = useCallback(() => {
    clearCameraIdleTimer();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [clearCameraIdleTimer]);

  const resetCameraIdleTimer = useCallback(() => {
    clearCameraIdleTimer();

    if (!streamRef.current) {
      return;
    }

    const stopWhenIdle = () => {
      if (!streamRef.current) {
        cameraIdleTimeoutRef.current = null;
        return;
      }

      if (generationInFlightRef.current) {
        cameraIdleTimeoutRef.current = window.setTimeout(stopWhenIdle, CAMERA_IDLE_TIMEOUT_MS);
        return;
      }

      stopCamera();
      setCameraReady(false);
      setStatus({
        tone: "info",
        text: "Apagué la cámara por inactividad para ahorrar batería. Toca Activar cámara para volver a usarla.",
      });
    };

    cameraIdleTimeoutRef.current = window.setTimeout(stopWhenIdle, CAMERA_IDLE_TIMEOUT_MS);
  }, [clearCameraIdleTimer, stopCamera]);

  const startCamera = useCallback(async () => {
    await Promise.resolve();

    const isMobile = isLikelyMobileDevice();

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus({
        tone: "error",
        text: "Este navegador no permite acceder a la cámara. Prueba con Safari o Chrome actualizado.",
      });
      return;
    }

    try {
      stopCamera();
      setCameraReady(false);
      setSourceImage(null);
      setCapturedImage(null);
      setIsShareDialogOpen(false);
      setStatus({
        tone: "info",
        text: isMobile
          ? "Detecté un dispositivo móvil. Acepta el permiso para abrir la cámara frontal."
          : "Detecté un navegador de escritorio. Acepta el permiso para abrir tu cámara.",
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "user" },
          width: { ideal: 1280 },
          height: { ideal: 960 },
          aspectRatio: { ideal: 4 / 3 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      resetCameraIdleTimer();
      setStatus({
        tone: "success",
        text: "Cámara lista. Centra tu cara y captura la card.",
      });
    } catch {
      setStatus({
        tone: "error",
        text: "No pude abrir la cámara. Revisa permisos del navegador o intenta desde Safari/Chrome móvil.",
      });
    }
  }, [resetCameraIdleTimer, stopCamera]);

  useEffect(() => {
    return stopCamera;
  }, [stopCamera]);

  useEffect(() => {
    if (!cameraReady) {
      return;
    }

    const reset = () => resetCameraIdleTimer();

    window.addEventListener("pointerdown", reset);
    window.addEventListener("keydown", reset);
    window.addEventListener("touchstart", reset);

    return () => {
      window.removeEventListener("pointerdown", reset);
      window.removeEventListener("keydown", reset);
      window.removeEventListener("touchstart", reset);
    };
  }, [cameraReady, resetCameraIdleTimer]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "hidden" || !streamRef.current) {
        return;
      }

      stopCamera();
      setCameraReady(false);
      setStatus({
        tone: "info",
        text: "Pausé la cámara porque la página quedó en segundo plano. Toca Activar cámara para continuar.",
      });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [stopCamera]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);

      if (params.get("dev") === "1") {
        setDevUnlockCookie();
        setDevUnlocked(true);
        return;
      }

      if (params.get("dev_lock") === "1") {
        clearDevUnlockCookie();
        setDevUnlocked(false);
        return;
      }

      setDevUnlocked(hasCookie(DEV_UNLOCK_COOKIE));
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!gateLocked) {
      return;
    }

    const interval = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(interval);
  }, [gateLocked]);

  useEffect(() => {
    if (!isGenerating) {
      return;
    }

    const interval = window.setInterval(() => {
      setLoaderStep((step) => (step + 1) % 4);
    }, 260);

    return () => window.clearInterval(interval);
  }, [isGenerating]);

  useEffect(() => {
    if (!cooldownUntil) {
      return;
    }

    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    const timeout = window.setTimeout(() => {
      setCooldownUntil(null);
      setNow(Date.now());
    }, Math.max(0, cooldownUntil - Date.now()));

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [cooldownUntil]);

  const drawLocalFallback = (video: HTMLVideoElement) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    canvas.width = CARD_WIDTH;
    canvas.height = CARD_HEIGHT;
    drawCard(context, video);
    setCapturedImage(canvas.toDataURL("image/png"));
  };

  const captureCard = () => {
    resetCameraIdleTimer();

    const video = videoRef.current;

    if (capturedImage) {
      setCapturedImage(null);
      setIsShareDialogOpen(false);
      setStatus({
        tone: "info",
        text: "Cámara lista. Centra tu cara y vuelve a capturar.",
      });
      return;
    }

    if (cooldownRemainingSeconds > 0) {
      setStatus({
        tone: "info",
        text: `Podrás generar otra imagen en ${cooldownRemainingSeconds}s.`,
      });
      return;
    }

    if (!video || !video.videoWidth || !video.videoHeight) {
      setStatus({
        tone: "error",
        text: "La cámara aún no está lista para capturar.",
      });
      return;
    }

    const source = captureSourceImage(video);

    if (!source) {
      setStatus({
        tone: "error",
        text: "No pude preparar la captura para IA. Intenta nuevamente.",
      });
      return;
    }

    setSourceImage(source);
    setCapturedImage(null);
    void generateAiCard(source, video);
  };

  const generateAiCard = async (imageDataUrl = sourceImage, fallbackVideo?: HTMLVideoElement) => {
    resetCameraIdleTimer();

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const remaining = cooldownUntil ? Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000)) : 0;

    if (generationInFlightRef.current) {
      return;
    }

    if (remaining > 0) {
      setStatus({
        tone: "info",
        text: `Podrás generar otra imagen en ${remaining}s.`,
      });
      return;
    }

    if (!imageDataUrl || !canvas || !context) {
      setStatus({
        tone: "error",
        text: "Primero captura una foto para generar el arte con IA.",
      });
      return;
    }

    try {
      generationInFlightRef.current = true;
      setIsGenerating(true);
      setStatus({
        tone: "info",
        text: "Generando retrato 16-bit con IA. Esto puede tardar unos segundos.",
      });

      const response = await fetch("/api/generate-card", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageDataUrl,
        }),
      });
      const data = (await response.json()) as {
        imageDataUrl?: string;
        error?: string;
        configured?: boolean;
      };

      if (!response.ok || !data.imageDataUrl) {
        if (fallbackVideo) {
          drawLocalFallback(fallbackVideo);
        }

        setStatus({
          tone: data.configured === false ? "info" : "error",
          text: data.error ?? "No pude generar el retrato con IA. Dejé una versión local como respaldo.",
        });
        return;
      }

      const portrait = await loadImage(data.imageDataUrl);
      canvas.width = CARD_WIDTH;
      canvas.height = CARD_HEIGHT;
      drawCardWithPortrait(context, portrait);
      setCapturedImage(canvas.toDataURL("image/png"));
      setCooldownUntil(Date.now() + COOLDOWN_MS);
      setNow(Date.now());
      setStatus({
        tone: "success",
        text: "Retrato 16-bit generado con IA. Podrás generar otro en 60s.",
      });
    } catch {
      if (fallbackVideo) {
        drawLocalFallback(fallbackVideo);
      }

      setStatus({
        tone: "error",
        text: "No pude generar el retrato con IA. Dejé una versión local como respaldo.",
      });
    } finally {
      generationInFlightRef.current = false;
      setIsGenerating(false);
    }
  };

  const downloadCard = () => {
    resetCameraIdleTimer();

    if (!capturedImage) {
      return;
    }

    const link = document.createElement("a");
    link.href = capturedImage;
    link.download = "build-with-ai-guatemala-card.png";
    link.click();
  };

  const openShareDialog = () => {
    resetCameraIdleTimer();

    if (!capturedImage) {
      return;
    }

    setIsShareDialogOpen(true);
  };

  const shareToWall = async () => {
    resetCameraIdleTimer();

    if (!capturedImage || isSharing) {
      return;
    }

    try {
      setIsSharing(true);
      setStatus({
        tone: "info",
        text: "Enviando la imagen generada al muro del evento.",
      });

      const response = await fetch("/api/wall", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageDataUrl: capturedImage,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No pude enviar la imagen al muro.");
      }

      setIsShareDialogOpen(false);
      setStatus({
        tone: "success",
        text: "Imagen enviada al muro del evento. Gracias por compartir tu card.",
      });
    } catch (error) {
      setStatus({
        tone: "error",
        text: error instanceof Error ? error.message : "No pude enviar la imagen al muro.",
      });
    } finally {
      setIsSharing(false);
    }
  };

  if (gateLocked) {
    return (
      <main className="relative flex min-h-dvh flex-col overflow-hidden bg-[#f8fafd] text-[#202124]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_12%,rgba(66,133,244,0.22),transparent_30%),radial-gradient(circle_at_85%_18%,rgba(234,67,53,0.18),transparent_28%),radial-gradient(circle_at_75%_82%,rgba(251,188,4,0.26),transparent_30%),radial-gradient(circle_at_16%_88%,rgba(52,168,83,0.18),transparent_28%)]" />
        <section className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-8 px-5 py-10 text-center">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#4285f4]/25 bg-white/80 px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.24em] text-[#4285f4] shadow-[0_16px_45px_rgba(60,64,67,0.12)]">
            {EVENT_NAME} · {EVENT_DATE}
          </div>
          <div className="space-y-4">
            <h1 className="text-5xl font-black leading-[0.92] tracking-[-0.06em] text-[#4285f4] sm:text-7xl">
              Disponible el 16 de mayo
            </h1>
            <p className="mx-auto max-w-xl text-base leading-7 text-[#5f6368] sm:text-lg">
              La cámara y generación de cards se habilitarán automáticamente para {EVENT_NAME}.
            </p>
          </div>

          <div className="grid w-full max-w-xl grid-cols-4 gap-2 font-mono">
            {[
              ["Días", countdown.days],
              ["Horas", countdown.hours],
              ["Min", countdown.minutes],
              ["Seg", countdown.seconds],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-[#dadce0] bg-white/85 px-3 py-4 shadow-[0_16px_45px_rgba(60,64,67,0.10)]">
                <div className="text-3xl font-black text-[#34a853] sm:text-5xl">{value}</div>
                <div className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#5f6368]">{label}</div>
              </div>
            ))}
          </div>
        </section>
        <footer className="relative z-10 border-t border-[#dadce0] bg-white/75 px-5 py-5 text-center font-mono text-xs leading-6 text-[#5f6368] backdrop-blur sm:text-sm">
          Creado por{" "}
          <a
            href="https://erasmoh.dev"
            target="_blank"
            rel="noreferrer"
            className="font-black text-[#4285f4] underline decoration-[#4285f4]/40 underline-offset-4 transition hover:text-[#ea4335]"
          >
            @ErasmoHernandez
          </a>
          , con amor para {EVENT_NAME} ·{" "}
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

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-[#f8fafd] text-[#202124]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,rgba(66,133,244,0.22),transparent_30%),radial-gradient(circle_at_88%_18%,rgba(234,67,53,0.16),transparent_26%),radial-gradient(circle_at_76%_86%,rgba(251,188,4,0.26),transparent_30%),radial-gradient(circle_at_12%_78%,rgba(52,168,83,0.16),transparent_28%)]" />
      <section className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-5 px-5 py-6 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:grid-rows-[auto_auto] lg:items-center lg:gap-8 lg:py-10">
        <div className="flex flex-col gap-5 lg:col-start-1 lg:row-start-1">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#4285f4]/25 bg-white/85 px-4 py-2 text-sm font-bold uppercase tracking-[0.24em] text-[#4285f4] shadow-[0_16px_45px_rgba(60,64,67,0.12)]">
            {EVENT_NAME}
          </div>
          <div className="space-y-4">
            <h1 className="max-w-xl text-5xl font-black leading-[0.92] tracking-[-0.06em] text-[#4285f4] sm:text-7xl">
              Tu cara en una card 16-bit con IA
            </h1>
            <p className="max-w-lg text-base leading-7 text-[#5f6368] sm:text-lg">
              Usa la cámara frontal, captura tu foto y genera automáticamente un retrato pixel con la energía Google de {EVENT_NAME}.
            </p>
          </div>

          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-medium shadow-[0_12px_35px_rgba(60,64,67,0.10)] ${
              status.tone === "error"
                ? "border-[#ea4335]/35 bg-[#ea4335]/10 text-[#a50e0e]"
                : status.tone === "success"
                  ? "border-[#34a853]/35 bg-[#34a853]/10 text-[#137333]"
                  : "border-[#fbbc04]/45 bg-[#fbbc04]/16 text-[#5f4500]"
            }`}
          >
            {status.text}
          </div>
        </div>

        <div className="mx-auto w-full max-w-[430px] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:max-w-[460px]">
          <div className="rounded-[2rem] border border-[#dadce0] bg-white/85 p-3 shadow-[0_26px_80px_rgba(60,64,67,0.18)]">
            <div className="relative aspect-[2/3] overflow-hidden rounded-[1.55rem] border-[10px] border-[#4285f4] bg-black font-mono shadow-[inset_0_0_0_5px_#34a853]">
              <video
                ref={videoRef}
                className="absolute inset-0 h-full w-full scale-x-[-1] bg-black object-contain"
                muted
                playsInline
                autoPlay
                onCanPlay={() => {
                  setCameraReady(true);
                  resetCameraIdleTimer();
                }}
              />
              {capturedImage ? (
                <Image
                  src={capturedImage}
                  alt={`Card final 16-bit de ${EVENT_NAME}`}
                  fill
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent px-4 pb-5 pt-20 text-center">
                  <span className="mb-2 inline-flex bg-[#fbbc04] px-3 py-1 text-xs font-black tracking-[0.18em] text-black">
                    {EVENT_DATE}
                  </span>
                  <p className="text-xl font-black tracking-[0.02em] text-[#4285f4]">
                    BUILD WITH AI
                  </p>
                  <p className="text-sm font-black uppercase tracking-[0.2em] text-[#34a853]">
                    {EVENT_LOCATION_LABEL}
                  </p>
                </div>
              )}
              {isGenerating && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/72 px-8 text-center backdrop-blur-[2px]">
                  <div className="flex items-center gap-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <span
                        key={index}
                        className={`h-3.5 w-3.5 rounded-full transition-colors duration-200 ${
                          loaderStep === index
                            ? "bg-[#4285f4]"
                            : (loaderStep + index) % 2 === 0
                              ? "bg-[#fbbc04]"
                              : "bg-[#34a853]"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-[#fbbc04]">
                    Generando retrato 16-bit
                  </p>
                </div>
              )}
              <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_4px_rgba(0,0,0,0.7)]" />
            </div>
            <p className="mt-3 text-center text-xs font-bold uppercase tracking-[0.18em] text-[#5f6368]">
              {capturedImage ? "Resultado final" : isGenerating ? "Generando" : "Cámara frontal"}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:col-start-1 lg:row-start-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={startCamera}
              className="rounded-xl bg-[#4285f4] px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white shadow-[0_14px_30px_rgba(66,133,244,0.30)] transition hover:scale-[1.01] hover:bg-[#3367d6]"
            >
              {cameraReady ? "Reactivar cámara" : "Activar cámara"}
            </button>
            <button
              type="button"
              onClick={captureCard}
              disabled={!cameraReady || !canGenerate}
              className="rounded-xl border-2 border-[#34a853] bg-white/75 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-[#137333] transition hover:scale-[1.01] hover:bg-[#34a853] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 disabled:hover:bg-white/75 disabled:hover:text-[#137333]"
            >
              {isGenerating
                ? "Generando..."
                : cooldownRemainingSeconds > 0
                  ? `${cooldownRemainingSeconds}s`
                  : capturedImage
                    ? "Nueva captura"
                    : "Capturar"}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={downloadCard}
              disabled={!capturedImage}
              className="rounded-lg border border-[#ea4335] bg-white/70 px-3 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-[#c5221f] transition hover:bg-[#ea4335] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/70 disabled:hover:text-[#c5221f]"
            >
              Descargar
            </button>
            <button
              type="button"
              onClick={openShareDialog}
              disabled={!capturedImage || isSharing}
              className="rounded-lg border border-[#fbbc04] bg-white/70 px-3 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-[#5f4500] transition hover:bg-[#fbbc04] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/70"
            >
              {isSharing ? "Enviando..." : "Enviar al muro"}
            </button>
          </div>
          {cooldownRemainingSeconds > 0 && (
            <p className="text-xs font-medium text-[#5f6368]">
              Límite activo: podrás generar otra imagen en {cooldownRemainingSeconds}s.
            </p>
          )}
          {cameraReady && (
            <p className="text-xs font-medium text-[#5f6368]">
              La cámara se apaga tras 2 minutos sin actividad o al dejar la página en segundo plano.
            </p>
          )}
        </div>
      </section>
      <footer className="relative z-10 border-t border-[#dadce0] bg-white/75 px-5 py-5 text-center font-mono text-xs leading-6 text-[#5f6368] backdrop-blur sm:text-sm">
        Creado por{" "}
        <a
          href="https://erasmoh.dev"
          target="_blank"
          rel="noreferrer"
          className="font-black text-[#4285f4] underline decoration-[#4285f4]/40 underline-offset-4 transition hover:text-[#ea4335]"
        >
          @ErasmoHernandez
        </a>
        , con amor para {EVENT_NAME} ·{" "}
        <a
          href="https://erasmoh.dev"
          target="_blank"
          rel="noreferrer"
          className="font-black text-[#34a853] underline decoration-[#34a853]/40 underline-offset-4 transition hover:text-[#fbbc04]"
        >
          erasmoh.dev
        </a>
      </footer>
      {isShareDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-5 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-wall-title"
            className="w-full max-w-md rounded-[2rem] border border-[#4285f4]/35 bg-white p-6 text-[#202124] shadow-2xl"
          >
            <div className="space-y-4">
              <div className="inline-flex rounded-full bg-[#fbbc04] px-3 py-1 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-black">
                Confirmación
              </div>
              <h2 id="share-wall-title" className="text-2xl font-black leading-tight text-[#4285f4]">
                Enviar al muro
              </h2>
              <p className="text-sm leading-6 text-[#5f6368]">
                ¿Autorizas a compartir la imagen generada en el muro del evento? Quedará almacenada SOLO LA IMAGEN
                GENERADA, la foto de tu rostro real nunca sale de tu dispositivo.
              </p>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setIsShareDialogOpen(false)}
                disabled={isSharing}
                className="rounded-xl border border-[#dadce0] px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-[#5f6368] transition hover:bg-[#f1f3f4] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={shareToWall}
                disabled={isSharing}
                className="rounded-xl bg-[#4285f4] px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-[#3367d6] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSharing ? "Enviando..." : "Sí, enviar"}
              </button>
            </div>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </main>
  );
}
