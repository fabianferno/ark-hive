// Mock server-only so it doesn't throw in the vitest/jsdom environment.
vi.mock("server-only", () => ({}));

import { beforeEach, describe, expect, it, vi } from "vitest";

// Set env vars before importing the module (cfg() reads lazily so this works).
process.env.NAMESTONE_BASE_URL = "https://ns.test/api";
process.env.NAMESTONE_API_KEY = "testkey";
process.env.ENS_ROOT_DOMAIN = "ark-hive.eth";

import {
  deleteName,
  getNamesByAddress,
  getAllNames,
  getDomain,
  isAvailable,
  searchName,
  setName,
} from "../namestone";

const BASE = "https://ns.test/api";

function makeFetch(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// setName
// ---------------------------------------------------------------------------
describe("setName", () => {
  it("calls POST /set-name with correct URL, headers, and body", async () => {
    const mockFetch = makeFetch({ success: true });
    vi.stubGlobal("fetch", mockFetch);

    await setName({
      name: "alice",
      address: "0xAlice",
      textRecords: { avatar: "https://example.com/avatar.png" },
    });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];

    expect(url).toBe(`${BASE}/set-name`);
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(
      "testkey"
    );
    expect(init.method).toBe("POST");

    const parsed = JSON.parse(init.body as string);
    expect(parsed.domain).toBe("ark-hive.eth");
    expect(parsed.name).toBe("alice");
    expect(parsed.address).toBe("0xAlice");
    expect(parsed.text_records).toEqual({
      avatar: "https://example.com/avatar.png",
    });
  });

  it("throws on non-2xx response", async () => {
    vi.stubGlobal("fetch", makeFetch({ error: "bad" }, 400));
    await expect(
      setName({ name: "alice", address: "0xAlice" })
    ).rejects.toThrow("400");
  });
});

// ---------------------------------------------------------------------------
// deleteName
// ---------------------------------------------------------------------------
describe("deleteName", () => {
  it("calls POST /delete-name with domain and name", async () => {
    const mockFetch = makeFetch({ success: true });
    vi.stubGlobal("fetch", mockFetch);

    await deleteName("bob");

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE}/delete-name`);
    expect(init.method).toBe("POST");
    const parsed = JSON.parse(init.body as string);
    expect(parsed.domain).toBe("ark-hive.eth");
    expect(parsed.name).toBe("bob");
  });

  it("throws on non-2xx response", async () => {
    vi.stubGlobal("fetch", makeFetch({ error: "not found" }, 404));
    await expect(deleteName("nobody")).rejects.toThrow("404");
  });
});

// ---------------------------------------------------------------------------
// getNamesByAddress
// ---------------------------------------------------------------------------
describe("getNamesByAddress", () => {
  it("calls GET /get-names with domain and address query params", async () => {
    const records = [
      {
        name: "alice",
        address: "0xAlice",
        domain: "ark-hive.eth",
        text_records: {},
      },
    ];
    const mockFetch = makeFetch(records);
    vi.stubGlobal("fetch", mockFetch);

    const result = await getNamesByAddress("0xAlice");

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/get-names?");
    expect(url).toContain("domain=ark-hive.eth");
    // address is lowercased before querying (NameStone matches lowercased storage)
    expect(url).toContain("address=0xalice");
    expect((init?.headers as Record<string, string>)?.["Authorization"]).toBe(
      "testkey"
    );
    expect(result).toEqual(records);
  });

  it("throws on non-2xx response", async () => {
    vi.stubGlobal("fetch", makeFetch("error", 500));
    await expect(getNamesByAddress("0xBad")).rejects.toThrow("500");
  });
});

// ---------------------------------------------------------------------------
// getAllNames
// ---------------------------------------------------------------------------
describe("getAllNames", () => {
  it("calls GET /get-names with only domain query param", async () => {
    const records = [
      { name: "carol", address: "0xCarol", domain: "ark-hive.eth" },
    ];
    const mockFetch = makeFetch(records);
    vi.stubGlobal("fetch", mockFetch);

    const result = await getAllNames();

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/get-names?");
    expect(url).toContain("domain=ark-hive.eth");
    expect(url).not.toContain("address=");
    expect(result).toEqual(records);
  });
});

// ---------------------------------------------------------------------------
// searchName
// ---------------------------------------------------------------------------
describe("searchName", () => {
  it("calls GET /search-names with exact_match=1 by default", async () => {
    const mockFetch = makeFetch([]);
    vi.stubGlobal("fetch", mockFetch);

    await searchName("dave");

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/search-names?");
    expect(url).toContain("domain=ark-hive.eth");
    expect(url).toContain("name=dave");
    expect(url).toContain("exact_match=1");
  });

  it("omits exact_match when exact=false", async () => {
    const mockFetch = makeFetch([]);
    vi.stubGlobal("fetch", mockFetch);

    await searchName("da", false);

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).not.toContain("exact_match");
  });
});

// ---------------------------------------------------------------------------
// isAvailable
// ---------------------------------------------------------------------------
describe("isAvailable", () => {
  it("returns false when a record with the matching name exists", async () => {
    const mockFetch = makeFetch([
      { name: "eve", address: "0xEve", domain: "ark-hive.eth" },
    ]);
    vi.stubGlobal("fetch", mockFetch);

    const result = await isAvailable("eve");
    expect(result).toBe(false);
  });

  it("returns true when no matching record exists", async () => {
    const mockFetch = makeFetch([]);
    vi.stubGlobal("fetch", mockFetch);

    const result = await isAvailable("frank");
    expect(result).toBe(true);
  });

  it("returns true when search returns records with different names", async () => {
    const mockFetch = makeFetch([
      { name: "frank2", address: "0xFrank2", domain: "ark-hive.eth" },
    ]);
    vi.stubGlobal("fetch", mockFetch);

    const result = await isAvailable("frank");
    expect(result).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getDomain
// ---------------------------------------------------------------------------
describe("getDomain", () => {
  it("calls GET /get-domain with domain query param and returns result", async () => {
    const domainInfo = {
      address: "0xOwner",
      domain: "ark-hive.eth",
      text_records: {},
      coin_types: {},
      contenthash: "",
    };
    const mockFetch = makeFetch(domainInfo);
    vi.stubGlobal("fetch", mockFetch);

    const result = await getDomain();

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/get-domain?");
    expect(url).toContain("domain=ark-hive.eth");
    expect((init?.headers as Record<string, string>)?.["Authorization"]).toBe(
      "testkey"
    );
    expect(result.address).toBe("0xOwner");
    expect(result.domain).toBe("ark-hive.eth");
  });

  it("throws on non-2xx response", async () => {
    vi.stubGlobal("fetch", makeFetch("error", 503));
    await expect(getDomain()).rejects.toThrow("503");
  });
});
