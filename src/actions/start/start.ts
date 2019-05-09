import cors = require("@koa/cors");
import Koa from "koa";
import bodyParser from "koa-bodyparser";

import * as constants from "../../constants";
import { HttpError } from "../api/httperror";
import { RequestParser } from "../api/requestparser";

import { Scraper } from "../../blockchain/scraper";

let count = 0;

/** returns an integer >= 0 that increments and is unique in module scope */
function getCount(): number {
  return count++;
}

export const api = new Koa();

export async function start(args: ReadonlyArray<string>): Promise<void> {
  if (args.length < 1) {
    throw Error(`Not enough arguments for action 'start'. See README for arguments`);
  }
  const blockchainBaseUrl: string = args[0];

  const port = constants.port;

  console.log("Connecting to blockchain ...");
  const scraper = await Scraper.establish(blockchainBaseUrl);
  const chainId = scraper.chainId();

  console.log("Creating webserver ...");
  api.use(cors());
  api.use(bodyParser());

  api.use(async context => {
    switch (context.path) {
      case "/healthz":
      case "/status":
        // tslint:disable-next-line:no-object-mutation
        context.response.body = {
          status: "ok",
          nodeUrl: blockchainBaseUrl,
          chainId: chainId,
          blocks: await scraper.height(),
        };
        break;
      case "/blocks":
        await scraper.loadBlockchain();
        const blocks = scraper.getBlocks();
        // tslint:disable-next-line:no-object-mutation
        context.response.body = {
          blocks: blocks,
        };
        break;
      case "/accounts":
        await scraper.loadBlockchain();
        const accounts = scraper.getAccounts();
        // tslint:disable-next-line:no-object-mutation
        context.response.body = {
          accounts: accounts,
        };
        break;
      default:
        // koa sends 404 by default
        const q = context.request.query;
        if (q.module === "account" && q.action === "txlist") {
          if (context.request.method !== "GET") {
            throw new HttpError(405, "This endpoint requires a GET request");
          }
          const options = RequestParser.parseAccountBody(q);
          if (!scraper.isValidAddress(options.address)) {
            throw new HttpError(400, "Address is not in the expected format for this chain.");
          }
          await scraper.loadBlockchain();
          const accountTxs = scraper.getAccountTxs(options);
          // tslint:disable-next-line:no-object-mutation
          context.response.body = accountTxs !== undefined ? accountTxs : { result: null };
        }
      // koa sends 404 by default
    }
  });

  console.log(`Starting webserver on port ${port} ...`);
  api.listen(port);
}
