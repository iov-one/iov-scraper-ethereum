// tslint:disable: no-object-mutation
import { ChainId } from "@iov/bcp";
import { ethereumCodec, EthereumConnection } from "@iov/ethereum";

import { AccountRequestBodyData } from "../actions/api/requestparser";
import { Block, JsonRcpConnection } from "./jsonrpcconnection";
import { decodeHexQuantityString } from "./utils";

function getErrorFlag(txStatus: string): string {
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
  readonly result: ReadonlyArray<TxDetail>;
}

export interface TxDetail {
  readonly hash: string;
  readonly blockNumber: string;
  readonly nonce: string;
  readonly gasUsed: string;
  readonly value: string;
  readonly from: string;
  readonly to: string;
  readonly input: string;
  readonly txreceipt_status: string;
  readonly isError: string;
  readonly confirmations: number;
}

/** This is what needs to be persisted in the long run */
class Database {
  // tslint:disable-next-line: readonly-keyword readonly-array
  public blocks: Block[];
  // tslint:disable-next-line: readonly-keyword
  public lastBlockLoaded: number;
  // tslint:disable-next-line: readonly-keyword
  public accounts: any;

  constructor() {
    this.blocks = [];
    this.lastBlockLoaded = 0;
    this.accounts = {};
  }

  public clear(): void {
    this.blocks = new Array<Block>();
    this.lastBlockLoaded = 0;
    this.accounts = {};
  }
}

export class Scraper {
  public static async establish(baseUrl: string): Promise<Scraper> {
    const connection = await EthereumConnection.establish(baseUrl);
    const handler = await JsonRcpConnection.establish(baseUrl);
    return new Scraper(connection, handler);
  }

  public readonly connection: EthereumConnection;
  private readonly handler: JsonRcpConnection;
  private readonly baseUrl: string;
  private readonly db = new Database();

  constructor(connection: EthereumConnection, handler: JsonRcpConnection) {
    this.connection = connection;
    this.handler = handler;
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

  public getTransactions(address: string): Promise<TxsAccount> {
    return this.db.accounts[address.toLowerCase()].result;
  }

  public getAccounts(): any {
    return this.db.accounts;
  }

  public getAccountTxs(options: AccountRequestBodyData): TxsAccount | undefined {
    const acc = this.db.accounts[options.address.toLowerCase()];
    let account;
    if (acc !== undefined) {
      account = JSON.parse(JSON.stringify(acc));
      if (options.startblock !== undefined) {
        const startblock = Number(options.startblock);
        // tslint:disable-next-line:no-object-mutation
        account.result = account.result.filter((tx: TxDetail) => Number(tx.blockNumber) >= startblock);
      }
      if (options.endblock !== undefined) {
        const endblock = Number(options.endblock);
        // tslint:disable-next-line:no-object-mutation
        account.result = account.result.filter((tx: TxDetail) => Number(tx.blockNumber) <= endblock);
      }
      if (options.sort !== undefined) {
        switch (options.sort) {
          case "asc":
            // tslint:disable-next-line:no-object-mutation
            account.result = account.result.sort((a: TxDetail, b: TxDetail) => Number(a) < Number(b));
            break;
          case "desc":
            // tslint:disable-next-line:no-object-mutation
            account.result = account.result.sort((a: TxDetail, b: TxDetail) => Number(a) < Number(b));
            break;
        }
      }
    }
    return account;
  }

  public getBlocks(): ReadonlyArray<Block> {
    return this.db.blocks;
  }

  public async loadBlockchain(): Promise<void> {
    const lastBlock = await this.height();
    if (this.db.lastBlockLoaded < lastBlock) {
      const loadFirstBlock = this.db.lastBlockLoaded === 0 ? 0 : 1;
      for (let height = this.db.lastBlockLoaded + loadFirstBlock; height <= lastBlock; height++) {
        const block = await this.handler.getBlockByNumber(height);
        this.db.blocks.push(block);
        for (const tx of block.transactions) {
          const txStatus = await this.handler.getTransactionStatus(tx.hash);
          const isError = getErrorFlag(txStatus.status);
          const confirmations = lastBlock - Number(tx.blockNumber);
          const txDetail = {
            hash: tx.hash,
            blockNumber: decodeHexQuantityString(tx.blockNumber),
            nonce: decodeHexQuantityString(tx.nonce),
            gasUsed: decodeHexQuantityString(txStatus.gasUsed),
            value: decodeHexQuantityString(tx.value),
            from: tx.from,
            to: tx.to,
            input: tx.input,
            txreceipt_status: txStatus.status,
            isError: isError,
            confirmations: confirmations,
          };
          if (!this.db.accounts[tx.from]) {
            // tslint:disable-next-line:no-object-mutation
            this.db.accounts[tx.from] = {
              status: "empty",
              message: "empty msg",
              result: new Array<TxsAccount>(),
            };
          }
          this.db.accounts[tx.from].result.push(txDetail);
          if (!this.db.accounts[tx.to]) {
            // tslint:disable-next-line:no-object-mutation
            this.db.accounts[tx.to] = {
              status: "empty",
              message: "empty msg",
              result: new Array<TxsAccount>(),
            };
          }
          this.db.accounts[tx.to].result.push(txDetail);
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
