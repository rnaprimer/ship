/**
 * Adds any missing server secrets to .env.local with fresh random values.
 * Never prints the values and never overwrites existing ones (rotating
 * CODE_PEPPER or CODE_ENCRYPTION_KEY would invalidate every unredeemed code).
 *
 *   npm run secrets:generate
 */
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

const file = ".env.local";
const current = existsSync(file) ? readFileSync(file, "utf8") : "";
const has = (name: string) => new RegExp(`^${name}=.+`, "m").test(current);

const wanted: Record<string, () => string> = {
  CODE_PEPPER: () => randomBytes(32).toString("base64"),
  CODE_ENCRYPTION_KEY: () => randomBytes(32).toString("base64"),
  SHIP_INTERNAL_SECRET: () => randomBytes(32).toString("base64"),
};

const added: string[] = [];
for (const [name, make] of Object.entries(wanted)) {
  if (has(name)) continue;
  appendFileSync(file, `${current.endsWith("\n") || current === "" ? "" : "\n"}${name}=${make()}\n`);
  added.push(name);
}
console.log(added.length ? `Added to ${file}: ${added.join(", ")}` : `${file} already has all secrets.`);
