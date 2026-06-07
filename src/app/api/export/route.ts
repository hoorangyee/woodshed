import { NextResponse } from "next/server";
import { licksRepo } from "@/lib/db/licks";
import { currentUser } from "@/lib/auth/current-user";

export async function GET() {
  const user = await currentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const licks = await licksRepo.list({ ownerId: user.id });
  return new NextResponse(JSON.stringify({ version: 1, licks }, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="licks-export.json"',
    },
  });
}
