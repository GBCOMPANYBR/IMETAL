import { prisma } from "@/lib/prisma";
import { makeOptionListRoutes } from "@/lib/option-list";

const routes = makeOptionListRoutes(prisma.cliente, "Cliente", "name");

export const GET = routes.list;
export const POST = routes.create;
