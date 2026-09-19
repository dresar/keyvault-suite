import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { neon } from "@neondatabase/serverless";
import { verifyPassword } from "better-auth/crypto";

const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const loginFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => loginSchema.parse(d))
  .handler(async ({ data }) => {
    const dbUrl = process.env['DATABASE_URL'];
    if (!dbUrl) {
      throw new Error("DATABASE_URL missing");
    }
    const sql = neon(dbUrl);

    const users = await sql.query(`SELECT id, name, email FROM neon_auth.user WHERE email = $1`, [data.email]);
    if (users.length === 0) {
      throw new Error("Invalid email or password");
    }

    const user = users[0] as { id: string; name: string; email: string };

    const accounts = await sql.query(
      `SELECT password FROM neon_auth.account WHERE "userId" = $1 AND "providerId" = 'credential'`,
      [user.id]
    );

    if (accounts.length === 0 || !(accounts[0] as { password: string }).password) {
      throw new Error("No password credentials set for this account");
    }

    const hash = (accounts[0] as { password: string }).password;
    const isValid = await verifyPassword({ password: data.password, hash });
    if (!isValid) {
      throw new Error("Invalid email or password");
    }

    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await sql.query(`
      INSERT INTO neon_auth.session (id, "userId", token, "expiresAt", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, $3, now(), now())
    `, [user.id, token, expiresAt]);

    return {
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  });
