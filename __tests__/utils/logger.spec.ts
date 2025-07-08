import { describe, expect, it, vi } from "vitest";
import { logger } from "../../src/utils";

describe("logger", () => {
  it("debug", () => {
    console.debug = vi.fn();
    logger.debug("This is a debug message", { key: "value" });

    expect(console.debug).not.toHaveBeenCalled();
  });

  it("info", () => {
    console.info = vi.fn();
    logger.info("This is a info message", { key: "value" });

    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining("INFO"),
      { key: "value" }
    );
  });

  it("warn", () => {
    console.warn = vi.fn();
    logger.warn("This is a warn message", { key: "value" });

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("WARN"),
      { key: "value" }
    );
  });

  it("error", () => {
    console.error = vi.fn();
    logger.error("This is a error message", { key: "value" });

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("ERROR"),
      { key: "value" }
    );
  });
});
