import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy, config } from "./proxy";

describe("admin proxy", () => {
  it("only runs on /admin paths", () => {
    expect(config.matcher).toEqual(["/admin", "/admin/:path*"]);
  });

  it("returns 404 without a Cloudflare Access token, and with a garbage one", async () => {
    const bare = await proxy(new NextRequest("https://admin.peekatribe.online/admin"));
    expect(bare.status).toBe(404);
    const junk = await proxy(
      new NextRequest("https://admin.peekatribe.online/admin/players", { headers: { "cf-access-jwt-assertion": "a.b.c" } }),
    );
    expect(junk.status).toBe(404);
  });
});
