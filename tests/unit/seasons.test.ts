import { describe, expect, test } from "bun:test";
import { seasonFor } from "@/lib/settings-shared";

describe("seasonal effects", () => {
  test("Halloween week is 25–31 October, Christmas is all of December, nothing otherwise", () => {
    const on = (m: number, d: number) => seasonFor(new Date(2026, m - 1, d));
    expect(on(10, 24)).toBeNull();
    expect(on(10, 25)).toBe("halloween");
    expect(on(10, 31)).toBe("halloween");
    expect(on(11, 1)).toBeNull();
    expect(on(11, 30)).toBeNull();
    expect(on(12, 1)).toBe("christmas");
    expect(on(12, 31)).toBe("christmas");
    expect(on(1, 1)).toBeNull();
    expect(on(7, 15)).toBeNull();
  });
});
