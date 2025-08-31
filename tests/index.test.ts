import { describe, it, expect, beforeEach } from 'vitest';
import { DateShortcutParser } from '../src';

describe('DateShortcutParser', () => {
  let fromDate: Date;
  let enParser: DateShortcutParser;
  let deParser: DateShortcutParser;

  beforeEach(() => {
    fromDate = new Date('2024-05-15T10:00:00Z'); // A Wednesday
    enParser = new DateShortcutParser({ fromDate, locale: 'en' });
    deParser = new DateShortcutParser({ fromDate, locale: 'de' });
  });

  it('should parse \'t\' as today', () => {
    const result = enParser.parse('t');
    const expected = new Date(fromDate);
    expected.setUTCHours(0, 0, 0, 0);
    expect(result.getTime()).toBe(expected.getTime());
  });

  it('should parse \'1y\'', () => {
    const result = enParser.parse('1y');
    expect(result.getUTCFullYear()).toBe(2025);
    expect(result.getUTCHours()).toBe(0);
  });

  it('should parse \'1y 2m\'', () => {
    const result = enParser.parse('1y 2m');
    expect(result.getUTCFullYear()).toBe(2025);
    expect(result.getUTCMonth()).toBe(6); // July
  });

  it('should parse \'1y 2m -3d\'', () => {
    const result = enParser.parse('1y 2m -3d');
    expect(result.getUTCFullYear()).toBe(2025);
    expect(result.getUTCMonth()).toBe(6); // July
    expect(result.getUTCDate()).toBe(12);
  });

  it('should parse \'t+3d.\'', () => {
    const result = enParser.parse('t+3d.'); // fromDate is Wed, +3d is Sat, closest workday is Fri
    expect(result.toISOString().split('T')[0]).toBe('2024-05-17');
  });

  it('should handle spaces: \'1y 2w -3d\'', () => {
    const result = enParser.parse('1y 2w -3d');
    expect(result.getUTCFullYear()).toBe(2025);
    expect(result.getUTCMonth()).toBe(4);
    expect(result.getUTCDate()).toBe(26);
  });

  it('should handle more spaces: \' 2m  -1d \'', () => {
    const result = enParser.parse(' 2m  -1d ');
    expect(result.getUTCMonth()).toBe(6);
    expect(result.getUTCDate()).toBe(14);
  });

  it('should parse partial date (en): \'05/20\'', () => {
    const result = enParser.parse('05/20');
    expect(result.getUTCFullYear()).toBe(2024);
    expect(result.getUTCMonth()).toBe(4);
    expect(result.getUTCDate()).toBe(20);
  });

  it('should parse partial date with year (en): \'5/20/25\'', () => {
    const result = enParser.parse('5/20/25');
    expect(result.getUTCFullYear()).toBe(2025);
    expect(result.getUTCMonth()).toBe(4);
    expect(result.getUTCDate()).toBe(20);
  });

  it('should parse partial date and operations (en): \'05/20 + 2w.\'', () => {
    const result = enParser.parse('05/20 + 2w.');
    expect(result.toISOString().split('T')[0]).toBe('2024-06-03');
  });

  it('should parse partial date (de): \'23.03\'', () => {
    const result = deParser.parse('23.03');
    expect(result.getUTCFullYear()).toBe(2024);
    expect(result.getUTCMonth()).toBe(2);
    expect(result.getUTCDate()).toBe(23);
  });

  it('should parse partial date with year (de): \'23.03.2025\'', () => {
    const result = deParser.parse('23.03.2025');
    expect(result.getUTCFullYear()).toBe(2025);
    expect(result.getUTCMonth()).toBe(2);
    expect(result.getUTCDate()).toBe(23);
  });

  it('should parse partial date and operations (de): \'23.03 + 2woche.\'', () => {
    const result = deParser.parse('23.03 + 2woche.');
    // 23.03.2024 is Saturday. + 2 weeks = 06.04.2024 is Saturday. Closest workday is Friday 05.04.2024
    expect(result.toISOString().split('T')[0]).toBe('2024-04-05');
  });

  it('should parse date and subtract: \'1.1 -1d\'', () => {
    const parser = new DateShortcutParser({ fromDate: new Date('2024-01-01T10:00:00Z'), locale: 'de' });
    const result = parser.parse('1.1 -1d');
    expect(result.getUTCFullYear()).toBe(2023);
    expect(result.getUTCMonth()).toBe(11);
    expect(result.getUTCDate()).toBe(31);
  });
});

