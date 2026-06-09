import { Card, CardContent } from "@/components/ui/card";

interface SafetySummaryProps {
  riskSummary: string;
  venueRiskFactors: string[];
  emergencyExits: string[];
}

export default function SafetySummary({
  riskSummary,
  venueRiskFactors,
  emergencyExits,
}: SafetySummaryProps) {
  if (!riskSummary && venueRiskFactors.length === 0 && emergencyExits.length === 0) {
    return null;
  }

  return (
    <Card className="border-warm-200 bg-warm-50/60">
      <CardContent className="pt-5">
        <div className="flex items-start gap-3">
          <span className="text-xl">🛡️</span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-sage-900">Safety snapshot</h2>
            {riskSummary && <p className="text-sm text-sage-700 mt-1">{riskSummary}</p>}

            {venueRiskFactors.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-sage-500 mb-1.5">
                  Top things to plan for
                </p>
                <div className="flex flex-wrap gap-2">
                  {venueRiskFactors.slice(0, 3).map((factor) => (
                    <span
                      key={factor}
                      className="rounded-full border border-warm-200 bg-white px-3 py-1 text-xs text-sage-700"
                    >
                      {factor}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {emergencyExits.length > 0 && (
              <p className="text-xs text-sage-600 mt-3">
                <span className="font-semibold">Emergency exits:</span> {emergencyExits.slice(0, 2).join(" · ")}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
