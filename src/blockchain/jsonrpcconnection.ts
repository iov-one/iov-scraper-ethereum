import { ReadonlyDate } from "readonly-date";

import { BlockId, TransactionId } from "@iov/bcp";
import { isJsonRpcErrorResponse } from "@iov/jsonrpc";

import { HttpJsonRpcClient } from "./httpjsonrpcclient";
import { decodeHexQuantity, decodeHexQuantityString, encodeQuantity } from "./utils";

export interface Block {
  readonly id: BlockId;
  readonly height: number;
  readonly time: ReadonlyDate;
  readonly transactions: ReadonlyArray<any>;
}

export class JsonRcpConnection {
  public static async establish(baseUrl: string): Promise<JsonRcpConnection> {
    return new JsonRcpConnection(baseUrl);
  }

  private readonly rpcClient: HttpJsonRpcClient;

  constructor(baseUrl: string) {
    this.rpcClient = new HttpJsonRpcClient(baseUrl);
  }

  public async getBlockByNumber(height: number): Promise<Block> {
    const response = await this.rpcClient.run({
      jsonrpc: "2.0",
      method: "eth_getBlockByNumber",
      params: [encodeQuantity(height), true],
      id: 1,
    });
    if (isJsonRpcErrorResponse(response)) {
      throw new Error(JSON.stringify(response.error));
    }

    if (response.result === null) {
      throw new Error(`Header ${height} doesn't exist yet`);
    }

    const blockData = response.result;
    return {
      id: blockData.hash,
      height: decodeHexQuantity(blockData.number),
      time: new ReadonlyDate(decodeHexQuantity(blockData.timestamp) * 1000),
      transactions: blockData.transactions,
    };
  }

  public async getTransactionStatus(id: TransactionId): Promise<any> {
    const response = await this.rpcClient.run({
      jsonrpc: "2.0",
      method: "eth_getTransactionReceipt",
      params: [id],
      id: 2,
    });
    if (isJsonRpcErrorResponse(response)) {
      throw new Error(JSON.stringify(response.error));
    }

    if (response.result === null) {
      throw new Error(`Transaction ${id} doesn't exist`);
    }
    // tslint:disable-next-line:no-object-mutation
    response.result.status = decodeHexQuantityString(response.result.status);
    return response.result;
  }
}
