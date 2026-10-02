export interface DatePattern {
  regex: RegExp;
  format: string;
}

export interface Localization {
  year: string[];
  month: 'long' | 'short' | 'numeric' | string[];
  week: string[];
  day: string[];
  today: string[];
  weekday: string[];
  datePatterns: DatePattern[];
  am?: string[];
  pm?: string[];
}

export interface DateShortcutParserOptions {
  fromDate?: Date;
  locale?: 'en' | 'de' | 'fr' | 'tr' | Localization;
  defaultTime?: string;
}

// Data and Types remain unchanged
const locales: Record<string, Localization> = {
  en: {
    year: ['y', 'yr', 'year', 'years'],
    month: ['m', 'mo', 'month', 'months'],
    week: ['w', 'wk', 'week', 'weeks'],
    day: ['d', 'day', 'days'],
    today: ['t', 'today', 'now'],
    weekday: ['wd', 'weekday', 'weekdays'],
    datePatterns: [
      { regex: /^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}|\d{2}))?/, format: 'mm/dd/yyyy' },
    ],
    am: ['am'],
    pm: ['pm'],
  },
  de: {
    year: ['j', 'jahr', 'jahre'],
    month: ['m', 'monat', 'monate'],
    week: ['w', 'woche', 'wochen'],
    day: ['t', 'tag', 'tage', 'd'],
    today: ['h', 'heute', 'jetzt'],
    weekday: ['wt', 'werktag', 'werktage'],
    datePatterns: [
      { regex: /^(\d{1,2})\.(\d{1,2})(?:\.(\d{4}|\d{2}))?/, format: 'dd.mm.yyyy' },
    ],
    am: [],
    pm: [],
  },
  fr: {
    year: ['a', 'an', 'année', 'années'],
    month: ['m', 'mois'],
    week: ['s', 'sem', 'semaine', 'semaines'],
    day: ['j', 'jour', 'jours'],
    today: ['aujourdhui', 'maintenant'],
    weekday: ['jo', 'jourouvrable', 'joursouvrables'],
    datePatterns: [
      { regex: /^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}|\d{2}))?/, format: 'dd/mm/yyyy' },
    ],
    am: [],
    pm: [],
  },
  tr: {
    year: ['y', 'yıl'],
    month: ['a', 'ay'],
    week: ['h', 'hafta'],
    day: ['g', 'gün'],
    today: ['b', 'bugün', 'şimdi'],
    weekday: ['ig', 'işgünü', 'işgünleri'],
    datePatterns: [
      { regex: /^(\d{1,2})\.(\d{1,2})(?:\.(\d{4}|\d{2}))?/, format: 'dd.mm.yyyy' },
    ],
    am: [],
    pm: [],
  },
};

/** Date.UTC maps years 0-99 to 1900-1999; this builds a UTC midnight date with the exact year. */
function utcDate(year: number, month: number, day: number): Date {
  const date = new Date(0);
  date.setUTCFullYear(year, month, day);
  return date;
}

/**
 * Lowercase variants of a keyword. Default lowercasing turns "YIL" into "yil" and "İ" into "i" plus a
 * combining dot, so Turkish casing rules are tried as well; that keeps "YIL" and "İŞGÜNÜ" working.
 */
function lowercaseForms(text: string): string[] {
  const plain = text.toLowerCase().normalize('NFC');
  const turkish = text.toLocaleLowerCase('tr').normalize('NFC');
  return plain === turkish ? [plain] : [plain, turkish];
}

function sameKeyword(input: string, keyword: string): boolean {
  const keywordForms = lowercaseForms(keyword);
  return lowercaseForms(input).some((form) => keywordForms.includes(form));
}

/**
 * Returns the capture-group order of a date format, e.g. "d/m/yyyy" -> ['d', 'm', 'y'].
 * A format without a year still reads an optional year from the group after the day and month.
 */
function fieldOrder(format: string): Array<'d' | 'm' | 'y'> {
  const lower = format.toLowerCase();
  const fields = (['d', 'm', 'y'] as const).filter((field) => lower.includes(field));
  if (!fields.includes('d') || !fields.includes('m')) {
    throw new Error(`DateShortcutParser: Date pattern format "${format}" must contain a day and a month.`);
  }
  fields.sort((a, b) => lower.indexOf(a) - lower.indexOf(b));
  if (!fields.includes('y')) fields.push('y');
  return fields;
}

/** Matches a date pattern at the start of `text`; resets lastIndex so /g and /y regexes behave too. */
function matchDatePattern(pattern: DatePattern, text: string): RegExpExecArray | null {
  pattern.regex.lastIndex = 0;
  const match = pattern.regex.exec(text);
  pattern.regex.lastIndex = 0;
  return match?.index === 0 ? match : null;
}

