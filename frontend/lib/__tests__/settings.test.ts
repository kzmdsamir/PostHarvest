import { beforeEach, describe, expect, it, vi } from "vitest";
import { EMPTY_DEFAULTS, readScrapeDefaults, writeScrapeDefaults, type ScrapeDefaults } from "@/lib/settings";

const KEY = "postharvest-defaults";

beforeEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("readScrapeDefaults / writeScrapeDefaults", () => {
  it("returns empty defaults when nothing is stored", () => {
    expect(readScrapeDefaults()).toEqual(EMPTY_DEFAULTS);
  });

  it("round-trips persisted defaults", () => {
    const defaults: ScrapeDefaults = { maxPosts: "25", postType: "video", scrolls: "10", useBrowser: true };
    writeScrapeDefaults(defaults);
    expect(readScrapeDefaults()).toEqual(defaults);
  });

  it("stores the JSON payload under the postharvest-defaults key", () => {
    writeScrapeDefaults({ maxPosts: "50", postType: "link", scrolls: "", useBrowser: false });
    const raw = window.localStorage.getItem(KEY);
    expect(raw).toBe(JSON.stringify({ maxPosts: "50", postType: "link", scrolls: "", useBrowser: false }));
  });

  it("falls back to empty defaults for corrupt JSON", () => {
    window.localStorage.setItem(KEY, "{ this is not valid json }");
    expect(readScrapeDefaults()).toEqual(EMPTY_DEFAULTS);
  });

  it("ignores invalid post type values from stored JSON", () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ maxPosts: "10", postType: "carousel", scrolls: "20", useBrowser: true })
    );
    const loaded = readScrapeDefaults();
    expect(loaded.postType).toBe("");
    expect(loaded.maxPosts).toBe("10");
    expect(loaded.useBrowser).toBe(true);
  });

  it("preserves valid string fields but drops wrong types", () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ maxPosts: 42, postType: "text", scrolls: null, useBrowser: "yes" })
    );
    const loaded = readScrapeDefaults();
    expect(loaded.maxPosts).toBe("");
    expect(loaded.postType).toBe("text");
    expect(loaded.scrolls).toBe("");
    expect(loaded.useBrowser).toBe(false);
  });

  it("returns a fresh object each call (does not mutate the shared defaults)", () => {
    const first = readScrapeDefaults();
    const second = readScrapeDefaults();
    expect(first).not.toBe(second);
    first.maxPosts = "55";
    expect(readScrapeDefaults().maxPosts).toBe("");
  });

  it("no-ops when localStorage is unavailable", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Quota exceeded");
    });
    expect(() => writeScrapeDefaults(EMPTY_DEFAULTS)).not.toThrow();
  });
});