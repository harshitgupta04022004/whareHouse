import { describe, expect, it } from "vitest";
import {
  isSuperAdminEmail,
  normalizeEmail,
  SUPER_ADMIN_EMAILS,
} from "../../src/lib/super-admin";

describe("super-admin allowlist", () => {
  it("includes exactly the five approved emails", () => {
    expect(SUPER_ADMIN_EMAILS).toHaveLength(5);
    expect(SUPER_ADMIN_EMAILS).toEqual([
      "hg280175@gmail.com",
      "harshitgupta040204@gmail.com",
      "harshitguptafebruary42004@gmail.com",
      "harshitgupta12m22d@gmail.com",
      "harshitguptafourfebruary2004@gmail.com",
    ]);
  });

  it("normalizes email casing and whitespace", () => {
    expect(normalizeEmail("  HG280175@Gmail.COM ")).toBe("hg280175@gmail.com");
  });

  it("allows only allowlisted emails", () => {
    expect(isSuperAdminEmail("hg280175@gmail.com")).toBe(true);
    expect(isSuperAdminEmail("HarshitGuptaFebruary42004@gmail.com")).toBe(true);
    expect(isSuperAdminEmail("outsider@example.com")).toBe(false);
    expect(isSuperAdminEmail("")).toBe(false);
    expect(isSuperAdminEmail(null)).toBe(false);
    expect(isSuperAdminEmail(undefined)).toBe(false);
  });

  it("rejects close lookalikes", () => {
    expect(isSuperAdminEmail("hg280175@gmiail.com")).toBe(false);
    expect(isSuperAdminEmail("harshitguptafebruary42004@gmiail.com")).toBe(false);
  });
});
