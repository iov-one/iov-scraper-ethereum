import axios from "axios";
import { ReadonlyDate } from "readonly-date";

import { BlockId, TransactionId } from "@iov/bcp";
import { isJsonRpcErrorResponse, JsonRpcRequest, JsonRpcResponse, parseJsonRpcResponse2 } from "@iov/jsonrpc";

import { decodeHexQuantity, decodeHexQuantityString, encodeQuantity } from "./utils";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/** generates a random alphanumeric character  */
function randomChar(): string {
  return alphabet[Math.floor(Math.random() * alphabet.length)];
}

/** Use a random string implementation to avoid leaking requests count via the proxy API */
function randomStringId(): string {
  return Array.from({ length: 12 })
    .map(() => randomChar())
    .join("");
}

export interface Block {
  readonly id: BlockId;
  readonly height: number;
  readonly time: ReadonlyDate;
  readonly transactions: ReadonlyArray<any>;
}

export class JsonRcpClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  public async blockNumber(): Promise<JsonRpcResponse> {
    return this.run({
      jsonrpc: "2.0",
      method: "eth_blockNumber",
      params: [],
      id: randomStringId(),
    });
  }

  public async getTransactionByHash(txhash: string): Promise<JsonRpcResponse> {
    return this.run({
      jsonrpc: "2.0",
      method: "eth_getTransactionByHash",
      params: [txhash],
      id: randomStringId(),
    });
  }

  public async getBlockByNumber(height: number): Promise<Block> {
    const response = await this.run({
      jsonrpc: "2.0",
      method: "eth_getBlockByNumber",
      params: [encodeQuantity(height), true],
      id: randomStringId(),
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
    const response = await this.run({
      jsonrpc: "2.0",
      method: "eth_getTransactionReceipt",
      params: [id],
      id: randomStringId(),
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

  private async run(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    const result = await axios.post(this.baseUrl, request);
    const responseBody = result.data;
    return parseJsonRpcResponse2(responseBody);
  }
}
