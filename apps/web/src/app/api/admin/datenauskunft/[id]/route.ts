import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { buildDataExport } from "@/lib/data-export";

// Lets an admin look at an export before approving it (opens as JSON in the browser).
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id || !(await isAdmin(session.user.id))) {
    return new NextResponse("Nicht erlaubt", { status: 403 });
  }
  const { id } = await params;
  const request = await prisma.dataExportRequest.findUnique({ where: { id }, select: { userId: true } });
  if (!request) return new NextResponse("Nicht gefunden", { status: 404 });
  const { data } = await buildDataExport(request.userId);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
