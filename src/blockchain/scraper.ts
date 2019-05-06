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

let accounts = {};
let blocks = new Array<Block>();
let lastBlockLoaded = 0;

export class Scraper {
  public static async establish(baseUrl: string): Promise<Scraper> {
    const connection = await EthereumConnection.establish(baseUrl);
    const handler = await JsonRcpConnection.establish(baseUrl);
    return new Scraper(connection, handler);
  }

  public readonly connection: EthereumConnection;
  private readonly handler: JsonRcpConnection;
  private readonly baseUrl: string;

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
    return accounts[address.toLowerCase()].result;
  }
  public getAccounts(): any {
    return accounts;
  }
  public getAccountTxs(options: AccountRequestBodyData): TxsAccount | undefined {
    const acc = accounts[options.address.toLowerCase()];
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
    return blocks;
  }
  public async loadBlockchain(): Promise<void> {
    const lastBlock = await this.height();
    if (lastBlockLoaded < lastBlock) {
      const loadFirstBlock = lastBlockLoaded === 0 ? 0 : 1;
      for (let i = lastBlockLoaded + loadFirstBlock; i <= lastBlock; i++) {
        const block = await this.handler.getBlockByNumber(i);
        blocks.push(block);
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
          if (!accounts[tx.from]) {
            // tslint:disable-next-line:no-object-mutation
            accounts[tx.from] = {
              status: "empty",
              message: "empty msg",
              result: new Array<TxsAccount>(),
            };
          }
          accounts[tx.from].result.push(txDetail);
          if (!accounts[tx.to]) {
            // tslint:disable-next-line:no-object-mutation
            accounts[tx.to] = {
              status: "empty",
              message: "empty msg",
              result: new Array<TxsAccount>(),
            };
          }
          accounts[tx.to].result.push(txDetail);
        }
      }
      lastBlockLoaded = lastBlock;
    } else if (lastBlock < lastBlockLoaded) {
      blocks = new Array<Block>();
      lastBlockLoaded = 0;
      accounts = {};
      await this.loadBlockchain();
    }
  }
}
