// Route-handler plumbing: auth guard + same-origin guard + JSON envelope +
// centralized error handling. Wrap every handler with `route(...)` so each
// individual route stays a few lines. Standard envelope: { success, data|error }.
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "./auth";
import { isSameOrigin } from "./origin";
import type { CurrentUser } from "./types";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function fail(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

type Ctx = { user: CurrentUser; params: Record<string, string> };
type Handler = (req: Request, ctx: Ctx) => Promise<Response> | Response;

/**
 * Wrap a route handler with auth + origin + error handling.
 * GET is read-only (skips the origin check); everything else is a mutation.
 *
 * The second (context) arg is typed loosely on purpose: Next generates a
 * per-route RouteContext type ({ params: Promise<{ id }> } for [id] routes,
 * none for static ones), which no single generic signature satisfies. We
 * accept it loosely here and normalize `params` ourselves.
 */
export function route(handler: Handler, opts: { admin?: boolean } = {}) {
  // ponytail: `any` only at the framework boundary — Next's generated RouteContext
  // type differs per route, so a single typed signature can't satisfy all of them.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (req: Request, ctx: any): Promise<Response> => {
    try {
      if (req.method !== "GET" && !isSameOrigin(req)) {
        return fail("Invalid origin", 403);
      }
      const user = await getCurrentUser();
      if (!user) return fail("Unauthorized", 401);
      if (opts.admin && user.role !== "admin") return fail("Forbidden", 403);
      const params = ctx?.params ? await ctx.params : {};
      return await handler(req, { user, params });
    } catch (err) {
      if (err instanceof ApiError) return fail(err.message, err.status);
      if (err instanceof z.ZodError) {
        return fail(err.issues[0]?.message ?? "Invalid input", 400);
      }
      console.error(`${req.method} ${req.url} failed:`, err);
      return fail("Something went wrong", 500);
    }
  };
}

/**
 * Parse + validate a JSON request body against a Zod schema. Returns the schema
 * OUTPUT type (so `.default()`/`.coerce` fields are non-optional, as parsed).
 */
export async function body<S extends z.ZodTypeAny>(req: Request, schema: S): Promise<z.output<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError("Invalid request body", 400);
  }
  return schema.parse(raw);
}
