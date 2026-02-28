"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { NotFoundException } from "@zxing/library";
import { ImageIcon, Loader2 } from "lucide-react";
import { decodeBarcodeFromImage } from "@/app/(auth)/scan/actions";

interface Props {
  onDetected: (barcode: string) => void;
  active: boolean;
  token?: string;
}

export function BarcodeScanner({ onDetected, active, token }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [decoding, setDecoding] = useState(false);
  const [decodeError, setDecodeError] = useState<string | null>(null);

  const stop = useCallback(() => {
    if (readerRef.current) {
      BrowserMultiFormatReader.releaseAllStreams();
      readerRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    if (!videoRef.current) {
      return;
    }
    try {
      readerRef.current = new BrowserMultiFormatReader();
      await readerRef.current.decodeFromVideoDevice(
        undefined, // caméra par défaut (arrière sur mobile)
        videoRef.current,
        (result, err) => {
          if (result) {
            onDetected(result.getText());
          }
          if (err && !(err instanceof NotFoundException)) {
            console.warn("ZXing:", err);
          }
        },
      );
    } catch {
      setCameraError(
        "Caméra inaccessible. Vous pouvez importer une photo du code-barres.",
      );
    }
  }, [onDetected]);

  useEffect(() => {
    if (active) {
      start();
    } else {
      stop();
    }
    return stop;
  }, [active, start, stop]);

  /**
   * Tente de décoder un code-barres côté client via ZXing (canvas + rotations).
   * Retourne null si aucun résultat.
   */
  const decodeClientSide = useCallback(
    async (img: HTMLImageElement): Promise<string | null> => {
      const reader = new BrowserMultiFormatReader();
      const angles = [90, 0, 270, 180];

      for (const angle of angles) {
        const isRotated90 = angle === 90 || angle === 270;
        const canvas = document.createElement("canvas");
        canvas.width = isRotated90 ? img.naturalHeight : img.naturalWidth;
        canvas.height = isRotated90 ? img.naturalWidth : img.naturalHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((angle * Math.PI) / 180);
        ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
        ctx.restore();
        try {
          return reader.decodeFromCanvas(canvas).getText();
        } catch {
          // Pas de code-barres à cet angle → suivant
        }
      }
      return null;
    },
    [],
  );

  /**
   * Convertit un File en base64 (sans le préfixe data:...).
   */
  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        // Supprimer le préfixe "data:image/...;base64,"
        resolve(dataUrl.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  // Decode a barcode from an imported image file
  // Stratégie : essai client (ZXing WASM navigateur) → fallback backend (sharp + zxing-wasm Node)
  const handleImageFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) {
        return;
      }

      setDecoding(true);
      setDecodeError(null);

      try {
        // Passe 1 : décodage client
        const objectUrl = URL.createObjectURL(file);
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const i = new Image();
          i.onload = () => resolve(i);
          i.onerror = reject;
          i.src = objectUrl;
        });
        URL.revokeObjectURL(objectUrl);

        const clientResult = await decodeClientSide(img);
        if (clientResult) {
          onDetected(clientResult);
          return;
        }

        // Passe 2 : fallback backend (preprocessing sharp + zxing-wasm côté serveur)
        const base64 = await fileToBase64(file);
        const serverResult = await decodeBarcodeFromImage(base64, token);
        if (serverResult) {
          onDetected(serverResult);
          return;
        }

        setDecodeError(
          "Aucun code-barres détecté dans cette image. Essayez avec une photo plus nette.",
        );
      } catch {
        setDecodeError(
          "Aucun code-barres détecté dans cette image. Essayez avec une photo plus nette.",
        );
      } finally {
        setDecoding(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [onDetected, token, decodeClientSide, fileToBase64],
  );

  // ── Rendu : erreur caméra → fallback import image ────────────────────────
  if (cameraError) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl bg-gray-50 p-6 text-center dark:bg-zinc-900">
        <p className="text-sm text-gray-500 dark:text-zinc-400">{cameraError}</p>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={decoding}
          className="flex items-center gap-2 rounded-full bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
        >
          {decoding ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <ImageIcon size={16} />
          )}
          {decoding ? "Analyse en cours…" : "Importer une photo du code-barres"}
        </button>

        {decodeError && (
          <p className="text-sm text-red-500 dark:text-red-400">{decodeError}</p>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageFile}
        />
      </div>
    );
  }

  // ── Rendu normal : flux caméra ────────────────────────────────────────────
  return (
    <div className="relative overflow-hidden rounded-xl bg-black">
      <video
        ref={videoRef}
        className="h-64 w-full object-cover"
        muted
        playsInline
      />
      {/* Viseur */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-24 w-64 rounded-lg border-2 border-green-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
      </div>

      {/* Bouton import discret pour les utilisateurs qui préfèrent une image */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white backdrop-blur-sm hover:bg-black/80"
        aria-label="Importer une image"
      >
        <ImageIcon size={12} />
        Importer
      </button>

      {decoding && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="animate-spin text-white" size={32} />
        </div>
      )}

      {decodeError && (
        <div className="absolute bottom-10 left-2 right-2 rounded-lg bg-red-600/90 px-3 py-2 text-center text-xs text-white">
          {decodeError}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageFile}
      />
    </div>
  );
}
