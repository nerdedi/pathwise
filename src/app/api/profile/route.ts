import { createClient } from "@/lib/supabase/server";
import type { SensoryProfile } from "@/types/sensory-profile";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const ProfileSchema: z.ZodType<SensoryProfile> = z.object({
  id: z.string().optional(),
  userId: z.string().optional(),
  soundSensitivity: z.enum(["low", "medium", "high"]),
  lightSensitivity: z.enum(["low", "medium", "high"]),
  smellSensitivity: z.enum(["low", "medium", "high"]),
  crowdSensitivity: z.enum(["low", "medium", "high"]),
  touchSensitivity: z.enum(["low", "medium", "high"]),
  changeSensitivity: z.enum(["low", "medium", "high"]),
  visitingWith: z.enum(["alone", "support-person", "family", "group"]),
  communicationStyle: z.enum(["minimal-text", "detailed-text", "visual", "mixed"]),
  detailLevel: z.enum(["basic", "detailed", "comprehensive"]),
  needsQuietSpace: z.boolean(),
  needsAccessibleToilet: z.boolean(),
  needsMobilityAccess: z.boolean(),
  needsDietaryInfo: z.boolean(),
  usesMobilityAid: z.boolean(),
  hasMedicalNeeds: z.boolean(),
  copingStrategies: z.array(z.string()),
  exitStrategy: z.string(),
  prefersDyslexicFont: z.boolean(),
  prefersHighContrast: z.boolean(),
  prefersReducedMotion: z.boolean(),
  wantsSocialStory: z.boolean(),
  wantsAffirmations: z.boolean(),
  createdAt: z.string().optional(),
});

const SaveSchema = z.object({
  profile: ProfileSchema,
});

function mapDbToProfile(row: Record<string, unknown>): SensoryProfile {
  return {
    id: String(row.id ?? ""),
    userId: String(row.user_id ?? ""),
    soundSensitivity: row.sound_sensitivity as SensoryProfile["soundSensitivity"],
    lightSensitivity: row.light_sensitivity as SensoryProfile["lightSensitivity"],
    smellSensitivity: row.smell_sensitivity as SensoryProfile["smellSensitivity"],
    crowdSensitivity: row.crowd_sensitivity as SensoryProfile["crowdSensitivity"],
    touchSensitivity: row.touch_sensitivity as SensoryProfile["touchSensitivity"],
    changeSensitivity: row.change_sensitivity as SensoryProfile["changeSensitivity"],
    visitingWith: row.visiting_with as SensoryProfile["visitingWith"],
    communicationStyle: row.communication_style as SensoryProfile["communicationStyle"],
    detailLevel: row.detail_level as SensoryProfile["detailLevel"],
    needsQuietSpace: Boolean(row.needs_quiet_space),
    needsAccessibleToilet: Boolean(row.needs_accessible_toilet),
    needsMobilityAccess: Boolean(row.needs_mobility_access),
    needsDietaryInfo: Boolean(row.needs_dietary_info),
    usesMobilityAid: Boolean(row.uses_mobility_aid),
    hasMedicalNeeds: Boolean(row.has_medical_needs),
    copingStrategies: (row.coping_strategies as string[]) ?? [],
    exitStrategy: (row.exit_strategy as string) ?? "",
    prefersDyslexicFont: Boolean(row.prefers_dyslexic_font),
    prefersHighContrast: Boolean(row.prefers_high_contrast),
    prefersReducedMotion: Boolean(row.prefers_reduced_motion),
    wantsSocialStory: Boolean(row.wants_social_story),
    wantsAffirmations: Boolean(row.wants_affirmations),
    createdAt: (row.created_at as string) ?? undefined,
  };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("sensory_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({ profile: null });
    }

    return NextResponse.json({ profile: mapDbToProfile(data as Record<string, unknown>) });
  } catch (err) {
    console.error("[/api/profile GET]", err);
    return NextResponse.json(
      { error: "Failed to load profile." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { profile } = SaveSchema.parse(body);

    const payload = {
      user_id: user.id,
      sound_sensitivity: profile.soundSensitivity,
      light_sensitivity: profile.lightSensitivity,
      smell_sensitivity: profile.smellSensitivity,
      crowd_sensitivity: profile.crowdSensitivity,
      touch_sensitivity: profile.touchSensitivity,
      change_sensitivity: profile.changeSensitivity,
      visiting_with: profile.visitingWith,
      communication_style: profile.communicationStyle,
      detail_level: profile.detailLevel,
      needs_quiet_space: profile.needsQuietSpace,
      needs_accessible_toilet: profile.needsAccessibleToilet,
      needs_mobility_access: profile.needsMobilityAccess,
      needs_dietary_info: profile.needsDietaryInfo,
      uses_mobility_aid: profile.usesMobilityAid,
      has_medical_needs: profile.hasMedicalNeeds,
      coping_strategies: profile.copingStrategies,
      exit_strategy: profile.exitStrategy,
      prefers_dyslexic_font: profile.prefersDyslexicFont,
      prefers_high_contrast: profile.prefersHighContrast,
      prefers_reduced_motion: profile.prefersReducedMotion,
      wants_social_story: profile.wantsSocialStory,
      wants_affirmations: profile.wantsAffirmations,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("sensory_profiles")
      .upsert(payload, { onConflict: "user_id" });

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0]?.message ?? "Invalid profile payload" },
        { status: 400 }
      );
    }

    console.error("[/api/profile POST]", err);
    return NextResponse.json(
      { error: "Failed to save profile." },
      { status: 500 }
    );
  }
}
