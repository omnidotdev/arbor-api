import { describe, expect, test } from "bun:test";

import {
  checkArborGitHealth,
  createGitServiceClient,
  resolveArborGitEnabled,
} from "./grpcClient";

describe("resolveArborGitEnabled", () => {
  test("is off when the flag is not requested, even if healthy", () => {
    expect(resolveArborGitEnabled(false, true)).toBe(false);
  });

  test("is off when the backend is unhealthy, even if requested", () => {
    expect(resolveArborGitEnabled(true, false)).toBe(false);
  });

  test("is on only when both requested and healthy", () => {
    expect(resolveArborGitEnabled(true, true)).toBe(true);
  });
});

describe("checkArborGitHealth", () => {
  test("reports unhealthy for an unreachable service, so boot degrades gracefully", async () => {
    // nothing is listening on this port; the health check must resolve false
    // rather than hang or throw
    const client = createGitServiceClient("127.0.0.1:1");
    const healthy = await checkArborGitHealth(client, 500);
    expect(healthy).toBe(false);
    client.close();
  });
});
