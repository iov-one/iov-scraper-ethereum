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

## Usage

```
Usage: iov-scraper-ethereum action [arguments...]

Positional arguments per action are listed below. Arguments in parentheses are optional.

help      Shows a help text and exits

version   Prints the version and exits

start     Starts the scraper
           1  Ganache base URL, e.g. http://localhost:8545

Environment variables

SCRAPER_PORT              Port of the webserver. Defaults to 8546.
```

### Development
The yarn script `dev-start` calls `start` with a set of default options for local development. It uses the default development ganache node `http://localhost:8545`, and exports the API enty point URL `http://localhost:8546`.

## API
This scraper is intended to use same API as [etherscan](https://etherscan.io/apis)

### Status

Get current status
```
curl http://localhost:8546/status
```

### Blocks
Get all blocks
```
curl http://localhost:8546/blocks
```
### Accounts
Get all accounts listed by address
```
curl http://localhost:8546/accounts
```

Get account by address
```
curl -X GET "http://localhost:8546/?module=account&action=txlist&address=0x65e2ff4c989dd53387dfeff8b36e58265047cf34"
```

## TODO
- [x] Get a list of 'Internal' Transactions by Address
- [x] Allow url path querying as etherscan
- [ ] Complete set of APIs
- [ ] Implement local DB to load full chain
