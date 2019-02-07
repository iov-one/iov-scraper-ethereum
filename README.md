# iov-scraper-ethereum

[![Build Status](https://travis-ci.com/iov-one/iov-scraper-ethereum.svg?branch=master)](https://travis-ci.com/iov-one/iov-scraper-ethereum)
[![Docker Pulls](https://img.shields.io/docker/pulls/iov1/iov-scraper-ethereum.svg)](https://hub.docker.com/r/iov1/iov-scraper-ethereum/)

The usage of this scraper is very simple, to install it, run:

```
yarn install
yarn build
```

Then start it for a IOV development blockchain using:

```
yarn dev-start
```
It plays very well with [ganache](https://github.com/trufflesuite/ganache-cli). So we recommend to have a local instance of ganache running on `http://localhost:8545`

## API
This scraper is intended to use same API as [etherscan](https://etherscan.io/apis)

### Accounts
- [ ] Get a list of 'Internal' Transactions by Address
