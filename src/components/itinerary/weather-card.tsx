"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WeatherForecast } from "@/types/itinerary";
import { Cloud, CloudRain, Droplets, Sun, Thermometer, Umbrella, Wind, Zap } from "lucide-react";

interface WeatherCardProps {
  weather: WeatherForecast;
  packingTips?: string[];
}

function WeatherIcon({ condition }: { condition: string }) {
  const c = condition.toLowerCase();
  if (c.includes("rain") || c.includes("drizzle"))
    return <CloudRain className="w-8 h-8 text-calm-500" />;
  if (c.includes("thunder"))
    return <Zap className="w-8 h-8 text-warm-500" />;
  if (c.includes("cloud") || c.includes("overcast"))
    return <Cloud className="w-8 h-8 text-sage-400" />;
  return <Sun className="w-8 h-8 text-warm-400" />;
}

function uvLabel(uv: number): { label: string; color: string } {
  if (uv <= 2) return { label: "Low", color: "text-sage-600" };
  if (uv <= 5) return { label: "Moderate", color: "text-warm-600" };
  if (uv <= 7) return { label: "High", color: "text-orange-600" };
  return { label: "Very High", color: "text-red-600" };
}

export default function WeatherCard({ weather, packingTips = [] }: WeatherCardProps) {
  const uv = uvLabel(weather.uvIndex);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sun className="w-4 h-4 text-warm-500" />
          Weather on your visit day
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4">
          <WeatherIcon condition={weather.condition} />
          <div>
            <p className="text-2xl font-bold text-sage-900">
              {weather.tempMax}°<span className="text-sage-400 text-lg">/{weather.tempMin}°C</span>
            </p>
            <p className="text-sm text-sage-600">{weather.condition}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="flex items-center gap-1.5 text-xs text-sage-600">
            <Umbrella className="w-3.5 h-3.5" />
            {weather.chanceOfRain}% chance of rain
          </div>
          <div className="flex items-center gap-1.5 text-xs text-sage-600">
            <Wind className="w-3.5 h-3.5" />
            Wind {weather.windSpeed} km/h
          </div>
          <div className="flex items-center gap-1.5 text-xs text-sage-600">
            <Droplets className="w-3.5 h-3.5" />
            Humidity {weather.humidity}%
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <Thermometer className="w-3.5 h-3.5 text-orange-500" />
            <span className={uv.color}>UV {weather.uvIndex} — {uv.label}</span>
          </div>
        </div>

        {packingTips.length > 0 && (
          <div>
            <p className="text-xs font-medium text-sage-700 mb-1.5">What to pack for today&rsquo;s weather:</p>
            <div className="flex flex-wrap gap-1.5">
              {packingTips.map((tip) => (
                <Badge key={tip} variant="outline" className="text-xs">
                  {tip}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
