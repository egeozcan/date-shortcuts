# Date Shortcut Parser

A lightweight and powerful TypeScript library for parsing human-readable date shortcuts into `Date` objects. This library is perfect for applications that need to handle user input for dates in a flexible and intuitive way.

## Features

- **Relative Dates:** Easily add or subtract years, months, weeks, and days from a given date.
- **Specific Dates:** Parse specific dates in various formats (e.g., `mm/dd/yyyy`, `dd.mm.yyyy`).
- **Localization:** Built-in support for English, German, French, and Turkish, with the ability to add custom localizations.
- **Weekday Parsing:** Find the nth weekday of a month (e.g., the 2nd weekday).
- **Closest Workday:** Adjust a date to the closest workday.
- **Zero Dependencies:** A lightweight library with no external dependencies.

## Installation

```bash
npm install date-shortcut-parser
```

## Usage

Here's a simple example of how to use the `DateShortcutParser`:

```typescript
import { DateShortcutParser } from 'date-shortcut-parser';

const parser = new DateShortcutParser();

// Add 1 year, 2 months, and subtract 3 days from the current date
const futureDate = parser.parse('1y 2m -3d');

console.log(futureDate);
```

## API Reference

### `DateShortcutParser`

The main class for parsing date shortcuts.

#### `new DateShortcutParser(options?: DateShortcutParserOptions)`

Creates a new instance of the `DateShortcutParser`.

- `options` (optional): An object with the following properties:
    - `fromDate` (optional): The starting date for calculations. Defaults to the current date and time.
    - `locale` (optional): The locale to use for parsing. Can be a predefined string ('en', 'de', 'fr', 'tr') or a custom `Localization` object. Defaults to 'en'.

#### `parse(shortcut: string): Date`

Parses a date shortcut string and returns a `Date` object.

- `shortcut`: The date shortcut string to parse.

## Shortcut Syntax

The following table describes the supported shortcut syntax:

| Unit      | Description        | Examples                               |
| --------- | ------------------ | -------------------------------------- |
| `y`, `yr`   | Year               | `+1y`, `-2yr`, `1y`                      |
| `m`, `mo`   | Month              | `+3m`, `-1mo`, `6m`                      |
| `w`, `wk`   | Week               | `+2w`, `-4wk`, `1w`                      |
| `d`       | Day                | `+5d`, `-10d`, `15d`                     |
| `wd`      | Weekday            | `2wd` (2nd weekday), `-1wd` (last weekday) |
| `.`       | Closest Workday    | `.` (adjusts to the closest workday)   |
| `t`, `today`   | Today's Date       | `t`, `today`, `t+1d`                   |

### Specific Dates

You can also parse specific dates. The supported formats depend on the locale.

- **English (`en`):** `mm/dd/yyyy` or `mm/dd`
- **German (`de`):** `dd.mm.yyyy` or `dd.mm`
- **French (`fr`):** `dd/mm/yyyy` or `dd/mm`
- **Turkish (`tr`):** `dd.mm.yyyy` or `dd.mm`

## Localization

The library comes with built-in support for English, German, French, and Turkish. You can specify the locale in the `DateShortcutParser` constructor:

```typescript
const parser = new DateShortcutParser({ locale: 'de' });
```

You can also provide a custom localization object:

```typescript
import { DateShortcutParser, Localization } from 'date-shortcut-parser';

const customLocale: Localization = {
  year: ['y'],
  month: ['m'],
  week: ['w'],
  day: ['d'],
  today: ['today'],
  weekday: ['wd'],
  datePatterns: [
    { regex: /^(\d{4})-(\d{2})-(\d{2})/, format: 'yyyy-mm-dd' },
  ],
};

const parser = new DateShortcutParser({ locale: customLocale });
```

## Examples

```typescript
import { DateShortcutParser } from 'date-shortcut-parser';

const fromDate = new Date('2024-05-15T10:00:00Z'); // A Wednesday
const enParser = new DateShortcutParser({ fromDate, locale: 'en' });
const deParser = new DateShortcutParser({ fromDate, locale: 'de' });

// Today
enParser.parse('t'); // -> 2024-05-15

// Add 1 year, 2 months, and subtract 3 days
enParser.parse('1y 2m -3d'); // -> 2025-07-12

// Add 3 days to today and find the closest workday
enParser.parse('t+3d.'); // -> 2024-05-20 (Friday)

// Parse a partial date and add 2 weeks, then find the closest workday
enParser.parse('05/20 + 2w.'); // -> 2024-06-03 (Monday)

// Parse a partial date in German and add 2 weeks, then find the closest workday
deParser.parse('23.03 + 2woche.'); // -> 2024-04-08 (Monday)

// Parse a date and subtract 1 day
deParser.parse('1.1 -1d'); // -> 2023-12-31
```

## Development

- Install dependencies:

```bash
npm install
```

- Run the unit tests:

```bash
npm run test
```

- Build the library:

```bash
npm run build
```