describe('DateShortcutParser with time', () => {
  let fromDate: Date;
  let enParser: DateShortcutParser;
  let deParser: DateShortcutParser;

  beforeEach(() => {
    fromDate = new Date('2024-05-15T10:00:00Z'); // A Wednesday
    enParser = new DateShortcutParser({ fromDate, locale: 'en' });
    deParser = new DateShortcutParser({ fromDate, locale: 'de' });
  });

  it('should parse time with pm', () => {
    const result = enParser.parse('t 3:30pm');
    expect(result.getUTCHours()).toBe(15);
    expect(result.getUTCMinutes()).toBe(30);
  });

  it('should parse time without minutes', () => {
    const result = enParser.parse('11pm');
    expect(result.getUTCHours()).toBe(23);
    expect(result.getUTCMinutes()).toBe(0);
  });

  it('should parse 24-hour time', () => {
    const result = deParser.parse('h 18:45');
    expect(result.getUTCHours()).toBe(18);
    expect(result.getUTCMinutes()).toBe(45);
  });

  it('should handle 12am correctly', () => {
    const result = enParser.parse('1/1/25 12am');
    expect(result.getUTCFullYear()).toBe(2025);
    expect(result.getUTCHours()).toBe(0);
    expect(result.getUTCDate()).toBe(1);
  });

  it('should handle 12pm correctly', () => {
    const result = enParser.parse('1/1/25 12pm');
    expect(result.getUTCFullYear()).toBe(2025);
    expect(result.getUTCHours()).toBe(12);
    expect(result.getUTCDate()).toBe(1);
  });

  it('should apply default time', () => {
    const parser = new DateShortcutParser({ fromDate, locale: 'en', defaultTime: '09:30' });
    const result = parser.parse('t+1d');
    expect(result.toISOString().split('T')[0]).toBe('2024-05-16');
    expect(result.getUTCHours()).toBe(9);
    expect(result.getUTCMinutes()).toBe(30);
  });

  it('should let explicit time override default time', () => {
    const parser = new DateShortcutParser({ fromDate, locale: 'en', defaultTime: '09:30' });
    const result = parser.parse('t+1d 5pm');
    expect(result.toISOString().split('T')[0]).toBe('2024-05-16');
    expect(result.getUTCHours()).toBe(17);
  });

  it('should parse just a time, keeping the date', () => {
    const result = enParser.parse('8:00');
    expect(result.toISOString().split('T')[0]).toBe('2024-05-15');
    expect(result.getUTCHours()).toBe(8);
    expect(result.getUTCMinutes()).toBe(0);
  });
});

