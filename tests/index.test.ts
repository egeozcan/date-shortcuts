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