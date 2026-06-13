import { NextRequest, NextResponse } from "next/server";
import { requestContext, requireUser, validationError } from "@/lib/api-utils";
import { logAuditEvent } from "@/lib/audit";
import { db } from "@/lib/db";

function normalizeSql(sql: string) {
  const normalized = sql.trim().replace(/\/\*[\s\S]*?\*\//g, "").replace(/--.*$/gm, "").trim();
  return normalized.endsWith(";") ? normalized.slice(0, -1).trim() : normalized;
}

function classifySql(sql: string) {
  const normalized = normalizeSql(sql);
  if (!normalized || /;\s*\S/.test(normalized)) return "blocked";
  if (/^\s*select\b/i.test(normalized)) return "select";
  if (/^\s*(insert|update|delete)\b/i.test(normalized) && !/\b(drop|alter|truncate|create|grant|revoke|copy|execute)\b/i.test(normalized)) {
    return "write";
  }
  return "blocked";
}

function serialize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return value.toString();
  if (value && typeof value === "object" && "toString" in value && value.constructor?.name === "Decimal") {
    return value.toString();
  }
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serialize(item)]));
  }
  return value;
}

export async function POST(request: NextRequest) {
  const { error, session } = await requireUser();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const sql = typeof body?.sql === "string" ? body.sql.trim() : "";
  if (!sql) return validationError("SQL query is required.");

  const { ip, userAgent } = await requestContext();
  const queryType = classifySql(sql);
  if (queryType === "blocked") {
    await db.sqlQueryHistory.create({
      data: {
        error: "Only single SELECT, INSERT, UPDATE, and DELETE statements are enabled.",
        ownerId: session!.user.id,
        sqlText: sql,
        status: "BLOCKED",
      },
    });
    await logAuditEvent({
      action: "SQL_QUERY_BLOCKED" as never,
      email: session!.user.email,
      ip,
      metadata: { sql },
      userAgent,
      userId: session!.user.id,
    });
    return NextResponse.json({ error: "Only single SELECT, INSERT, UPDATE, and DELETE statements are enabled." }, { status: 403 });
  }

  const started = Date.now();
  try {
    const executableSql = normalizeSql(sql);
    if (queryType === "write") {
      const affectedRows = await db.$executeRawUnsafe(executableSql);
      const durationMs = Date.now() - started;
      await db.sqlQueryHistory.create({
        data: {
          durationMs,
          ownerId: session!.user.id,
          rowCount: affectedRows,
          sqlText: executableSql,
          status: "SUCCEEDED",
        },
      });
      await logAuditEvent({
        action: "SQL_QUERY_EXECUTED" as never,
        email: session!.user.email,
        ip,
        metadata: { affectedRows, durationMs, queryType },
        userAgent,
        userId: session!.user.id,
      });
      return NextResponse.json({ affectedRows, durationMs, rows: [] });
    }

    const limitedSql = /limit\s+\d+/i.test(executableSql) ? executableSql : `${executableSql} LIMIT 200`;
    const rows = await db.$queryRawUnsafe<Record<string, unknown>[]>(limitedSql);
    const durationMs = Date.now() - started;
    await db.sqlQueryHistory.create({
      data: {
        durationMs,
        ownerId: session!.user.id,
        rowCount: rows.length,
        sqlText: limitedSql,
        status: "SUCCEEDED",
      },
    });
    await logAuditEvent({
      action: "SQL_QUERY_EXECUTED" as never,
      email: session!.user.email,
      ip,
      metadata: { durationMs, rowCount: rows.length },
      userAgent,
      userId: session!.user.id,
    });
    return NextResponse.json({ durationMs, rows: serialize(rows) });
  } catch (queryError) {
    const durationMs = Date.now() - started;
    await db.sqlQueryHistory.create({
      data: {
        durationMs,
        error: queryError instanceof Error ? queryError.message : "Query failed.",
        ownerId: session!.user.id,
        sqlText: sql,
        status: "FAILED",
      },
    });
    return validationError(queryError);
  }
}
