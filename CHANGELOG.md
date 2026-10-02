# Changelog

## Unreleased

Changes since 1.0.3. Several inputs that used to return a wrong date now throw, and French `a`
changes meaning, so release this as a minor (or major) version rather than a patch.

### Behavior changes

- **French `a` now means one year, not "today".** `a` was listed both as a year unit and as a
  "today" keyword in the `fr` locale, so a bare `a` meant today and `a +1j` meant tomorrow. `a` is
  now only the year unit: a bare `a` is one year from today and `a +1j` is a year and a day from
  today. `+1a` still adds a year. Use `aujourdhui` or `maintenant` for today.
- Custom locales: a keyword listed under several unit types now uses only the first of year, month,
  week, day, weekday, today. In 1.0.3 every matching unit was applied.
- Custom `datePatterns`: the capture-group order is now read from where `d`, `m` and `y` first
  appear in the `format` string. In 1.0.3 only a format starting with `dd` was day-first and
  everything else was month, day, year, so `d/m/yyyy` and `yyyy-mm-dd` were read wrongly. A format
  must now contain a day and a month, otherwise parsing a matching date throws. A format without a
  year still reads an optional year from the group after the day and month.
- When a custom pattern's optional year could also be read as a time (e.g. an optional
  space-separated year), the number now goes to the date: with `/^(\d{1,2})\.(\d{1,2})(?: (\d{2,4}))?/`,
  `15.03 12` is March 15, 2012, not March 15 at 12:00. Times with minutes or am/pm
  (`15.03 12:00`, `15.03 12pm`) are still times.
- Custom date patterns are matched against the shortcut as typed, not lowercased; add the `i` flag
  to a pattern that contains letters if it should be case-insensitive.
- Date patterns only count when they match at the start of the shortcut (after an optional today
  keyword).
- Impossible dates such as `2/30` or `13/45/2024` throw instead of rolling over.
- Built-in date patterns accept only 2- or 4-digit years; 2-digit years map to 20xx, and years
  below 100 are no longer moved into the 1900s.

### Fixes

- Non-ASCII unit keywords such as `gün`, `yıl` and `année` work.
- Adding years clamps the day to the target month (`2/29/2024 +1y` is Feb 28, 2025, not Mar 1).
- A today keyword followed by a space and a date (`t 5/20 5pm`) works.
- Changing the `fromDate` object after creating the parser no longer affects it.
- Custom am/pm markers containing regex characters (e.g. `p.m.`) are matched literally.
- Uppercase Turkish units and keywords such as `YIL`, `İŞGÜNÜ` and `ŞİMDİ` are recognized. Unit
  matching now also applies Turkish casing rules.
- A custom date pattern ending in a number (e.g. `2025 03 15`) no longer loses that number to the
  time parser.
- Custom date patterns with the `g` or `y` flag work; before `g` patterns always failed and `y`
  patterns failed on every other call.
- Amounts that move the date out of the range `Date` supports (e.g. `99999999999y`) throw an error
  instead of returning an Invalid Date.

### Packaging

- The package now ships a CommonJS build next to the ES module build, so `require()` works.
- CI runs the tests on Node 20, 22 and 24 and checks the built package on Node 18.
- npm releases are published with `--provenance`.
