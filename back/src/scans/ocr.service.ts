import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Tesseract, { createWorker, PSM } from 'tesseract.js';
import sharp from 'sharp';

/**
 * Patterns de dates de péremption rencontrés sur les emballages alimentaires.
 *
 * Chaque pattern a une priorité (plus haute = préféré en cas de plusieurs matches) :
 *   3 — séparateur explicite (/ . -) + année complète  → le plus fiable
 *   2 — séparateur explicite + année courte ou mois seul
 *   1 — séparateur espace uniquement                   → ambigu, moins fiable
 *   0 — DD/MM sans année                               → heuristique
 */
const DATE_PATTERNS: {
  regex: RegExp;
  priority: number;
  parse: (m: RegExpMatchArray) => Date | null;
}[] = [
  // DD/MM/YYYY ou DD.MM.YYYY ou DD-MM-YYYY (avec ou sans espaces autour du séparateur)
  {
    regex: /\b(\d{1,2})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*(\d{4})\b/,
    priority: 3,
    parse: (m) => {
      const d = new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])));
      return isValidDate(d) ? d : null;
    },
  },
  // YYYY-MM-DD (ISO, rare sur les emballages mais possible)
  {
    regex: /\b(\d{4})-(\d{2})-(\d{2})\b/,
    priority: 3,
    parse: (m) => {
      const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
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
  // Note : on utilise [/-] uniquement (pas le point) pour éviter les faux positifs
  // du type "30ml (2 c.à.s)" où "2.s" matche avec le point comme séparateur.
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
      // Comparer avec la date UTC d'aujourd'hui pour éviter les décalages de timezone
      const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
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
      const d = new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])));
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