interface TimeInfo {
  hour: number;
  minute: number;
  second: number;
}

export class DateShortcutParser {
  private readonly options: Required<DateShortcutParserOptions>;
  private readonly locale: Localization;
  private readonly defaultTime: TimeInfo | null = null;
  private readonly unitTypeMap: Map<string, string>;

  constructor(options: DateShortcutParserOptions = {}) {
    this.options = {
      fromDate: options.fromDate ? new Date(options.fromDate.getTime()) : new Date(),
      locale: options.locale || 'en',
      defaultTime: options.defaultTime || '',
    };

    this.locale = this._resolveLocale(this.options.locale);
    this.unitTypeMap = this._createUnitTypeMap();

    if (this.options.defaultTime) {
      this.defaultTime = this._parseTimeToken(this.options.defaultTime);
    }
  }

  /**
   * Main entry point for parsing a shortcut string into a Date object.
   */
  public parse(shortcut: string): Date {
    const trimmedShortcut = shortcut.trim();
    if (!trimmedShortcut) {
      throw new Error('DateShortcutParser: Shortcut string cannot be empty.');
    }

    // 1. Separate the time part (e.g., "5pm") from the date part (e.g., "t+1d").
    const { timeInfo, dateShortcut } = this._extractTime(trimmedShortcut);

    // 2. Parse the date part to establish the base date.
    const date = this._parseDate(dateShortcut);

    // 3. Apply the extracted time or default time to the base date.
    this._applyTime(date, timeInfo);

    return date;
  }

  /**
   * Resolves a locale string or object into a Localization object.
   */
  private _resolveLocale(locale: 'en' | 'de' | 'fr' | 'tr' | Localization): Localization {
    if (typeof locale !== 'string') {
      return locale;
    }
    const predefinedLocale = locales[locale];
    if (!predefinedLocale) {
      throw new Error(`DateShortcutParser: Predefined locale "${locale}" not found.`);
    }
    return predefinedLocale;
  }

  /**
   * Creates a fast lookup map from a unit keyword (e.g., "yr") to its type (e.g., "year").
   */
  private _createUnitTypeMap(): Map<string, string> {
    const map = new Map<string, string>();
    const { datePatterns, am, pm, ...unitDefinitions } = this.locale;

    for (const [unitType, keywords] of Object.entries(unitDefinitions)) {
      if (Array.isArray(keywords)) {
        for (const keyword of keywords) {
          for (const form of lowercaseForms(keyword)) {
            if (!map.has(form)) map.set(form, unitType);
          }
        }
      }
    }
    return map;
  }

