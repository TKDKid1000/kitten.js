import { describe, expect, it } from "vitest";
import { objEqual } from "./kitten";

describe("object comparison", () => {
  it("is equal", () => {
    const a = {
      name: "joe",
      age: 1,
      list: ["item"],
      object: {
        key: "value",
      },
    };
    const b = {
      name: "joe",
      age: 1,
      list: ["item"],
      object: {
        key: "value",
      },
    };
    expect(objEqual(a, b)).toBe(true);
  });
  it("is not equal", () => {
    const a = {
      name: "joe",
      age: 1,
      list: ["item"],
      object: {
        key: "value",
      },
    };
    const b = {
      name: "joe",
      age: 1,
      list: ["item"],
      object: {
        key: "valu",
      },
    };
    expect(objEqual(a, b)).toBe(false);
  });
});
