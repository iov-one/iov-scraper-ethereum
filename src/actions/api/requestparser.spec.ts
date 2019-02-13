import { expect } from "chai";
import { RequestParser } from "./requestparser";

describe("RequestParser", () => {
  it("can process valid account address request", () => {
    // only address
    {
      const body = { address: "abc" };
      expect(RequestParser.parseAccountBody(body)).to.eql({
        address: "abc",
        sort: undefined,
        startblock: undefined,
        endblock: undefined,
      });
    }

    // address and sort
    {
      const body = { address: "abc", sort: "asc" };
      expect(RequestParser.parseAccountBody(body)).to.eql({
        address: "abc",
        sort: "asc",
        startblock: undefined,
        endblock: undefined,
      });
    }

    // address and startblock
    {
      const body = { address: "abc", startblock: "1" };
      expect(RequestParser.parseAccountBody(body)).to.eql({
        address: "abc",
        sort: undefined,
        startblock: "1",
        endblock: undefined,
      });
    }

    // address and endblock
    {
      const body = { address: "abc", endblock: "100" };
      expect(RequestParser.parseAccountBody(body)).to.eql({
        address: "abc",
        sort: undefined,
        startblock: undefined,
        endblock: "100",
      });
    }
  });

  it("throws for invalid account requests", () => {
    // address unset
    {
      const body = { sort: "asc" };
      expect(() => RequestParser.parseAccountBody(body)).to.throw(/Property 'address' must be a string/i);
    }

    // address wrong type
    {
      const body = { address: true, sort: "asc" };
      expect(() => RequestParser.parseAccountBody(body)).to.throw(/Property 'address' must be a string/i);
    }

    // address empty
    {
      const body = { address: "", sort: "asc" };
      expect(() => RequestParser.parseAccountBody(body)).to.throw(/Property 'address' must not be empty/i);
    }

    // sort wrong type
    {
      const body = { address: "abc", sort: true };
      expect(() => RequestParser.parseAccountBody(body)).to.throw(/Property 'sort' is not a valid string/i);
    }

    // sort empty
    {
      const body = { address: "abc", sort: "" };
      expect(() => RequestParser.parseAccountBody(body)).to.throw(/Property 'sort' is not a valid string/i);
    }
  });
});
