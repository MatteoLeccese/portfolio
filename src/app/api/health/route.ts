// src/app/api/health/route.ts
import { connection } from "next/server";

export async function GET () {
  await connection();
  return Response.json({ status: "ok" });
}
