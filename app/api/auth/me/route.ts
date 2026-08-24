import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/permissions";

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  return NextResponse.json({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    isAdmin: user.isAdmin,
    canEdit: user.canEdit,
    visibleFields: Array.from(user.visibleFields),
  });
}
