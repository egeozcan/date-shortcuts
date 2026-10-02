# Changelog

## Unreleased

### Behavior changes

- **French `a` now means one year, not "today".** `a` was listed both as a year unit and as a
  "today" keyword in the `fr` locale, and the "today" meaning won, so `a`, `+1a` and `a +1j` did not
  do what they said. `a` is now only the year unit (`+1a` adds a year, a bare `a` is one year from
  today). Use `aujourdhui` or `maintenant` for today.
- Custom `datePatterns`: the capture-group order is now read from the whole `format` string. Before,
  only a format starting with `dd` was day-first, so `d/m/yyyy` was read as month-first. Formats
  starting with `dd`, `mm` or `yy` behave as before.

### Fixes

- Uppercase Turkish units and keywords such as `YIL`, `İŞGÜNÜ` and `ŞİMDİ` are recognized. Unit
  matching now also applies Turkish casing rules.
- A custom date pattern ending in a number (e.g. `2025 03 15`) no longer loses that number to the
  time parser. When a pattern's optional year could also be read as a time (e.g. an optional
  space-separated year), the number now goes to the date.
- Amounts that move the date out of the range `Date` supports (e.g. `99999999999y`) throw an error
  instead of returning an Invalid Date.

### Packaging

- The package now ships a CommonJS build next to the ES module build, so `require()` works.
- CI runs the tests on Node 20, 22 and 24 and checks the built package on Node 18.
- npm releases are published with `--provenance`.
