"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { riskScoreLabel } from "@/lib/utils";
import { Shield } from "lucide-react";

interface RiskAssessmentProps {
  score: number;
  summary: string;
  details: Record<string, { score: number; detail: string }>;
  venueRiskFactors?: string[];
  safetyNotes?: string[];
  emergencyExits?: string[];
}

export default function RiskAssessment({
  score,
  summary,
  details,
  venueRiskFactors = [],
  safetyNotes = [],
  emergencyExits = [],
}: RiskAssessmentProps) {
  const { label, color, bg } = riskScoreLabel(score);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="w-4 h-4 text-sage-500" />
          Sensory environment rating
        </CardTitle>
        <p className="text-xs text-sage-500 mt-1">
          How stimulating this venue is overall — not a reason to avoid it, just
          information to help you plan.
        </p>
      </CardHeader>
      <CardContent>
        {/* Overall score */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`text-3xl font-bold w-14 h-14 rounded-2xl flex items-center justify-center ${bg} ${color}`}
          >
            {score}
          </div>
          <div>
            <p className={`font-semibold text-sm ${color}`}>{label}</p>
            <p className="text-xs text-sage-500">out of 10</p>
          </div>
        </div>

        <p className="text-sm text-sage-700 leading-relaxed mb-4">{summary}</p>

        {/* Breakdown */}
        {Object.keys(details).length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-sage-600 uppercase tracking-wide">
              Breakdown
            </p>
            {Object.entries(details).map(([category, { score: catScore, detail }]) => {
              const catRisk = riskScoreLabel(catScore);
              return (
                <div key={category} className="flex items-start gap-3">
                  {/* Score bar */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium text-sage-700 capitalize">
                        {category}
                      </span>
                      <span className={`text-xs font-semibold ${catRisk.color}`}>
                        {catScore}/10
                      </span>
                    </div>
                    <div className="h-1.5 bg-sage-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          catScore <= 3
                            ? "bg-sage-400"
                            : catScore <= 6
                            ? "bg-warm-400"
                            : "bg-red-400"
                        }`}
                        style={{ width: `${catScore * 10}%` }}
                        role="progressbar"
                        aria-valuenow={catScore}
                        aria-valuemax={10}
                      />
                    </div>
                    <p className="text-xs text-sage-500 mt-0.5">{detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {(venueRiskFactors.length > 0 || safetyNotes.length > 0 || emergencyExits.length > 0) && (
          <div className="mt-5 space-y-4 border-t border-sage-100 pt-4">
            <p className="text-xs font-semibold text-sage-600 uppercase tracking-wide">
              Venue-specific planning notes
            </p>

            {venueRiskFactors.length > 0 && (
              <div>
                <p className="text-sm font-medium text-sage-800 mb-2">Possible risk factors</p>
                <ul className="space-y-1.5">
                  {venueRiskFactors.map((factor) => (
                    <li key={factor} className="flex gap-2 text-sm text-sage-700">
                      <span className="text-sage-400 mt-0.5">•</span>
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {safetyNotes.length > 0 && (
              <div>
                <p className="text-sm font-medium text-sage-800 mb-2">Safety notes</p>
                <ul className="space-y-1.5">
                  {safetyNotes.map((note) => (
                    <li key={note} className="flex gap-2 text-sm text-sage-700">
                      <span className="text-sage-400 mt-0.5">•</span>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {emergencyExits.length > 0 && (
              <div>
                <p className="text-sm font-medium text-sage-800 mb-2">Emergency exits</p>
                <div className="flex flex-wrap gap-2">
                  {emergencyExits.map((exit) => (
                    <span
                      key={exit}
                      className="rounded-full border border-sage-200 bg-white px-3 py-1 text-xs text-sage-700"
                    >
                      {exit}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
