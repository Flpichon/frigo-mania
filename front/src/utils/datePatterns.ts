/**
 * Patterns de dates de péremption rencontrés sur les emballages alimentaires.
 * Partagé entre le frontend (DateScanner OCR WASM) et le backend (OcrService).
 *
 * Chaque pattern a une priorité (plus haute = préféré en cas de plusieurs matches) :
 *   3 — séparateur explicite (/ . -) + année complète  → le plus fiable
 *   2 — séparateur explicite + année courte ou mois seul
 *   1 — séparateur espace uniquement                   → ambigu, moins fiable
 *   0 — DD/MM sans année                               → heuristique
 */
export const DATE_PATTERNS: {
  regex: RegExp;
  priority: number;
  parse: (m: RegExpMatchArray) => Date | null;
}[] = [
  // DD/MM/YYYY ou DD.MM.YYYY ou DD-MM-YYYY (avec ou sans espaces autour du séparateur)
  {
    regex: /\b(\d{1,2})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*(\d{4})\b/,
    priority: 3,
    parse: (m) => {
      const d = new Date(
        Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])),
      );
      return isValidDate(d) ? d : null;
    },
  },
  // YYYY-MM-DD (ISO, rare sur les emballages mais possible)
  {
    regex: /\b(\d{4})-(\d{2})-(\d{2})\b/,
    priority: 3,
    parse: (m) => {
      const d = new Date(
        Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])),
      );
      return isValidDate(d) ? d : null;
    },
  },
  // DD/MM/YY ou DD.MM.YY (avec ou sans espaces autour du séparateur)
  {
    regex: /\b(\d{1,2})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*(\d{2})\b/,
    priority: 2,
    parse: (m) => {
      const year = 2000 + Number(m[3]);
      const d = new Date(Date.UTC(year, Number(m[2]) - 1, Number(m[1])));
      return isValidDate(d) ? d : null;
    },
  },
  // MM/YYYY ou MM.YYYY (avec ou sans espaces autour du séparateur)
  {
    regex: /\b(\d{1,2})\s*[/.-]\s*(\d{4})\b/,
    priority: 2,
    parse: (m) => {
      // On prend le dernier jour du mois (Date.UTC avec jour=0 du mois suivant)
      const d = new Date(Date.UTC(Number(m[2]), Number(m[1]), 0));
      return isValidDate(d) ? d : null;
    },
  },
  // DD/MM sans année (typique des œufs : DCR légale à 28 jours après ponte)
  // Heuristique : si la date (DD/MM) est déjà passée cette année → année suivante,
  //               sinon → année courante
  // Note : on exclut le point "." pour éviter les faux positifs sur des abréviations
  // de mesure du type "2.s" dans "30ml (2 c.à.s)" — aligné sur ocr.service.ts.
  {
    regex: /\b(\d{1,2})\s*[/-]\s*(\d{1,2})\b/,
    priority: 1,
    parse: (m) => {
      const day = Number(m[1]);
      const month = Number(m[2]);
      if (day < 1 || day > 31 || month < 1 || month > 12) {
        return null;
      }
      const now = new Date();
      let year = now.getFullYear();
      const todayUtc = Date.UTC(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );
      const candidateUtc = Date.UTC(year, month - 1, day);
      if (candidateUtc < todayUtc) {
        year += 1;
      }
      const d = new Date(Date.UTC(year, month - 1, day));
      return isValidDate(d) ? d : null;
    },
  },
  // DD MM YYYY (séparateur espace)
  {
    regex: /\b(\d{1,2}) (\d{1,2}) (\d{4})\b/,
    priority: 2,
    parse: (m) => {
      const d = new Date(
        Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])),
      );
      return isValidDate(d) ? d : null;
    },
  },
  // DD MM YY (séparateur espace)
  {
    regex: /\b(\d{1,2}) (\d{1,2}) (\d{2})\b/,
    priority: 1,
    parse: (m) => {
      const year = 2000 + Number(m[3]);
      const d = new Date(Date.UTC(year, Number(m[2]) - 1, Number(m[1])));
      return isValidDate(d) ? d : null;
    },
  },
];

export function isValidDate(d: Date): boolean {
  if (isNaN(d.getTime())) {
    return false;
  }
  const now = new Date();
  const maxFuture = new Date(now);
  maxFuture.setFullYear(maxFuture.getFullYear() + 10);
  // On accepte les dates jusqu'à 1 an dans le passé (périmé récemment)
  const minPast = new Date(now);
  minPast.setFullYear(minPast.getFullYear() - 1);
  return d >= minPast && d <= maxFuture;
}

/**
 * Normalise le texte OCR brut (corrections de caractères courants) puis
 * extrait la meilleure date candidate selon les DATE_PATTERNS.
 * Retourne la date au format ISO "YYYY-MM-DD" ou null si rien trouvé.
 */
export function parseDateFromOcrText(text: string): string | null {
  // Corrections OCR : O→0, l/I→1 sur les tokens contenant déjà un chiffre
  const normalized = text
    .split(/\n/)
    .map((line) =>
      line
        .split(/\s+/)
        .map((token) =>
          /\d/.test(token)
            ? token.replace(/[oO]/g, "0").replace(/[lI]/g, "1")
            : token,
        )
        .join(" "),
    )
    .join("\n")
    .replace(/[ \t]+/g, " ")
    .trim();

  const candidates: { date: Date; priority: number }[] = [];

  for (const { regex, priority, parse } of DATE_PATTERNS) {
    const globalRegex = new RegExp(regex.source, "g");
    for (const match of normalized.matchAll(globalRegex)) {
      const date = parse(match as RegExpMatchArray);
      if (date) {
        candidates.push({ date, priority });
      }
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  // Priorité décroissante, puis date la plus proche dans le futur
  candidates.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return a.date.getTime() - b.date.getTime();
  });

  return candidates[0].date.toISOString().slice(0, 10);
}
