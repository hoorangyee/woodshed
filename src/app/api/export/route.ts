import { NextResponse } from "next/server";
import { licksRepo } from "@/lib/db/licks";

export async function GET() {
  const licks = await licksRepo.list({});
  return new NextResponse(JSON.stringify({ version: 1, licks }, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="licks-export.json"',
    },
  });
}
