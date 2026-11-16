import { describe, expect, test } from "bun:test";

import { organizationRepositoryCreateDenial } from "./organizationRoles";

const claim = (id: string, roles: string[]) => ({ id, roles });

describe("organizationRepositoryCreateDenial", () => {
  test("a non-member is denied as not_member", () => {
    expect(organizationRepositoryCreateDenial([], "idp-1")).toBe("not_member");
    expect(
      organizationRepositoryCreateDenial([claim("idp-2", ["owner"])], "idp-1"),
    ).toBe("not_member");
  });

  test("a plain member, or a member with no roles, lacks the role", () => {
    expect(
      organizationRepositoryCreateDenial([claim("idp-1", ["member"])], "idp-1"),
    ).toBe("insufficient_role");
    expect(
      organizationRepositoryCreateDenial([claim("idp-1", [])], "idp-1"),
    ).toBe("insufficient_role");
  });

  test("owners and admins may create", () => {
    expect(
      organizationRepositoryCreateDenial([claim("idp-1", ["owner"])], "idp-1"),
    ).toBeNull();
    expect(
      organizationRepositoryCreateDenial([claim("idp-1", ["admin"])], "idp-1"),
    ).toBeNull();
    expect(
      organizationRepositoryCreateDenial(
        [claim("idp-1", ["member", "admin"])],
        "idp-1",
      ),
    ).toBeNull();
  });

  test("a role in one organization never carries to another", () => {
    expect(
      organizationRepositoryCreateDenial(
        [claim("idp-2", ["owner"]), claim("idp-1", ["member"])],
        "idp-1",
      ),
    ).toBe("insufficient_role");
  });
});
