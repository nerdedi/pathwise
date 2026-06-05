import { getWeatherForecast } from "@/lib/weather";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const RequestSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  days: z.number().min(1).max(14).optional().default(7),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lat, lng, days } = RequestSchema.parse(body);

    const forecast = await getWeatherForecast(lat, lng, days);
    return NextResponse.json({ forecast });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    console.error("[/api/weather]", err);
    return NextResponse.json(
      { error: "Failed to fetch weather forecast." },
      { status: 500 }
    );
  }
}
