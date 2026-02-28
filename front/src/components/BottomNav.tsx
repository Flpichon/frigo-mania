"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ScanLine, ShoppingBasket, BarChart2, Settings } from "lucide-react";

const NAV_ITEMS = [
  { href: "/products", label: "Frigo", icon: ShoppingBasket },
  { href: "/scan",     label: "Scanner", icon: ScanLine },
  { href: "/reports",  label: "Rapports", icon: BarChart2 },
  { href: "/settings", label: "Réglages", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-stretch border-t border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-xs transition-colors ${
              active
                ? "text-green-600 dark:text-green-400"
                : "text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <Icon
              size={22}
              strokeWidth={active ? 2.5 : 1.8}
            />
            <span className={active ? "font-semibold" : ""}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
