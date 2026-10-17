import "server-only";
import { getPool } from "@/lib/db";

export type ShopUser = { id: string; email: string; name: string; role: "customer" | "admin"; password_hash: string | null; google_sub: string | null };

export async function findUserByEmail(email: string): Promise<ShopUser | null> {
  const result = await getPool().query(`SELECT id::text,email,name,role,password_hash,google_sub FROM users WHERE email=$1`, [email.toLowerCase()]);
  return result.rows[0] ?? null;
}

export async function findUserByGoogleSub(sub: string): Promise<ShopUser | null> {
  const result = await getPool().query(`SELECT id::text,email,name,role,password_hash,google_sub FROM users WHERE google_sub=$1`, [sub]);
  return result.rows[0] ?? null;
}

export async function createCredentialUser(name: string, email: string, hash: string): Promise<ShopUser> {
  const result = await getPool().query(`INSERT INTO users(name,email,password_hash) VALUES($1,$2,$3)
    RETURNING id::text,email,name,role,password_hash,google_sub`, [name,email.toLowerCase(),hash]);
  return result.rows[0];
}

export async function createGoogleUser(name: string, email: string, sub: string): Promise<ShopUser> {
  const result = await getPool().query(`INSERT INTO users(name,email,google_sub) VALUES($1,$2,$3)
    RETURNING id::text,email,name,role,password_hash,google_sub`, [name,email.toLowerCase(),sub]);
  return result.rows[0];
}
