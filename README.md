# Date Shortcut Parser

A lightweight and powerful TypeScript library for parsing human-readable date shortcuts into `Date` objects. This library is perfect for applications that need to handle user input for dates in a flexible and intuitive way.

## Features

-   **Relative Dates:** Easily add or subtract years, months, weeks, and days.
-   **Specific Dates:** Parse specific dates in various formats (e.g., `mm/dd/yyyy`, `dd.mm.yyyy`).
-   **Time Parsing:** Parse time with 12-hour (am/pm) or 24-hour format (e.g., `5pm`, `17:30`).
-   **Default Time:** Set a default time to be applied if none is specified in the shortcut.
-   **Localization:** Built-in support for English, German, French, and Turkish, with easy customization.
-   **Weekday Parsing:** Find the nth weekday of a month (e.g., `2wd` for the 2nd weekday).
-   **Closest Workday:** Adjust a date to the closest workday.
-   **Timezone-Agnostic:** All calculations are performed in UTC to ensure consistent results.
-   **Zero Dependencies:** A lightweight library with no external dependencies.

## Installation

```bash
npm install date-shortcut-parser
```

## Usage

Here's a simple example of how to use the `DateShortcutParser`:

```typescript
import { DateShortcutParser } from 'date-shortcut-parser';

// By default, calculations are relative to the current date.
const parser = new DateShortcutParser();

// "Tomorrow at 5:30 PM"
const futureDate = parser.parse('+1d 5:30pm');

console.log(futureDate);

// Create a parser with a specific 'from' date and a default time.
const customParser = new DateShortcutParser({
  fromDate: new Date('2024-00-01T00:00:00Z'),
  defaultTime: '09:00',
});

// "January 2nd, 2024 at 9:00 AM" (default time is applied)
const morningMeeting = customParser.parse('+1d');

console.log(morningMeeting); // 2024-01-02T09:00:00.000Z
```

## API Reference

### `DateShortcutParser`

The main class for parsing date shortcuts.

#### `new DateShortcutParser(options?: DateShortcutParserOptions)`

Creates a new instance of the `DateShortcutParser`.

-   `options` (optional): An object with the following properties:
  -   `fromDate` (optional, `Date`): The starting date for calculations. Defaults to the current date and time (`new Date()`).
  -   `locale` (optional, `'en' | 'de' | 'fr' | 'tr' | Localization`): The locale to use for parsing. Can be a predefined string or a custom `Localization` object. Defaults to `'en'`.
  -   `defaultTime` (optional, `string`): A default time in `HH:mm` or `HH:mm:ss` format to apply if the shortcut doesn't specify one. Example: `'09:30'`.

#### `parse(shortcut: string): Date`

Parses a date shortcut string and returns a `Date` object.

-   `shortcut`: The date shortcut string to parse.

## Shortcut Syntax

Components are combined with spaces. The order of date components is generally flexible, but the time component must always come at the end.

### Date Components

| Unit    | Description                 | Aliases (English)          | Examples                    |
| :------ | :-------------------------- | :------------------------- | :-------------------------- |
| Year    | Add/subtract years          | `y`, `yr`, `year`, `years` | `+1y`, `-2yr`, `1year`        |
| Month   | Add/subtract months         | `m`, `mo`, `month`, `months` | `+3m`, `-1mo`, `6month`       |
| Week    | Add/subtract weeks          | `w`, `wk`, `week`, `weeks` | `+2w`, `-4wk`, `1week`        |
| Day     | Add/subtract days           | `d`, `day`, `days`         | `+5d`, `-10day`, `15d`        |
| Weekday | Nth weekday of the month    | `wd`, `weekday`            | `2wd` (2nd), `-1wd` (last)    |
| Workday | Adjust to closest workday   | `.` (at the very end)      | `+2d.` (Sat -> Fri) |

### Specific Dates

The supported formats depend on the locale. If the year is omitted, the `fromDate`'s year is used.

-   **English (`en`):** `mm/dd` or `mm/dd/yyyy` (e.g., `10/26`, `10/26/2025`)
-   **German (`de`):** `dd.mm` or `dd.mm.yyyy` (e.g., `26.10`, `26.10.2025`)
-   **French (`fr`):** `dd/mm` or `dd/mm/yyyy` (e.g., `26/10`, `26/10/2025`)
-   **Turkish (`tr`):** `dd.mm` or `dd.mm.yyyy` (e.g., `26.10`, `26.10.2025`)

