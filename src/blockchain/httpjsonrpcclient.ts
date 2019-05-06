import axios from "axios";

import { JsonRpcRequest, JsonRpcResponse, parseJsonRpcResponse2 } from "@iov/jsonrpc";

export class HttpJsonRpcClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  public async run(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    const result = await axios.post(this.baseUrl, request);
    const responseBody = result.data;
    return parseJsonRpcResponse2(responseBody);
  }
}
