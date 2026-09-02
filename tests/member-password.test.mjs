import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const memberApiSource = await readFile(new URL("../app/lib/member-api.ts", import.meta.url), "utf8");

test("password changes require the current password and stay in the authenticated client", () => {
  assert.match(memberApiSource, /auth\.updateUser\(\{/);
  assert.match(memberApiSource, /password: newPassword/);
  assert.match(memberApiSource, /current_password: currentPassword/);
  assert.doesNotMatch(memberApiSource, /resetPasswordForEmail|SUPABASE_SECRET_KEY|service_role/);
});
