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
      if (day < 1 || day > 31 || month < 1 || month > 12) return null;
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
   * Preprocessing agressif : niveaux de gris + normalize + contraste fort + sharpen.
   * Pour les photos floues ou les textes imprimés jet d'encre sur fond brillant.
   */
  private async preprocessAggressive(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer)
      .grayscale()
      .normalize()               // étire l'histogramme sur [0,255]
      .linear(2.0, -80)          // contraste fort
      .sharpen({ sigma: 1.5 })   // renforce les bords des caractères
      .jpeg({ quality: 90 })
      .toBuffer();
  }

  /**
   * Preprocessing agressif avec upscale ×2.
   * Donne plus de pixels par caractère à Tesseract — améliore la lecture
   * des séparateurs (/.-) sur fond brillant ou texte jet d'encre fin.
   */
  private async preprocessUpscale(buffer: Buffer): Promise<Buffer> {
    const meta = await sharp(buffer).metadata();
    const w = meta.width ?? 500;
    return sharp(buffer)
      .resize(w * 2, undefined, { kernel: sharp.kernel.lanczos3 })
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
   * Cascade de 5 passes, du plus probable au fallback :
   *   1. Crop bas 50% + agressif + upscale ×2  + PSM 6  ← cas principal
   *   2. Crop bas 50% + agressif + upscale ×2  + PSM 3
   *   3. Crop bas 50% + agressif               + PSM 6
   *   4. Image complète + agressif + upscale   + PSM 6  ← fallback (date en haut de l'emballage)
   *   5. Image complète + originale            + PSM 3  ← cas images simples/nettes
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
      const bottomHalf = await this.cropBottom(buffer, 0.5);

      // 1. Crop bas + agressif + upscale × 2 + PSM 6
      const bottomUp = await this.preprocessUpscale(bottomHalf);
      const text1 = await this.recognizeWithPsm(bottomUp, PSM.SINGLE_BLOCK);
      this.logger.log(`[1/5] bottom+up+PSM6  : "${text1.replace(/\n/g, '↵')}"`);
      const date1 = this.parseDate(text1, '[1/5] bottom+up+PSM6');
      if (date1) return date1;

      // 2. Crop bas + agressif + upscale × 2 + PSM 3
      const text2 = await this.recognizeWithPsm(bottomUp, PSM.AUTO);
      this.logger.log(`[2/5] bottom+up+PSM3  : "${text2.replace(/\n/g, '↵')}"`);
      const date2 = this.parseDate(text2, '[2/5] bottom+up+PSM3');
      if (date2) return date2;

      // 3. Crop bas + agressif (sans upscale) + PSM 6
      const bottomAggr = await this.preprocessAggressive(bottomHalf);
      const text3 = await this.recognizeWithPsm(bottomAggr, PSM.SINGLE_BLOCK);
      this.logger.log(`[3/5] bottom+aggr+PSM6: "${text3.replace(/\n/g, '↵')}"`);
      const date3 = this.parseDate(text3, '[3/5] bottom+aggr+PSM6');
      if (date3) return date3;

      // 4. Image complète + agressif + upscale (date parfois en haut de l'emballage)
      const fullUp = await this.preprocessUpscale(buffer);
      const text4 = await this.recognizeWithPsm(fullUp, PSM.SINGLE_BLOCK);
      this.logger.log(`[4/5] full+up+PSM6    : "${text4.replace(/\n/g, '↵')}"`);
      const date4 = this.parseDate(text4, '[4/5] full+up+PSM6');
      if (date4) return date4;

      // 5. Image complète originale + PSM 3 (images simples/nettes)
      const text5 = await this.recognizeWithPsm(buffer, PSM.AUTO);
      this.logger.log(`[5/5] orig+PSM3       : "${text5.replace(/\n/g, '↵')}"`);
      const date5 = this.parseDate(text5, '[5/5] orig+PSM3');
      if (date5) return date5;

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
    const normalized = tokenizedLines.join('\n').replace(/[ \t]+/g, ' ').trim();

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
      if (b.priority !== a.priority) return b.priority - a.priority;
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
