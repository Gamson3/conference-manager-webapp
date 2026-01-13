import { Role } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { roleFromGroups } from "../src/utils/roleMapper";

describe("roleFromGroups", () => {
  it("returns user when groups is undefined", () => {
    expect(roleFromGroups(undefined)).toBe(Role.user);
  });

  it("returns user when groups is empty array", () => {
    expect(roleFromGroups([])).toBe(Role.user);
  });

  it("returns organizer when groups contains organizer", () => {
    expect(roleFromGroups(["organizer"])).toBe(Role.organizer);
  });

  it("returns admin when groups contains admin", () => {
    expect(roleFromGroups(["admin"])).toBe(Role.admin);
  });

  it("returns admin when groups contains both (precedence)", () => {
    expect(roleFromGroups(["organizer", "admin"])).toBe(Role.admin);
    expect(roleFromGroups(["admin", "organizer"])).toBe(Role.admin);
  });

  it("ignores unknown groups and returns user", () => {
    expect(roleFromGroups(["unknown", "random"])).toBe(Role.user);
  });

  it("returns organizer when mixed with unknown groups", () => {
    expect(roleFromGroups(["unknown", "organizer"])).toBe(Role.organizer);
  });
});
