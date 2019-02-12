import { Address } from "@iov/bcp-types";

import { HttpError } from "./httperror";

export interface AccountRequestBodyData {
  readonly address: Address;
  readonly startblock?: string;
  readonly endblock?: string;
  readonly sort?: string;
}

export class RequestParser {
  public static parseAccountBody(body: any): AccountRequestBodyData {
    const { address, startblock, endblock, sort } = body;

    if (typeof address !== "string") {
      throw new HttpError(400, "Property 'address' must be a string.");
    }

    if (address.length === 0) {
      throw new HttpError(400, "Property 'address' must not be empty.");
    }

    if (startblock && !startblock.match(/^[0-9]+$/)) {
      throw new Error("Property 'startblock' is not a valid string number");
    }

    if (endblock && !endblock.match(/^[0-9]+$/)) {
      throw new Error("Property 'endblock' is not a valid string number");
    }

    if (sort && ["asc", "desc"].indexOf(sort) === -1) {
      throw new Error("Property 'sort' is not a valid");
    }

    return {
      address: address as Address,
      startblock: startblock,
      endblock: endblock,
      sort: sort,
    };
  }
  public static parseInput(input: any): any {
    const obj = [...new URLSearchParams(input.search).entries()].reduce(
      (sum, [key, val]) => Object.create({ [key]: val }, sum),
      {},
    );
    return obj;
  }
}