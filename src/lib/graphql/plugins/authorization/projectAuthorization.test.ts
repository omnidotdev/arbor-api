import { describe, expect, test } from "bun:test";

import {
  canAdministerProject,
  canCreateProject,
  hasOrgAdminRole,
} from "./projectAuthorization";

const admin = (id: string) => ({ id, roles: ["admin"] });
const owner = (id: string) => ({ id, roles: ["owner"] });
const member = (id: string) => ({ id, roles: ["member"] });

describe("hasOrgAdminRole", () => {
  test("is true when the caller is an admin of the organization", () => {
    expect(hasOrgAdminRole([admin("org-1")], "org-1")).toBe(true);
  });

  test("is true when the caller is an owner of the organization", () => {
    expect(hasOrgAdminRole([owner("org-1")], "org-1")).toBe(true);
  });

  test("is false when the caller is only a member", () => {
    expect(hasOrgAdminRole([member("org-1")], "org-1")).toBe(false);
  });

  test("is false when the caller is not in the organization at all", () => {
    expect(hasOrgAdminRole([admin("org-2")], "org-1")).toBe(false);
  });
});

describe("canAdministerProject", () => {
  const subject = { observerId: "user-1", organizations: [admin("org-1")] };

  test("the personal-project owner can administer it", () => {
    expect(
      canAdministerProject(
        { ownerId: "user-1", organizationIdpId: null },
        subject,
      ),
    ).toBe(true);
  });

  test("a non-owner cannot administer someone else's personal project", () => {
    expect(
      canAdministerProject(
        { ownerId: "user-2", organizationIdpId: null },
        subject,
      ),
    ).toBe(false);
  });

  test("an org admin can administer any project under that org", () => {
    // even one created by a different member (ownerId is user-2, not the caller)
    expect(
      canAdministerProject(
        { ownerId: "user-2", organizationIdpId: "org-1" },
        subject,
      ),
    ).toBe(true);
  });

  test("a non-admin org member cannot administer an org project they do not own", () => {
    expect(
      canAdministerProject(
        { ownerId: "user-2", organizationIdpId: "org-1" },
        { observerId: "user-1", organizations: [member("org-1")] },
      ),
    ).toBe(false);
  });

  test("the owner can still administer their own org project without an admin role", () => {
    expect(
      canAdministerProject(
        { ownerId: "user-1", organizationIdpId: "org-1" },
        { observerId: "user-1", organizations: [member("org-1")] },
      ),
    ).toBe(true);
  });
});

describe("canCreateProject", () => {
  test("a caller may create a personal project owned by themselves", () => {
    expect(
      canCreateProject(
        { ownerId: "user-1", organizationIdpId: null },
        { observerId: "user-1", organizations: [] },
      ),
    ).toBe(true);
  });

  test("a caller may not create a project owned by someone else", () => {
    expect(
      canCreateProject(
        { ownerId: "user-2", organizationIdpId: null },
        { observerId: "user-1", organizations: [] },
      ),
    ).toBe(false);
  });

  test("creating an org project requires an admin role in that org", () => {
    expect(
      canCreateProject(
        { ownerId: "user-1", organizationIdpId: "org-1" },
        { observerId: "user-1", organizations: [admin("org-1")] },
      ),
    ).toBe(true);
  });

  test("a non-admin org member cannot create an org project", () => {
    expect(
      canCreateProject(
        { ownerId: "user-1", organizationIdpId: "org-1" },
        { observerId: "user-1", organizations: [member("org-1")] },
      ),
    ).toBe(false);
  });
});
