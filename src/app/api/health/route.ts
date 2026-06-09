import { getRuntimeConfigIssues } from "@/lib/runtime-config";
import { NextResponse } from "next/server";

export async function GET() {
  const issues = getRuntimeConfigIssues();
  const hasErrors = issues.some((issue) => issue.severity === "error");

  return NextResponse.json(
    {
      ok: !hasErrors,
      issues,
    },
    {
      status: hasErrors ? 503 : 200,
    }
  );
}
