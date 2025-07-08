import { describe, expect, it } from "vitest";
import { getLibraryId } from "../../src/utils";

describe("context7", () => {
  it("getLibraryId", () => {
    expect(getLibraryId("g2")).toBe("/antvis/g2");
  });
});