  /**
   * Parses a time string (like "HH:mm:ss") into a structured TimeInfo object.
   */
  private _parseTimeToken(timeString: string): TimeInfo {
    const parts = timeString.split(':').map(Number);
    if (parts.some(isNaN) || parts.length < 1 || parts.length > 3) {
      throw new Error(`DateShortcutParser: Invalid defaultTime format "${timeString}".`);
    }
    const [hour = 0, minute = 0, second = 0] = parts;
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) {
      throw new Error(`DateShortcutParser: Invalid time values in defaultTime "${timeString}".`);
    }
    return { hour, minute, second };
  }

  /**
   * Extracts a time expression from the end of the shortcut string.
   * @returns The parsed time and the remaining date part of the shortcut.
   */
  private _extractTime(shortcut: string): { timeInfo: TimeInfo | null; dateShortcut: string } {
    const am = this.locale.am || [];
    const pm = this.locale.pm || [];
    // Longest markers first so e.g. "a.m." wins over "a"; escape regex metacharacters.
    const ampm = [...am, ...pm]
      .sort((a, b) => b.length - a.length)
      .map((marker) => marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const ampmPattern = ampm.length > 0 ? `\\s*(${ampm.join('|')})?` : '';
    const timeRegex = new RegExp(`(?:\\s+|^)(\\d{1,2}(?::\\d{2})?(?::\\d{2})?)${ampmPattern}$`, 'i');

    const match = shortcut.match(timeRegex);
    if (!match || this._absoluteDateCoversTime(shortcut, match.index! + match[0].search(/\d/))) {
      return { timeInfo: null, dateShortcut: shortcut };
    }

    const timeString = match[1];
    const ampmPart = match[2]?.toLowerCase();
    const timeComponents = timeString.split(':').map(Number);

    let hour = timeComponents[0];
    const minute = timeComponents[1] || 0;
    const second = timeComponents[2] || 0;

    if (isNaN(hour) || minute < 0 || minute > 59 || second < 0 || second > 59) {
      throw new Error(`DateShortcutParser: Invalid time format in shortcut "${shortcut}".`);
    }

    if (ampmPart) {
      if (hour < 1 || hour > 12) {
        throw new Error(`DateShortcutParser: Invalid hour "${hour}" for AM/PM format.`);
      }
      const isPm = pm.some((marker) => marker.toLowerCase() === ampmPart);
      if (isPm && hour < 12) {
        hour += 12;
      } else if (!isPm && hour === 12) { // 12am is midnight
        hour = 0;
      }
    }

    if (hour < 0 || hour > 23) {
      throw new Error(`DateShortcutParser: Invalid hour "${timeComponents[0]}" in shortcut.`);
    }

    const timeInfo = { hour, minute, second };
    const dateShortcut = shortcut.substring(0, match.index).trim();

    return { timeInfo, dateShortcut };
  }

  /**
   * True if the absolute date pattern that _parseDate would use extends to or past `timeStart`,
   * so a trailing number such as the "15" in "2025 03 15" belongs to the date and not the time.
   */
  private _absoluteDateCoversTime(shortcut: string, timeStart: number): boolean {
    const rest = this._stripToday(shortcut);
    const offset = shortcut.length - rest.length;
    for (const pattern of this.locale.datePatterns) {
      const match = matchDatePattern(pattern, rest);
      if (match) {
        return offset + match[0].length > timeStart;
      }
    }
    return false;
  }

  /**
   * Removes a leading "today" keyword, if any. Longest keywords are tried first so "today" wins over "t".
   */
  private _stripToday(shortcut: string): string {
    const sortedTodayWords = [...this.locale.today].sort((a, b) => b.length - a.length);
    for (const todayWord of sortedTodayWords) {
      if (todayWord && sameKeyword(shortcut.slice(0, todayWord.length), todayWord)) {
        return shortcut.substring(todayWord.length).trim();
      }
    }
    return shortcut;
  }

  /**
   * Parses the date portion of the shortcut, handling absolute dates and relative adjustments.
   */
  private _parseDate(dateShortcut: string): Date {
    let currentDate = new Date(this.options.fromDate.getTime());

    // If only a time was provided (e.g., "3pm"), keep the fromDate's date part.
    if (!dateShortcut) {
      return currentDate;
    }

    // Otherwise, start from today at midnight.
    currentDate.setUTCHours(0, 0, 0, 0);

    // Handle a "today" keyword first, as it establishes the base date.
    let remainingShortcut = this._stripToday(dateShortcut);

    // Then, try to match an absolute date pattern, which would override "today".
    const absoluteDateResult = this._tryParseAbsoluteDate(remainingShortcut);
    if (absoluteDateResult) {
      currentDate = absoluteDateResult.date;
      remainingShortcut = absoluteDateResult.remaining;
    }

    // Handle the workday adjustment suffix '.'
    const workdayAdjust = remainingShortcut.trim().endsWith('.');
    if (workdayAdjust) {
      remainingShortcut = remainingShortcut.trim().slice(0, -1);
    }

    // Finally, parse and apply all relative adjustment parts.
    this._applyRelativeParts(currentDate, remainingShortcut);

    if (workdayAdjust) {
      return this._findClosestWorkday(currentDate);
    }

    return currentDate;
  }

  /**
   * Attempts to parse an absolute date from the beginning of the shortcut.
   * @returns The parsed date and remaining string, or null if no pattern matched.
   */
  private _tryParseAbsoluteDate(shortcut: string): { date: Date, remaining: string } | null {
    for (const pattern of this.locale.datePatterns) {
      // Dates must start the shortcut; an unanchored regex matching later would drop the text before it.
      const match = matchDatePattern(pattern, shortcut);
      if (!match) continue;

      const fields: Partial<Record<'d' | 'm' | 'y', string>> = {};
      fieldOrder(pattern.format).forEach((field, i) => {
        fields[field] = match[i + 1];
      });

      const day = parseInt(fields.d ?? '', 10);
      const month = parseInt(fields.m ?? '', 10) - 1;
      const yearStr = fields.y;
      let year = yearStr ? parseInt(yearStr, 10) : this.options.fromDate.getUTCFullYear();

      if (yearStr && yearStr.length <= 2) {
        year += 2000;
      }

      const date = utcDate(year, month, day);
      if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) {
        throw new Error(`DateShortcutParser: Invalid date "${match[0]}" in shortcut.`);
      }
      const remaining = shortcut.substring(match[0].length).trim();
      return { date, remaining };
    }
    return null;
  }

  /**
   * Finds and applies all relative adjustment parts (e.g., "+1y", "-2m") to the date.
   */
  private _applyRelativeParts(date: Date, shortcut: string): void {
    const trimmedShortcut = shortcut.trim();
    if (!trimmedShortcut) return;

    // This logic correctly handles spaces between operators and values (e.g., "+ 1d")
    // and isolates invalid parts (e.g., a trailing "+").
    const rawParts = trimmedShortcut.replace(/([+-])/g, ' $1').trim().split(/\s+/).filter(Boolean);
    const parts: string[] = [];
    for (let i = 0; i < rawParts.length; i++) {
      if ((rawParts[i] === '+' || rawParts[i] === '-') && i + 1 < rawParts.length) {
        parts.push(rawParts[i] + rawParts[i + 1]);
        i++; // Skip next part as it has been consumed
      } else {
        parts.push(rawParts[i]);
      }
    }

    for (const part of parts) {
      this._applySinglePart(date, part);
      if (isNaN(date.getTime())) {
        throw new Error(`DateShortcutParser: Part "${part}" moves the date out of the supported range.`);
      }
    }
  }

  /**
   * Parses a single relative part (e.g., "+1y") and modifies the date.
   */
  private _applySinglePart(date: Date, part: string): void {
    const partRegex = /^([+-])?(\d*)([\p{L}]+)$/iu;
    const match = part.match(partRegex);
    if (!match) {
      throw new Error(`DateShortcutParser: Invalid part format "${part}" in shortcut.`);
    }

    const [, sign, valueStr, unitStr] = match;
    const unitType = lowercaseForms(unitStr)
      .map((form) => this.unitTypeMap.get(form))
      .find((type) => type !== undefined);

    if (!unitType) {
      throw new Error(`DateShortcutParser: Unknown unit "${unitStr}" in shortcut.`);
    }

    if (unitType === 'today') {
      return; // "today" keyword in a relative part acts as a no-op.
    }

    const value = valueStr ? parseInt(valueStr, 10) : 1;
    const multiplier = sign === '-' ? -1 : 1;
    const amount = value * multiplier;

    switch (unitType) {
      case 'year':
        this._addMonths(date, amount * 12);
        break;
      case 'month':
        this._addMonths(date, amount);
        break;
      case 'week':
        date.setUTCDate(date.getUTCDate() + amount * 7);
        break;
      case 'day':
        date.setUTCDate(date.getUTCDate() + amount);
        break;
      case 'weekday': {
        const modifiedDate = this._findNthWeekday(date, value, sign === '-');
        date.setTime(modifiedDate.getTime());
        break;
      }
    }
  }

  /**
   * Adds months to a date, clamping the day to the target month's length (Jan 31 + 1m = Feb 28/29).
   */
  private _addMonths(date: Date, amount: number): void {
    const originalDay = date.getUTCDate();
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() + amount);
    const daysInTargetMonth = utcDate(date.getUTCFullYear(), date.getUTCMonth() + 1, 0).getUTCDate();
    date.setUTCDate(Math.min(originalDay, daysInTargetMonth));
  }

  /**
   * Applies the final time to the date object.
   */
  private _applyTime(date: Date, timeInfo: TimeInfo | null): void {
    const timeToApply = timeInfo || this.defaultTime;
    if (timeToApply) {
      date.setUTCHours(timeToApply.hour, timeToApply.minute, timeToApply.second, 0);
    }
  }

  /**
   * Finds the nth weekday of the month for a given date.
   * @param date
   * @param n
   * @param fromEnd If true, counts backwards from the end of the month.
   */
  private _findNthWeekday(date: Date, n: number, fromEnd: boolean): Date {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();

    const daysInMonth = utcDate(year, month + 1, 0).getUTCDate();
    const startDay = fromEnd ? daysInMonth : 1;
    const increment = fromEnd ? -1 : 1;

    let weekdayCount = 0;

    for (let day = startDay; day >= 1 && day <= daysInMonth; day += increment) {
      const tempDate = utcDate(year, month, day);
      const dayOfWeek = tempDate.getUTCDay();

      if (dayOfWeek > 0 && dayOfWeek < 6) { // Monday to Friday
        weekdayCount++;
        if (weekdayCount === n) {
          return tempDate;
        }
      }
    }

    throw new Error(`DateShortcutParser: Could not find the ${n}. weekday for the specified month.`);
  }

  /**
   * Adjusts a date to the closest workday (Fri for Sat, Mon for Sun).
   */
  private _findClosestWorkday(date: Date): Date {
    const adjustedDate = new Date(date.getTime());
    const dayOfWeek = adjustedDate.getUTCDay();

    if (dayOfWeek === 6) { // Saturday -> move to Friday
      adjustedDate.setUTCDate(adjustedDate.getUTCDate() - 1);
    } else if (dayOfWeek === 0) { // Sunday -> move to Monday
      adjustedDate.setUTCDate(adjustedDate.getUTCDate() + 1);
    }

    return adjustedDate;
  }
}