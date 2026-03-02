"use client";

import { useRef, useState, useCallback } from "react";
import { Camera, ImageIcon, RefreshCw } from "lucide-react";

interface Props {
  onCapture: (base64: string) => void;
}

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const TARGET_MAX_DIMENSION = 2000; // px
const JPEG_QUALITY = 0.8;

/**
 * Compresse une image via un canvas offscreen :
 * - Redimensionne si la largeur ou hauteur dépasse TARGET_MAX_DIMENSION
 * - Exporte en JPEG à JPEG_QUALITY
 *
 * Le preprocessing OCR (niveaux de gris, contraste, rotation) est délégué
 * au backend via sharp, ce qui permet de réutiliser le même pipeline
 * pour un futur scan temps réel sans bouton.
 *
 * Retourne le base64 compressé (sans le préfixe "data:…;base64,").
 */
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Impossible de lire le fichier."));
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error("Impossible de décoder l'image."));
      img.onload = () => {
        let { width, height } = img;

        // Redimensionner si nécessaire en conservant le ratio
        if (width > TARGET_MAX_DIMENSION || height > TARGET_MAX_DIMENSION) {
          if (width >= height) {
            height = Math.round((height * TARGET_MAX_DIMENSION) / width);
            width = TARGET_MAX_DIMENSION;
          } else {
            width = Math.round((width * TARGET_MAX_DIMENSION) / height);
            height = TARGET_MAX_DIMENSION;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas non supporté."));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
        const base64 = compressedDataUrl.split(",")[1];
        resolve(base64);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Permet de fournir une photo de la date de péremption de deux façons :
 * 1. Prise de photo directe via la caméra de l'appareil (capture="environment")
 * 2. Import d'une image existante depuis la galerie / le système de fichiers
 *
 * Redimensionne et compresse l'image côté client (max 2000px, JPEG 80%).
 * Le preprocessing OCR (niveaux de gris, contraste, rotation) est géré
 * côté backend pour rester compatible avec un futur scan temps réel.
 * Renvoie le contenu en base64 (sans le préfixe "data:…;base64,").
 */
export function DateCapture({ onCapture }: Props) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);

  const handleFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) {
        return;
      }

      setError(null);

      // Rejet des fichiers trop lourds (avant toute compression)
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(
          `L'image est trop lourde (${(file.size / 1024 / 1024).toFixed(1)} Mo). Limite : ${MAX_FILE_SIZE_MB} Mo.`,
        );
        e.target.value = "";
        return;
      }

      setCompressing(true);
      try {
        const base64 = await compressImage(file);
        // Construire la dataUrl pour la prévisualisation
        const previewDataUrl = `data:image/jpeg;base64,${base64}`;
        setPreview(previewDataUrl);
        onCapture(base64);
      } catch {
        setError("Une erreur est survenue lors du traitement de l'image.");
      } finally {
        setCompressing(false);
      }
    },
    [onCapture],
  );

  const handleReset = useCallback(() => {
    setPreview(null);
    setError(null);
    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
    }
    if (galleryInputRef.current) {
      galleryInputRef.current.value = "";
    }
  }, []);

  if (preview) {
    return (
      <div className="relative w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview}
          alt="Photo date de péremption"
          className="h-40 w-full rounded-xl object-cover"
        />
        <button
          onClick={handleReset}
          className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white"
          aria-label="Changer l'image"
        >
          <RefreshCw size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      {/* Bouton principal : ouvre la caméra sur mobile */}
      <button
        onClick={() => cameraInputRef.current?.click()}
        disabled={compressing}
        className="flex h-36 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 text-gray-500 hover:border-green-400 hover:text-green-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-green-500"
      >
        <Camera size={28} />
        <span className="text-sm">
          {compressing ? "Compression…" : "Prendre une photo"}
        </span>
      </button>

      {/* Bouton secondaire : galerie / fichier */}
      <button
        onClick={() => galleryInputRef.current?.click()}
        disabled={compressing}
        className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-2.5 text-sm text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        <ImageIcon size={15} />
        Importer depuis la galerie
      </button>

      {/* Message d'erreur inline */}
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </p>
      )}

      {/* Input caméra (capture="environment") */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />

      {/* Input galerie / fichier (sans capture) */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
