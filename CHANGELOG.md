# Changelog

## 0.4.0

- Add fields `gas` (the gas limit) and `gasPrice` to the transactions list output
- Fix off-by-one error in confirmations count: starts with 1 as soon as transaction is in a block

Breaking changes

- Convert confirmations count to string

## 0.3.0

- Start indexing as soon as the scraper is started
- Better HTTP errors for `module` and `action` parameters
- Add initial proxy module (with actions `eth_blockNumber` and `eth_getTransactionByHash`)

Breaking changes

- Move API to the `/api` endpoint. Before any path worked.
- Remove `/blocks` endpoint since the full blocks are not stored anymore
- Add `includeData` parameter to `/accounts`. Set to "1" to include data. Unset by default.
