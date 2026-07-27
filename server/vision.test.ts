import { describe, expect, it } from "vitest";
import { VisionError, parseVisionJson } from "./vision.ts";

describe("parseVisionJson", () => {
  it("accepts a well-formed response", () => {
    const out = parseVisionJson(
      JSON.stringify({
        values: { hair: "curly", skinType: "oily" },
        confidence: { hair: 0.9, skinType: 0.7 },
      }),
    );
    expect(out.hair).toEqual({
      value: "curly",
      confidence: 0.9,
      source: "cloud",
      basis: expect.any(String),
    });
  });

  it("strips code fences the model sometimes wraps JSON in", () => {
    expect(parseVisionJson('```json\n{"values":{"hair":"wavy"}}\n```').hair?.value).toBe("wavy");
  });

  it("drops hallucinated options outside the enum", () => {
    // These values index straight into Record<Enum, …> lookup tables in the
    // frontend, so an invented option would become an undefined read.
    const out = parseVisionJson(
      JSON.stringify({ values: { hair: "dreadlocks", skinType: "oily" } }),
    );
    expect(out.hair).toBeUndefined();
    expect(out.skinType?.value).toBe("oily");
  });

  it("ignores fields outside the schema", () => {
    // Height and style aren't inferable from a photo, so they must not arrive
    // from the model either.
    const out = parseVisionJson(
      JSON.stringify({ values: { height: "tall", style: "street", hair: "curly" } }),
    );
    expect("height" in out).toBe(false);
    expect("style" in out).toBe(false);
    expect(out.hair?.value).toBe("curly");
  });

  it("defaults confidence when missing or out of range", () => {
    expect(parseVisionJson(JSON.stringify({ values: { hair: "curly" } })).hair?.confidence).toBe(0.6);
    expect(
      parseVisionJson(JSON.stringify({ values: { hair: "curly" }, confidence: { hair: 7 } })).hair
        ?.confidence,
    ).toBe(0.6);
  });

  it("rejects a refusal or any other non-JSON reply", () => {
    expect(() => parseVisionJson("I'm sorry, I can't help with that.")).toThrow(VisionError);
  });

  it("survives an empty or malformed values object", () => {
    expect(parseVisionJson(JSON.stringify({ values: {} }))).toEqual({});
    expect(parseVisionJson(JSON.stringify({}))).toEqual({});
    expect(parseVisionJson(JSON.stringify({ values: { hair: 42 } }))).toEqual({});
  });
});
