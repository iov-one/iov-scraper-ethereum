# Changelog

## 0.3.0

- Start indexing as soon as the scraper is started
- Better HTTP errors for `module` and `action` parameters

Breaking changes

- Move API to the `/api` endpoint. Before any path worked.
- Remove `/blocks` endpoint since the full blocks are not stored anymore