describe('DateShortcutParser Edge Cases', () => {
  let fromDate: Date;
  let enParser: DateShortcutParser;

  beforeEach(() => {
    fromDate = new Date('2024-01-31T10:00:00Z'); // Last day of Jan
    enParser = new DateShortcutParser({ fromDate, locale: 'en' });
  });

  // Invalid inputs
  it('should throw on empty or whitespace string', () => {
    expect(() => enParser.parse('')).toThrow('Shortcut string cannot be empty.');
    expect(() => enParser.parse('   ')).toThrow('Shortcut string cannot be empty.');
  });

  it('should throw on invalid part format', () => {
    expect(() => enParser.parse('1y +')).toThrow('Invalid part format "+"');
    expect(() => enParser.parse('d1')).toThrow('Invalid part format "d1"');
    expect(() => enParser.parse('++1d')).toThrow('Invalid part format "++1d"');
    expect(() => enParser.parse('garbage')).toThrow('Unknown unit "garbage"');
  });

  // Invalid time formats
  it('should throw on invalid time', () => {
    expect(() => enParser.parse('25:00')).toThrow('Invalid hour "25" in shortcut.');
    expect(() => enParser.parse('10:61')).toThrow('Invalid time format in shortcut');
    expect(() => enParser.parse('13pm')).toThrow('Invalid hour "13" for AM/PM format.');
    expect(() => enParser.parse('0am')).toThrow('Invalid hour "0" for AM/PM format.');
  });

  // Invalid constructor options
  it('should throw on invalid defaultTime in constructor', () => {
    expect(() => new DateShortcutParser({ defaultTime: '99:00' })).toThrow('Invalid time values in defaultTime');
    expect(() => new DateShortcutParser({ defaultTime: 'not-a-time' })).toThrow('Invalid defaultTime format');
  });

  // Date calculation edge cases
  it('should handle month-end rollovers correctly on leap year', () => {
    // fromDate is Jan 31, 2024. +1m should be Feb 29, 2024 (leap year)
    const result = enParser.parse('+1m');
    expect(result.getUTCFullYear()).toBe(2024);
    expect(result.getUTCMonth()).toBe(1); // February
    expect(result.getUTCDate()).toBe(29);
  });

  it('should handle non-leap year month-end rollovers', () => {
    const parser = new DateShortcutParser({ fromDate: new Date('2025-01-31T10:00:00Z') });
    // fromDate is Jan 31, 2025. +1m should be Feb 28, 2025
    const result = parser.parse('+1m');
    expect(result.getUTCFullYear()).toBe(2025);
    expect(result.getUTCMonth()).toBe(1); // February
    expect(result.getUTCDate()).toBe(28);
  });

  // Weekday parsing edge cases
  it('should throw if requested weekday does not exist', () => {
    // Feb 2025 has 20 weekdays.
    const parser = new DateShortcutParser({ fromDate: new Date('2025-02-10T10:00:00Z') });
    expect(() => parser.parse('21wd')).toThrow('DateShortcutParser: Could not find the 21. weekday for the specified month.');
    expect(() => parser.parse('-21wd')).toThrow('DateShortcutParser: Could not find the 21. weekday for the specified month.');
  });

  // Tricky but valid inputs
  it('should handle date followed by a workday adjustment dot', () => {
    const deParser = new DateShortcutParser({ fromDate: new Date('2024-03-23T10:00:00Z'), locale: 'de' }); // Saturday
    const result = deParser.parse('23.03.');
    expect(result.toISOString().split('T')[0]).toBe('2024-03-22'); // Should be Friday
  });

  it('should handle relative date with a workday adjustment dot', () => {
    const parser = new DateShortcutParser({ fromDate: new Date('2024-05-17T10:00:00Z') }); // Friday
    const result = parser.parse('t+1d.'); // +1 day is Saturday, adjusts to Friday
    expect(result.toISOString().split('T')[0]).toBe('2024-05-17');
  });
});

describe('DateShortcutParser Today keyword combinations', () => {
  let parser: DateShortcutParser;
  beforeEach(() => {
    // Wednesday, May 15, 2024
    parser = new DateShortcutParser({ fromDate: new Date('2024-05-15T10:00:00Z') });
  });

  it('should handle "t +1d" with time', () => {
    const result = parser.parse('t +1d 5:30pm');
    expect(result.toISOString()).toBe('2024-05-16T17:30:00.000Z');
  });

  it('should handle "today + 1d"', () => {
    const result = parser.parse('today + 1d');
    expect(result.toISOString().split('T')[0]).toBe('2024-05-16');
  });

  it('should handle reversed order "+1d t"', () => {
    // 't' here acts as a no-op part, but shouldn't break anything
    const result = parser.parse('+1d t');
    expect(result.toISOString().split('T')[0]).toBe('2024-05-16');
  });

  it('should handle subtraction "t-1d"', () => {
    const result = parser.parse('t-1d');
    expect(result.toISOString().split('T')[0]).toBe('2024-05-14');
  });

  it('should handle "+t" as a no-op for date part', () => {
    const result = parser.parse('+t');
    // fromDate is May 15, but date parts are reset to midnight
    expect(result.toISOString()).toBe('2024-05-15T00:00:00.000Z');
  });

  it('should handle just "t"', () => {
    const result = parser.parse('t');
    expect(result.toISOString()).toBe('2024-05-15T00:00:00.000Z');
  });

  it('should handle multiple "t"s', () => {
    const result = parser.parse('t t t t t');
    expect(result.toISOString()).toBe('2024-05-15T00:00:00.000Z');
  });

  it('should handle "t +1d 5:30pm"', () => {
    const result = parser.parse('t +1d 5:30pm');
    expect(result.toISOString()).toBe('2024-05-16T17:30:00.000Z');
  });
});