import { describe, expect, it } from "vitest";
import { nextOsloDateKeys, toOsloDateKey } from "@/lib/weather/time/oslo-time";

describe("toOsloDateKey", () => {
  it("applies the summer (CEST, UTC+2) offset, pushing past midnight", () => {
    expect(toOsloDateKey(new Date("2026-07-23T22:30:00Z"))).toBe("2026-07-24");
  });

  it("applies the winter (CET, UTC+1) offset, not pushing past midnight", () => {
    expect(toOsloDateKey(new Date("2026-01-23T22:30:00Z"))).toBe("2026-01-23");
  });
});

describe("nextOsloDateKeys", () => {
  it("returns the requested number of consecutive calendar days starting today", () => {
    const keys = nextOsloDateKeys(new Date("2026-07-23T10:00:00Z"), 3);
    expect(keys).toEqual(["2026-07-23", "2026-07-24", "2026-07-25"]);
  });

  it("spans a month boundary correctly", () => {
    const keys = nextOsloDateKeys(new Date("2026-07-30T10:00:00Z"), 3);
    expect(keys).toEqual(["2026-07-30", "2026-07-31", "2026-08-01"]);
  });
});