function isValidDate(d: Date): boolean {
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

@Injectable()
export class OcrService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OcrService.name);
  private worker: Tesseract.Worker | null = null;

  async onModuleInit() {
    // Initialiser le worker Tesseract une seule fois au démarrage du module
    this.worker = await createWorker('fra+eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          this.logger.verbose(`OCR progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });
    // PSM 6 = "bloc de texte uniforme" par défaut.
    // On n'utilise PAS de whitelist : restreindre aux chiffres/séparateurs perturbe
    // la segmentation de page de Tesseract sur les photos d'emballage complexes.
    // Le filtrage se fait en post-traitement via les DATE_PATTERNS.
    await this.worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
    });
    this.logger.log('Worker Tesseract initialisé');
  }

  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }

  /**
   * Tente l'OCR avec un PSM donné sur un buffer image.
   * Retourne le texte brut reconnu.
   */
  private async recognizeWithPsm(buffer: Buffer, psm: PSM): Promise<string> {
    await this.worker!.setParameters({
      tessedit_pageseg_mode: psm,
    });
    const { data } = await this.worker!.recognize(buffer);
    return data.text;
  }

  /**
   * Crop la moitié basse de l'image (50–100% de la hauteur).
   * Les dates de péremption se trouvent quasi-systématiquement dans le bas de l'emballage.
   */
  private async cropBottom(buffer: Buffer, fraction = 0.5): Promise<Buffer> {
    const meta = await sharp(buffer).metadata();
    const h = meta.height ?? 100;
    const w = meta.width ?? 100;
    const top = Math.round(h * (1 - fraction));
    return sharp(buffer)
      .extract({ left: 0, top, width: w, height: h - top })
      .toBuffer();
  }

  /**
   * Preprocessing pour OCR : niveaux de gris + normalize + contraste fort + sharpen
   * + upscale ×2 plafonné à 1600px de large.
   *
   * Le plafond évite d'upscaler des images déjà haute résolution (ex. photo 4K → 8K).
   * Base plafonnée à 800px × 2 = 1600px max, ce qui donne ~50px de hauteur par
   * caractère sur une date en taille normale — suffisant pour Tesseract.
   */
  private async preprocessForOcr(buffer: Buffer): Promise<Buffer> {
    const meta = await sharp(buffer).metadata();
    const w = meta.width ?? 800;
    const targetW = Math.min(w, 800) * 2; // plafonné à 1600px
    return sharp(buffer)
      .resize(targetW, undefined, { kernel: sharp.kernel.lanczos3 })
      .grayscale()
      .normalize()
      .linear(2.0, -80)
      .sharpen({ sigma: 1.5 })
      .jpeg({ quality: 90 })
      .toBuffer();
  }

  /**
   * Extrait la date de péremption depuis une image base64.
   *
   * Cascade de 3 passes sur l'image complète :
   *   1. Original + PSM 3          — images simples/nettes, pas de preprocessing
   *   2. preprocessForOcr + PSM 6  — cas principal : fond brillant, texte jet d'encre
   *   3. preprocessForOcr + PSM 3  — si la mise en page est complexe
   *
   * Pas de crop : l'utilisateur peut zoomer sur n'importe quelle zone de l'emballage,
   * le postulat "date en bas" n'est pas fiable.
   *
   * Retourne null si aucune date valide n'est trouvée.
   */
  async extractExpirationDate(imageBase64: string): Promise<Date | null> {
    if (!this.worker) {
      this.logger.error('Worker Tesseract non initialisé');
      return null;
    }

    try {
      const buffer = Buffer.from(imageBase64, 'base64');

      // 1. Original + PSM 3
      const text1 = await this.recognizeWithPsm(buffer, PSM.AUTO);
      this.logger.log(`[1/3] orig+PSM3      : "${text1.replace(/\n/g, '↵')}"`);
      const date1 = this.parseDate(text1, '[1/3] orig+PSM3');
      if (date1) {
        return date1;
      }

      // 2. preprocessForOcr + PSM 6
      const processed = await this.preprocessForOcr(buffer);
      const text2 = await this.recognizeWithPsm(processed, PSM.SINGLE_BLOCK);
      this.logger.log(`[2/3] preproc+PSM6   : "${text2.replace(/\n/g, '↵')}"`);
      const date2 = this.parseDate(text2, '[2/3] preproc+PSM6');
      if (date2) {
        return date2;
      }

      // 3. preprocessForOcr + PSM 3
      const text3 = await this.recognizeWithPsm(processed, PSM.AUTO);
      this.logger.log(`[3/3] preproc+PSM3   : "${text3.replace(/\n/g, '↵')}"`);
      const date3 = this.parseDate(text3, '[3/3] preproc+PSM3');
      if (date3) {
        return date3;
      }

      this.logger.warn('Aucune date trouvée après toutes les tentatives OCR');
      return null;
    } catch (err) {
      this.logger.error('Erreur OCR Tesseract', (err as Error).message);
      return null;
    }
  }

  parseDate(text: string, label = 'OCR'): Date | null {
    // Normalisation minimale : uniformiser les espaces, puis extraire les segments
    // qui ressemblent à des dates (chiffres + séparateurs /.-:) pour y appliquer
    // les corrections OCR (O→0, l/I→1) sans polluer le reste du texte.
    const lines = text.split(/\n/);
    const tokenizedLines = lines.map((line) => {
      // Sur chaque token de la ligne, appliquer les corrections OCR uniquement
      // sur les tokens qui contiennent déjà au moins un chiffre.
      return line
        .split(/\s+/)
        .map((token) => {
          if (/\d/.test(token)) {
            return token.replace(/[oO]/g, '0').replace(/[lI]/g, '1');
          }
          return token;
        })
        .join(' ');
    });
    const normalized = tokenizedLines
      .join('\n')
      .replace(/[ \t]+/g, ' ')
      .trim();

    this.logger.log(`${label} normalisé : "${normalized.replace(/\n/g, '↵')}"`);

    // Multi-match : collecter toutes les dates candidates de tous les patterns
    const candidates: { date: Date; priority: number; match: string }[] = [];

    for (const { regex, priority, parse } of DATE_PATTERNS) {
      const globalRegex = new RegExp(regex.source, 'g');
      for (const match of normalized.matchAll(globalRegex)) {
        const date = parse(match as RegExpMatchArray);
        if (date) {
          candidates.push({ date, priority, match: match[0] });
        }
      }
    }

    if (candidates.length === 0) {
      this.logger.log(`${label} : aucun pattern ne correspond`);
      return null;
    }

    // Trier par priorité décroissante, puis par date la plus proche dans le futur
    candidates.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.date.getTime() - b.date.getTime();
    });

    const best = candidates[0];
    this.logger.log(
      `${label} date trouvée : ${best.date.toISOString().slice(0, 10)} ` +
        `(match: "${best.match}", priorité: ${best.priority}, ` +
        `${candidates.length} candidat(s))`,
    );
    return best.date;
  }
}
