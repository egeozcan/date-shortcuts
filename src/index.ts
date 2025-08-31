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
      { regex: /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/, format: 'mm/dd/yyyy' },
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
      { regex: /^(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?/, format: 'dd.mm.yyyy' },
    ],
    am: [],
    pm: [],
  },
  fr: {
    year: ['a', 'an', 'année', 'années'],
    month: ['m', 'mois'],
    week: ['s', 'sem', 'semaine', 'semaines'],
    day: ['j', 'jour', 'jours'],
    today: ['a', 'aujourdhui', 'maintenant'],
    weekday: ['jo', 'jourouvrable', 'joursouvrables'],
    datePatterns: [
      { regex: /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/, format: 'dd/mm/yyyy' },
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
      { regex: /^(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?/, format: 'dd.mm.yyyy' },
    ],
    am: [],
    pm: [],
  },
};

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
      fromDate: options.fromDate || new Date(),
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
          map.set(keyword, unitType);
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
    const ampm = [...am, ...pm];
    const ampmPattern = ampm.length > 0 ? `\\s*(${ampm.join('|')})?` : '';
    const timeRegex = new RegExp(`(?:\\s+|^)(\\d{1,2}(?::\\d{2})?(?::\\d{2})?)${ampmPattern}$`, 'i');

    const match = shortcut.match(timeRegex);
    if (!match) {
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
      const isPm = pm.includes(ampmPart);
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

    let remainingShortcut = dateShortcut;

    // Handle "today" keywords first, as they establish the base date.
    // Sorting by length ensures "today" matches before "t".
    const sortedTodayWords = [...this.locale.today].sort((a, b) => b.length - a.length);
    for (const todayWord of sortedTodayWords) {
      if (remainingShortcut.toLowerCase().startsWith(todayWord)) {
        remainingShortcut = remainingShortcut.substring(todayWord.length).trim();
        break; // Consume only the first "today" keyword found
      }
    }

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
      const match = shortcut.match(pattern.regex);
      if (!match) continue;

      const [, p1, p2, p3] = match;
      const format = pattern.format.toLowerCase();

      const day = parseInt(format.startsWith('dd') ? p1 : p2, 10);
      const month = parseInt(format.startsWith('dd') ? p2 : p1, 10) - 1;
      let year = p3 ? parseInt(p3, 10) : this.options.fromDate.getUTCFullYear();

      if (p3 && p3.length <= 2) {
        year += 2000;
      }

      const date = new Date(Date.UTC(year, month, day));
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
    }
  }

  /**
   * Parses a single relative part (e.g., "+1y") and modifies the date.
   */
  private _applySinglePart(date: Date, part: string): void {
    const partRegex = /^([+-])?(\d*)?([a-z]+)$/i;
    const match = part.match(partRegex);
    if (!match) {
      throw new Error(`DateShortcutParser: Invalid part format "${part}" in shortcut.`);
    }

    const [, sign, valueStr, unitStr] = match;
    const unit = unitStr.toLowerCase();
    const unitType = this.unitTypeMap.get(unit);

    if (!unitType) {
      // Check if it's a "today" keyword which can appear in relative parts as a no-op
      if ([...this.locale.today].includes(unit)) {
        return;
      }
      throw new Error(`DateShortcutParser: Unknown unit "${unit}" in shortcut.`);
    }

    if (unitType === 'today') {
      return; // "today" keyword in a relative part acts as a no-op.
    }

    const value = valueStr ? parseInt(valueStr, 10) : 1;
    const multiplier = sign === '-' ? -1 : 1;
    const amount = value * multiplier;

    switch (unitType) {
      case 'year':
        date.setUTCFullYear(date.getUTCFullYear() + amount);
        break;
      case 'month':
        const originalDay = date.getUTCDate();
        date.setUTCDate(1);
        date.setUTCMonth(date.getUTCMonth() + amount);
        const daysInTargetMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
        date.setUTCDate(Math.min(originalDay, daysInTargetMonth));
        break;
      case 'week':
        date.setUTCDate(date.getUTCDate() + amount * 7);
        break;
      case 'day':
        date.setUTCDate(date.getUTCDate() + amount);
        break;
      case 'weekday':
        const modifiedDate = this._findNthWeekday(date, value, sign === '-');
        date.setTime(modifiedDate.getTime());
        break;
    }
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

    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const startDay = fromEnd ? daysInMonth : 1;
    const increment = fromEnd ? -1 : 1;

    let weekdayCount = 0;

    for (let day = startDay; day >= 1 && day <= daysInMonth; day += increment) {
      const tempDate = new Date(Date.UTC(year, month, day));
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