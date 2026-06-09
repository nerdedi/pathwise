import { getTripPlan } from "@/lib/transport-nsw";
import { logError } from "@/lib/logger";
import { format } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const RequestSchema = z.object({
  from: z.string().min(1, "Origin is required"),
  to: z.string().min(1, "Destination is required"),
  date: z.string().optional(), // YYYY-MM-DD
  time: z.string().optional(), // HH:MM
  arriveBy: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { from, to, date, time, arriveBy } = RequestSchema.parse(body);

    const visitDate = date ?? format(new Date(), "yyyyMMdd");
    const visitTime = (time ?? "10:00").replace(":", "");

    const plan = await getTripPlan({
      originName: from,
      destinationAddress: to,
      date: visitDate.replace(/-/g, ""),
      time: visitTime,
      arriveBy,
    });

    if (!plan) {
      return NextResponse.json(
        {
          error:
            "Transport NSW API is not configured or returned no results. Please add your TRANSPORT_NSW_API_KEY.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ plan });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    logError("/api/transport", err);
    return NextResponse.json(
      { error: "Failed to fetch transport information." },
      { status: 500 }
    );
  }
}
