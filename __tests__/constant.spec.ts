import { describe, expect, it } from "vitest";
import { isValidLibrary, getLibraryConfig, LIBRARY_MAPPING, CONTEXT7_TOKENS } from "../src/constant";

describe("context7", () => {
  it("isValidLibrary", () => {
    expect(isValidLibrary("g2")).toBe(true);
    expect(isValidLibrary("s2")).toBe(true);
    expect(isValidLibrary("f2")).toBe(true);
    expect(isValidLibrary("g6")).toBe(true);
    expect(isValidLibrary("x6")).toBe(true);
    expect(isValidLibrary("l7")).toBe(true);
    expect(isValidLibrary("unknown")).toBe(false);
  });

  it("getLibraryConfig", () => {
    const g2Config = {
      id: "g2",
      name: "G2",
    };
    expect(getLibraryConfig("g2")).toEqual({
      id: "g2",
      name: "G2",
    });
  });

  it("LIBRARY_MAPPING", () => {
    expect(Object.values(LIBRARY_MAPPING).length).toBe(6);
  });

  it("LIBRARY_MAPPING", () => {
    expect(CONTEXT7_TOKENS).toEqual({
      default: 1000,
      max: 20000,
      min: 1000,
    });
  });
});
