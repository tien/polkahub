## Unreleased

## 0.2.2 2025-11-08

### Fixed

- `ledger`: Vite not using `buffer` polyfill when in dev mode.
- `PolkaHubModal`: Prevent auto-closing the dialog when the ss58 format changes.
- `ui-components`: Account select is not scrollable when using default `@radix-ui/react-dialog` in another dialog.

## 0.2.1 2025-11-07

### Fixed

- `selectAccountPlugin.selectedAccount$` is not using the configured SS58 format.

## 0.2.0 2025-11-07

### Changed

- Added global `ss58Format` option to `createPolkaHub`. The views will use this format to show account addresses.
- `useSS58Format` and `useSS58Formatter` to get this value from context.
- Changed the `Plugin` interface: Now it receives both the plugins and ss58 format through `receiveContext` property.
- `createLedgerProvider` doesn't take an ss58Format from the networkInfo parameter anymore.

## 0.1.1 2025-11-06

### Changed

Initial release
