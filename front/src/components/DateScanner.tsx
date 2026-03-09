"use client";

/**
 * DateScanner — flux vidéo temps réel avec OCR Tesseract WASM.
 *
 * Analyse les frames de la caméra arrière toutes les SCAN_INTERVAL_MS.
 * Seule la zone du cadre de ciblage est envoyée à Tesseract (crop canvas)
 * pour réduire la charge CPU/batterie.
 *
 * Quand une date est détectée avec une confiance suffisante, elle est affichée
 * en overlay et l'utilisateur peut la confirmer d'un tap.
 *
 * Design :
 * - Un seul useEffect paramétré par `scanKey` gère tout le cycle de vie
 *   (init Tesseract, accès caméra, boucle d'analyse, cleanup).
 * - `handleRetry` incrémente `scanKey` : React exécute le cleanup de l'effet
 *   précédent (stop stream + terminate worker) puis remonte proprement.
 * - Pas de useCallback utilisé comme dépendance de useEffect : évite les
 *   re-déclenchements accidentels si une dépendance devenait instable.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { createWorker, PSM } from "tesseract.js";
import type { Worker as TesseractWorker } from "tesseract.js";
import { parseDateFromOcrText } from "@/utils/datePatterns";
import {
  Camera,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ScanLine,
} from "lucide-react";

// Intervalle entre deux analyses OCR (ms). 900ms = bon compromis réactivité/batterie.
const SCAN_INTERVAL_MS = 900;

// Nombre de fois qu'une même date doit être détectée consécutivement
// avant d'être considérée comme confirmée.
const CONFIRM_THRESHOLD = 2;

// Dimensions du cadre de ciblage en proportion de la surface vidéo
const VIEWFINDER_HEIGHT_RATIO = 0.35;
const VIEWFINDER_WIDTH_RATIO = 0.85;

// Largeur maximale du canvas envoyé à Tesseract après upscale (Fix 4).
// Évite l'explosion mémoire sur les appareils filmant en haute résolution.
const MAX_CANVAS_WIDTH = 1600;

/**
 * Preprocessing image en pur canvas 2D — reproduit le pipeline sharp du backend :
 *   1. Niveaux de gris (luminance Rec. 601)
 *   2. Normalize : étire l'histogramme sur [0, 255]
 *   3. Contraste fort : pixel = clamp(pixel × 2 − 80, 0, 255)
 *   4. Sharpen : kernel de convolution 3×3 unsharp-mask léger
 *
 * Toutes les opérations sont faites sur le même canvas (en place) via ImageData.
 * Aucune dépendance supplémentaire.
 */
function preprocessCanvas(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const d = imageData.data; // Uint8ClampedArray, layout RGBA par pixel

  // ── 1. Niveaux de gris + 2. Normalize (deux passes) ───────────────────────
  // Première passe : convertir en gris et trouver min/max
  const gray = new Uint8Array(width * height);
  let min = 255;
  let max = 0;

  for (let i = 0; i < gray.length; i++) {
    const r = d[i * 4];
    const g = d[i * 4 + 1];
    const b = d[i * 4 + 2];
    // Luminance Rec. 601 (entiers pour performance)
    const v = (77 * r + 150 * g + 29 * b) >> 8;
    gray[i] = v;
    if (v < min) {
      min = v;
    }
    if (v > max) {
      max = v;
    }
  }

  // Deuxième passe : normalize + contraste
  const range = max - min || 1; // évite division par zéro sur image uniforme

  for (let i = 0; i < gray.length; i++) {
    // Normalize : étirer sur [0, 255]
    let v = Math.round(((gray[i] - min) / range) * 255);
    // Contraste : v = clamp(v * 2 - 80, 0, 255) — identique à sharp.linear(2.0, -80)
    v = Math.min(255, Math.max(0, v * 2 - 80));
    gray[i] = v;
  }

  // ── 3. Sharpen : unsharp-mask 3×3 ─────────────────────────────────────────
  // Kernel :  0 -1  0
  //          -1  5 -1
  //           0 -1  0
  // Équivalent à un léger sharpen (σ≈1) sans bibliothèque.
  const sharpened = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const center = gray[idx] * 5;
      const top = y > 0 ? gray[(y - 1) * width + x] : gray[idx];
      const bottom = y < height - 1 ? gray[(y + 1) * width + x] : gray[idx];
      const left = x > 0 ? gray[y * width + (x - 1)] : gray[idx];
      const right = x < width - 1 ? gray[y * width + (x + 1)] : gray[idx];
      sharpened[idx] = Math.min(
        255,
        Math.max(0, center - top - bottom - left - right),
      );
    }
  }

  // ── Réécriture des pixels RGBA (image en niveaux de gris) ─────────────────
  for (let i = 0; i < sharpened.length; i++) {
    const v = sharpened[i];
    d[i * 4] = v; // R
    d[i * 4 + 1] = v; // G
    d[i * 4 + 2] = v; // B
    // Alpha inchangé
  }

  ctx.putImageData(imageData, 0, 0);
}