### Time Components

Time is always specified at the end of the shortcut. If no time is provided, it defaults to midnight (`00:00:00`) or the `defaultTime` if set.

| Format      | Description                                          | Examples                      |
| :---------- | :--------------------------------------------------- | :---------------------------- |
| `HH:mm:ss`  | 24-hour format. Seconds and minutes are optional.    | `17:30`, `09:00:15`, `14`       |
| `h:mm` am/pm | 12-hour format (English locale). Minutes are optional. | `5:30pm`, `9am`, `11pm`         |

## Localization

The library comes with built-in support for English, German, French, and Turkish. You can specify the locale in the `DateShortcutParser` constructor:

```typescript
const parser = new DateShortcutParser({ locale: 'de' });
```

You can also provide a custom localization object to support different languages or date formats. Note that locales like German, French, and Turkish have empty `am` and `pm` arrays by default, meaning they only support 24-hour time formats unless customized.

```typescript
import { DateShortcutParser, Localization } from 'date-shortcut-parser';

const customLocale: Localization = {
  year: ['y'],
  month: ['m'],
  week: ['w'],
  day: ['d'],
  today: [],
  weekday: ['wd'],
  datePatterns: [
    { regex: /^(\d{4})-(\d{2})-(\d{2})/, format: 'yyyy-mm-dd' },
  ],
  am: ['am', 'a.m.'], // Custom AM markers
  pm: ['pm', 'p.m.'], // Custom PM markers
};

const parser = new DateShortcutParser({ locale: customLocale });

// With a custom locale, you can support formats like 'YYYY-MM-DD'
parser.parse('2025-12-25');
```

## Examples

```typescript
import { DateShortcutParser } from 'date-shortcut-parser';

// Use a fixed date for predictable examples (Wednesday, May 15, 2024)
const fromDate = new Date('2024-05-15T10:00:00Z');
const parser = new DateShortcutParser({ fromDate });

// --- Basic Date Math ---
// Add 1 year, 2 months, and subtract 3 days from the fromDate
parser.parse('1y 2m -3d'); // -> 2025-07-12T00:00:00.000Z

// Add one day (tomorrow)
parser.parse('+1d'); // -> 2024-05-16T00:00:00.000Z

// --- Time Parsing ---
// Tomorrow at 5 PM
parser.parse('+1d 5pm'); // -> 2024-05-16T17:00:00.000Z

// Just a time - keeps the date part of fromDate
parser.parse('8:00'); // -> 2024-05-15T08:00:00.000Z

// --- Specific Dates & Times ---
// An absolute date with time
parser.parse('12/25/2025 7:30am'); // -> 2025-12-25T07:30:00.000Z

// --- Workday Adjustment ---
// Add 3 days (Wednesday -> Saturday), then adjust to closest workday (Friday)
parser.parse('+3d.'); // -> 2024-05-17T00:00:00.000Z

// --- Using defaultTime ---
const morningParser = new DateShortcutParser({ fromDate, defaultTime: '09:00' });

// Tomorrow, with default time applied
morningParser.parse('+1d'); // -> 2024-05-16T09:00:00.000Z

// Tomorrow, with explicit time overriding the default
morningParser.parse('+1d 1pm'); // -> 2024-05-16T13:00:00.000Z

// --- Weekday Parsing ---
// The second weekday of the fromDate's month (May 2024)
parser.parse('2wd'); // -> 2024-05-02T00:00:00.000Z (Thursday)

// The last weekday of the fromDate's month
parser.parse('-1wd'); // -> 2024-05-31T00:00:00.000Z (Friday)

// --- Localization ---
const deParser = new DateShortcutParser({ fromDate, locale: 'de' });

// Parse a German date format and add 2 weeks
deParser.parse('23.03 + 2woche'); // -> 2024-04-06T00:00:00.000Z
```

## Development

-   Install dependencies:

```bash
npm install
```

-   Run the unit tests:

```bash
npm test
```

-   Build the library:

```bash
npm run build
```