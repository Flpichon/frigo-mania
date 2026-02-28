"use client";

import dynamic from "next/dynamic";

const BarcodeScanner = dynamic(
  () => import("@/components/BarcodeScanner").then((m) => m.BarcodeScanner),
  { ssr: false },
);

interface Props {
  onDetected: (barcode: string) => void;
  token?: string;
}

export function StepBarcode({ onDetected, token }: Props) {
  return (
    <>
      <h1 className="text-xl font-bold text-gray-900 dark:text-zinc-100">
        Scanner le code-barres
      </h1>
      <BarcodeScanner onDetected={onDetected} active token={token} />
      <p className="text-center text-sm text-gray-400">
        Pointez la caméra vers le code-barres du produit
      </p>
    </>
  );
}