interface Props {
  onCapture: (isoDate: string) => void;
}

type ScannerState =
  | "initializing" // Chargement du worker Tesseract + accès caméra
  | "scanning" // Analyse en cours frame-by-frame
  | "detected" // Date confirmée, en attente de validation utilisateur
  | "camera_error" // getUserMedia échoué
  | "ocr_error"; // Impossible d'initialiser Tesseract

export function DateScanner({ onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // scanKey pilote le useEffect : incrémenter = relancer un cycle complet
  const [scanKey, setScanKey] = useState(0);

  const [scannerState, setScannerState] =
    useState<ScannerState>("initializing");
  const [detectedDate, setDetectedDate] = useState<string | null>(null);
  const [detectedDateDisplay, setDetectedDateDisplay] = useState<string | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ── Cycle de vie complet : init → scan → cleanup ─────────────────────────
  useEffect(() => {
    // Flag local au closure : évite de mettre à jour le state après unmount
    // ou après que le cleanup ait été déclenché (retry).
    let cancelled = false;

    // Refs locales pour le cleanup — les refs du composant sont partagées
    // avec le reste du rendu, on stocke aussi localement pour être sûr.
    let worker: TesseractWorker | null = null;
    let stream: MediaStream | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    // Compteurs de détection consécutive (pas de state : inutile de re-render)
    let consecutiveMatch = 0;
    let lastDetected: string | null = null;

    function formatDisplay(iso: string): string {
      return new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    }

    async function analyzeFrame() {
      if (
        cancelled ||
        !videoRef.current ||
        !canvasRef.current ||
        !worker ||
        videoRef.current.readyState < 2
      ) {
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (vw === 0 || vh === 0) {
        return;
      }

      // Crop sur la zone du cadre de ciblage
      const cropW = Math.round(vw * VIEWFINDER_WIDTH_RATIO);
      const cropH = Math.round(vh * VIEWFINDER_HEIGHT_RATIO);
      const cropX = Math.round((vw - cropW) / 2);
      const cropY = Math.round((vh - cropH) / 2);

      // Fix 4 — upscale ×2 avec plafond à MAX_CANVAS_WIDTH
      const scale = Math.min(2, MAX_CANVAS_WIDTH / cropW);
      canvas.width = Math.round(cropW * scale);
      canvas.height = Math.round(cropH * scale);
      ctx.drawImage(
        video,
        cropX,
        cropY,
        cropW,
        cropH,
        0,
        0,
        canvas.width,
        canvas.height,
      );

      // Fix 1 — preprocessing : grayscale + normalize + contraste + sharpen
      preprocessCanvas(canvas);

      try {
        // Fix 2 — tentative 1 : PSM SINGLE_BLOCK (optimal pour texte court)
        await worker.setParameters({
          tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
        });
        const { data: data1 } = await worker.recognize(canvas);
        if (cancelled) {
          return;
        }

        let iso = parseDateFromOcrText(data1.text);

        // Fix 2 — tentative 2 : PSM AUTO si SINGLE_BLOCK n'a rien trouvé
        if (!iso) {
          await worker.setParameters({
            tessedit_pageseg_mode: PSM.AUTO,
          });
          const { data: data2 } = await worker.recognize(canvas);
          if (cancelled) {
            return;
          }
          iso = parseDateFromOcrText(data2.text);
        }

        if (iso) {
          if (iso === lastDetected) {
            consecutiveMatch += 1;
          } else {
            consecutiveMatch = 1;
            lastDetected = iso;
          }

          setDetectedDate(iso);
          setDetectedDateDisplay(formatDisplay(iso));

          if (consecutiveMatch >= CONFIRM_THRESHOLD) {
            if (intervalId) {
              clearInterval(intervalId);
              intervalId = null;
            }
            setScannerState("detected");
          }
        } else {
          consecutiveMatch = 0;
          lastDetected = null;
          setDetectedDate(null);
          setDetectedDateDisplay(null);
        }
      } catch {
        // Erreur OCR silencieuse sur la frame — la boucle continue
      }
    }

    async function start() {
      setScannerState("initializing");
      setDetectedDate(null);
      setDetectedDateDisplay(null);
      setErrorMessage(null);

      // 1. Init Tesseract worker (fra+eng, LSTM only)
      // Le PSM est défini à chaque appel dans analyzeFrame (double tentative).
      try {
        worker = await createWorker("fra+eng", 1);
      } catch {
        if (cancelled) {
          return;
        }
        setScannerState("ocr_error");
        setErrorMessage("Impossible d'initialiser le moteur OCR.");
        return;
      }

      if (cancelled) {
        await worker.terminate();
        return;
      }

      // 2. Accès caméra arrière
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        if (cancelled) {
          return;
        }
        setScannerState("camera_error");
        setErrorMessage(
          "Caméra inaccessible. Utilisez la saisie manuelle ci-dessous.",
        );
        return;
      }

      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      if (cancelled) {
        return;
      }

      setScannerState("scanning");

      // 3. Boucle d'analyse frame-by-frame
      intervalId = setInterval(analyzeFrame, SCAN_INTERVAL_MS);
    }

    start();

    // Cleanup : appelé par React au démontage ou quand scanKey change (retry)
    return () => {
      cancelled = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      // terminate() est async mais on ne peut pas await dans un cleanup —
      // on le lance en fire-and-forget, Tesseract gère ça proprement.
      if (worker) {
        worker.terminate();
      }
    };
  }, [scanKey]); // ← seule dépendance : scanKey

  // ── Confirmation ─────────────────────────────────────────────────────────
  // useCallback légitime ici : la fonction est stable et passe onCapture en prop
  const handleConfirm = useCallback(() => {
    if (!detectedDate) {
      return;
    }
    onCapture(detectedDate);
  }, [detectedDate, onCapture]);

  // ── Retry : React gère le cleanup + remount via scanKey ───────────────────
  const handleRetry = () => setScanKey((k) => k + 1);

  // ────────────────────────────────────────────────────────────────────────
  // Rendu
  // ────────────────────────────────────────────────────────────────────────

  if (scannerState === "camera_error" || scannerState === "ocr_error") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl bg-gray-50 p-5 text-center dark:bg-zinc-800">
        <Camera size={28} className="text-gray-400" />
        <p className="text-sm text-gray-500 dark:text-zinc-400">
          {errorMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Zone vidéo + overlay */}
      <div className="relative overflow-hidden rounded-xl bg-black">
        <video
          ref={videoRef}
          className="h-52 w-full object-cover"
          muted
          playsInline
        />

        {/* Canvas caché utilisé pour le crop + analyse OCR */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Overlay pendant l'initialisation */}
        {scannerState === "initializing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70">
            <Loader2 size={28} className="animate-spin text-white" />
            <span className="text-xs text-white/80">Chargement OCR…</span>
          </div>
        )}

        {/* Cadre de ciblage */}
        {(scannerState === "scanning" || scannerState === "detected") && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div
              className={`rounded-lg border-2 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] transition-colors duration-300 ${
                scannerState === "detected"
                  ? "border-green-400"
                  : "border-white/70"
              }`}
              style={{
                width: `${VIEWFINDER_WIDTH_RATIO * 100}%`,
                height: `${VIEWFINDER_HEIGHT_RATIO * 100}%`,
              }}
            />
          </div>
        )}

        {/* Invite à pointer la date */}
        {scannerState === "scanning" && !detectedDate && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center">
            <span className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs text-white backdrop-blur-sm">
              <ScanLine size={12} className="animate-pulse" />
              Pointez la date de péremption
            </span>
          </div>
        )}

        {/* Date partiellement détectée (pas encore confirmée) */}
        {scannerState === "scanning" && detectedDate && (
          <div className="absolute bottom-2 left-2 right-2 flex justify-center">
            <span className="rounded-full bg-amber-500/90 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              {detectedDateDisplay} — maintien…
            </span>
          </div>
        )}
      </div>

      {/* Confirmation de la date détectée */}
      {scannerState === "detected" && detectedDate && (
        <div className="flex flex-col gap-2 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="shrink-0 text-green-600" />
            <p className="text-sm font-semibold text-green-800 dark:text-green-300">
              Date détectée : {detectedDateDisplay}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              className="flex-1 rounded-full bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
            >
              Confirmer
            </button>
            <button
              onClick={handleRetry}
              className="flex items-center justify-center gap-1.5 rounded-full border border-green-300 px-4 py-2.5 text-sm text-green-700 hover:bg-green-100 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/30"
            >
              <RefreshCw size={14} />
              Rescanner
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
