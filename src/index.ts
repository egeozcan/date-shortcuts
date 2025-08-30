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
}

export interface DateShortcutParserOptions {
  fromDate?: Date;
  locale?: 'en' | 'de' | 'fr' | 'tr' | Localization;
}

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
  },
};

export class DateShortcutParser {
  private options: Required<DateShortcutParserOptions>;
  private locale: Localization;

  constructor(options: DateShortcutParserOptions = {}) {
    this.options = {
      fromDate: options.fromDate || new Date(),
      locale: options.locale || 'en',
    };
    this.locale = this.resolveLocale(this.options.locale);
  }

  private resolveLocale(locale: 'en' | 'de' | 'fr' | 'tr' | Localization): Localization {
    if (typeof locale === 'string') {
      const predefinedLocale = locales[locale];
      if (!predefinedLocale) {
        throw new Error(`DateShortcutParser: Predefined locale "${locale}" not found.`);
      }
      return predefinedLocale;
    }
    return locale;
  }

  public parse(shortcut: string): Date {
    let currentDate = new Date(this.options.fromDate.getTime());
    let remainingShortcut = shortcut.trim().toLowerCase();

    if (!remainingShortcut) {
      throw new Error("DateShortcutParser: Shortcut string cannot be empty.");
    }

    for (const todayWord of this.locale.today) {
      if (remainingShortcut.startsWith(todayWord)) {
        currentDate.setUTCHours(0, 0, 0, 0);
        remainingShortcut = remainingShortcut.substring(todayWord.length);
        break;
      }
    }

    for (const pattern of this.locale.datePatterns) {
      const match = remainingShortcut.match(pattern.regex);
      if (match) {
        const [, dayStr, monthStr, yearStr] = match;

        const format = pattern.format.toLowerCase();
        const day = parseInt(format.startsWith('dd') ? dayStr : monthStr, 10);
        const month = parseInt(format.startsWith('dd') ? monthStr : dayStr, 10) - 1;
        let year = yearStr ? parseInt(yearStr, 10) : this.options.fromDate.getUTCFullYear();

        if (yearStr && yearStr.length <= 2) {
          year += 2000;
        }

        currentDate = new Date(Date.UTC(year, month, day));
        remainingShortcut = remainingShortcut.substring(match[0].length);
        break;
      }
    }

    const adjustToWorkday = remainingShortcut.trim().endsWith('.');
    if (adjustToWorkday) {
      remainingShortcut = remainingShortcut.trim().slice(0, -1);
    }

    const rawParts = remainingShortcut.replace(/([+-])/g, ' $1').trim().split(/\s+/).filter(Boolean);
    const parts = [];
    for (let i = 0; i < rawParts.length; i++) {
      if ((rawParts[i] === '+' || rawParts[i] === '-') && i + 1 < rawParts.length) {
        parts.push(rawParts[i] + rawParts[i + 1]);
        i++;
      }
      else {
        parts.push(rawParts[i]);
      }
    }

    if (!parts.length && remainingShortcut.trim().length > 0) {
      throw new Error(`DateShortcutParser: Invalid shortcut format "${shortcut}".`);
    }

    if (!parts.length) {
      if (adjustToWorkday) {
        currentDate = this.findClosestWorkday(currentDate);
      }
      return currentDate;
    }

    for (const part of parts) {
      const partRegex = /([+-])?(\d*)?([a-z]+)/;
      const match = part.match(partRegex);

      if (!match) {
        throw new Error(`DateShortcutParser: Invalid part format "${part}" in shortcut.`);
      }

      const [, sign, valueStr, unit] = match;
      const value = valueStr ? parseInt(valueStr, 10) : 1;
      const multiplier = sign === '-' ? -1 : 1;
      const amount = value * multiplier;

      const { datePatterns, ...unitDefinitions } = this.locale;

      let unitFound = false;
      for (const unitType in unitDefinitions) {
        if (Object.prototype.hasOwnProperty.call(unitDefinitions, unitType)) {
          const unitArray = unitDefinitions[unitType as keyof typeof unitDefinitions];
          if (Array.isArray(unitArray) && unitArray.includes(unit)) {
            unitFound = true;
            switch (unitType) {
              case 'year':
                currentDate.setUTCFullYear(currentDate.getUTCFullYear() + amount);
                break;
              case 'month':
                const originalDay = currentDate.getUTCDate();
                currentDate.setUTCDate(1);
                currentDate.setUTCMonth(currentDate.getUTCMonth() + amount);
                const daysInTargetMonth = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth() + 1, 0)).getUTCDate();
                currentDate.setUTCDate(Math.min(originalDay, daysInTargetMonth));
                break;
              case 'week':
                currentDate.setUTCDate(currentDate.getUTCDate() + amount * 7);
                break;
              case 'day':
                currentDate.setUTCDate(currentDate.getUTCDate() + amount);
                break;
              case 'weekday':
                currentDate = this.findNthWeekday(currentDate, value, sign === '-');
                break;
              case 'today':
                currentDate.setUTCHours(0, 0, 0, 0);
                break;
            }
          }
        }
      }

      if (!unitFound) {
        throw new Error(`DateShortcutParser: Unknown unit "${unit}" in shortcut.`);
      }
    }

    if (adjustToWorkday) {
      currentDate = this.findClosestWorkday(currentDate);
    }

    return currentDate;
  }

  private findNthWeekday(date: Date, n: number, fromEnd: boolean): Date {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    let dayCounter = 0;

    if (fromEnd) {
      const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0));
      const tempDate = new Date(lastDayOfMonth.getTime());
      for (let day = lastDayOfMonth.getUTCDate(); day >= 1; day--) {
        tempDate.setUTCDate(day);
        const dayOfWeek = tempDate.getUTCDay();
        if (dayOfWeek > 0 && dayOfWeek < 6) {
          dayCounter++;
          if (dayCounter === n) return tempDate;
        }
      }
    } else {
      const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      const tempDate = new Date(Date.UTC(year, month, 1));
      for (let day = 1; day <= daysInMonth; day++) {
        tempDate.setUTCDate(day);
        const dayOfWeek = tempDate.getUTCDay();
        if (dayOfWeek > 0 && dayOfWeek < 6) {
          dayCounter++;
          if (dayCounter === n) return tempDate;
        }
      }
    }

    throw new Error(`DateShortcutParser: Could not find the ${n}${n===1?'st':n===2?'nd':n===3?'rd':'th'} weekday for the specified month.`);
  }

  private findClosestWorkday(date: Date): Date {
    const dayOfWeek = date.getUTCDay();
    const adjustedDate = new Date(date.getTime());

    if (dayOfWeek === 6) { // Saturday
      adjustedDate.setUTCDate(date.getUTCDate() - 1);
    } else if (dayOfWeek === 0) { // Sunday
      adjustedDate.setUTCDate(date.getUTCDate() + 1);
    }

    return adjustedDate;
  }
}