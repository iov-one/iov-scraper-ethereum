// tslint:disable: no-object-mutation
import { ChainId } from "@iov/bcp";
import { ethereumCodec, EthereumConnection } from "@iov/ethereum";

import { AccountRequestBodyData } from "../actions/api/requestparser";
import { JsonRcpClient } from "./jsonrpcclient";
import { decodeHexQuantityString } from "./utils";

function getErrorFlag(txStatus: string): "0" | "1" {
  switch (txStatus) {
    case "0":
      return "1";
    case "1":
      return "0";
    default:
      throw new Error("Invalid transaction status");
  }
}

export interface TxsAccount {
  readonly status: string;
  readonly message: string;
  readonly result: ReadonlyArray<TxDetails>;
}

export interface TxDetails {
  readonly hash: string;
  readonly blockNumber: string;
  readonly nonce: string;
  /** The gas limit set by the user */
  readonly gas: string;
  /** The gas price */
  readonly gasPrice: string;
  /** The gas that was used to execute the transaction */
  readonly gasUsed: string;
  readonly value: string;
  readonly from: string;
  readonly to: string;
  readonly input: string;
  readonly txreceipt_status: string;
  readonly isError: "0" | "1";
  readonly confirmations: string;
}

export interface AccountStorage {
  readonly status: string;
  readonly message: string;
  // tslint:disable-next-line: readonly-array
  readonly result: TxDetails[];
}

/** This is what needs to be persisted in the long run */
class Database {
  // tslint:disable-next-line: readonly-keyword
  public lastBlockLoaded: number;
  // tslint:disable-next-line: readonly-keyword
  public accounts: Map<string, AccountStorage>;

  constructor() {
    this.lastBlockLoaded = 0;
    this.accounts = new Map();
  }

  public clear(): void {
    this.lastBlockLoaded = 0;
    this.accounts = new Map();
  }
}

/**
 * A compare function to be used in sort() as described in
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort#Description
 */
function compareTransactions(a: TxDetails, b: TxDetails): number {
  return Number(a.blockNumber) - Number(b.blockNumber);
}

function isStringOrNull(data: unknown): data is string | null {
  if (data === null) {
    return true;
  }
  return typeof data === "string";
}

export class Scraper {
  public static async establish(baseUrl: string): Promise<Scraper> {
    const connection = await EthereumConnection.establish(baseUrl, {});
    const rpcClient = new JsonRcpClient(baseUrl);
    return new Scraper(connection, rpcClient);
  }

  public readonly connection: EthereumConnection;
  public readonly rpcClient: JsonRcpClient;
  private readonly db = new Database();

  constructor(connection: EthereumConnection, rpcClient: JsonRcpClient) {
    this.connection = connection;
    this.rpcClient = rpcClient;
  }

  public chainId(): ChainId {
    return this.connection.chainId();
  }

  public async height(): Promise<number> {
    return this.connection.height();
  }

  public isValidAddress(address: string): boolean {
    return ethereumCodec.isValidAddress(address);
  }

  public getTransactions(address: string): ReadonlyArray<TxDetails> {
    const account = this.db.accounts.get(address.toLowerCase());
    if (!account) {
      throw new Error("Address not found");
    }
    return account.result;
  }

  public getAccounts(): ReadonlyMap<string, TxsAccount> {
    return this.db.accounts;
  }

  public getAccount(options: AccountRequestBodyData): TxsAccount | undefined {
    const account = this.db.accounts.get(options.address.toLowerCase());
    if (!account) {
      return undefined;
    }

    // we only sort and filter this array, so no deep copy is required
    // tslint:disable-next-line: readonly-array
    let resultCopy = [...account.result];

    if (options.startblock !== undefined) {
      const startblock = Number(options.startblock);
      resultCopy = resultCopy.filter((tx: TxDetails) => Number(tx.blockNumber) >= startblock);
    }

    if (options.endblock !== undefined) {
      const endblock = Number(options.endblock);
      resultCopy = resultCopy.filter((tx: TxDetails) => Number(tx.blockNumber) <= endblock);
    }

    switch (options.sort) {
      case "asc":
        resultCopy.sort(compareTransactions);
        break;
      case "desc":
        resultCopy.sort(compareTransactions).reverse();
        break;
    }

    return {
      message: account.message,
      status: account.status,
      result: resultCopy,
    };
  }

  public async loadBlockchain(): Promise<void> {
    const lastBlock = await this.height();
    if (this.db.lastBlockLoaded < lastBlock) {
      const loadFirstBlock = this.db.lastBlockLoaded === 0 ? 0 : 1;
      for (let height = this.db.lastBlockLoaded + loadFirstBlock; height <= lastBlock; height++) {
        const block = await this.rpcClient.getBlockByNumber(height);
        for (const tx of block.transactions) {
          const txStatus = await this.rpcClient.getTransactionStatus(tx.hash);
          const isError = getErrorFlag(txStatus.status);
          const confirmations = lastBlock - Number(tx.blockNumber) + 1;

          const from = tx.from;
          if (typeof from !== "string") {
            throw new Error("Found 'from' which is not a string");
          }
          const to = tx.to;
          if (!isStringOrNull(to)) {
            throw new Error("Found 'to' which is not a string nul null");
          }

          if (to === null) {
            console.log(`Skipping contract creation transaction ${tx.hash}`);
            continue;
          }

          const txDetails: TxDetails = {
            hash: tx.hash,
            blockNumber: decodeHexQuantityString(tx.blockNumber),
            nonce: decodeHexQuantityString(tx.nonce),
            gas: decodeHexQuantityString(tx.gas),
            gasPrice: decodeHexQuantityString(tx.gasPrice),
            gasUsed: decodeHexQuantityString(txStatus.gasUsed),
            value: decodeHexQuantityString(tx.value),
            from: from,
            to: to,
            input: tx.input,
            txreceipt_status: txStatus.status,
            isError: isError,
            confirmations: `${confirmations}`,
          };

          if (!this.db.accounts.has(tx.from)) {
            // tslint:disable-next-line:no-object-mutation
            this.db.accounts.set(tx.from, {
              status: "empty",
              message: "empty msg",
              result: new Array<TxDetails>(),
            });
          }
          this.db.accounts.get(tx.from)!.result.push(txDetails);

          if (!this.db.accounts.has(tx.to)) {
            // tslint:disable-next-line:no-object-mutation
            this.db.accounts.set(tx.to, {
              status: "empty",
              message: "empty msg",
              result: new Array<TxDetails>(),
            });
          }
          this.db.accounts.get(tx.to)!.result.push(txDetails);
        }
        console.log(`Done processing block of height ${height}`);
      }
      this.db.lastBlockLoaded = lastBlock;
    } else if (lastBlock < this.db.lastBlockLoaded) {
      this.db.clear();
      await this.loadBlockchain();
    }
  }
}
