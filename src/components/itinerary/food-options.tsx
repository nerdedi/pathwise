import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Cafeteria } from "@/types/venue";

interface FoodOptionsProps {
  cafeterias: Cafeteria[];
}

const PRICE_LABELS: Record<NonNullable<Cafeteria["priceRange"]>, string> = {
  budget: "$ Budget-friendly",
  moderate: "$$ Mid-range",
  expensive: "$$$ Higher-priced",
};

export default function FoodOptions({ cafeterias }: FoodOptionsProps) {
  if (cafeterias.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">🍽️ Food on site</CardTitle>
        <p className="text-xs text-sage-500 mt-1">
          Menus, prices, dietary info, and where to find food if you need a break.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {cafeterias.map((cafeteria) => (
          <div key={`${cafeteria.name}-${cafeteria.location ?? cafeteria.floor ?? "food"}`} className="rounded-xl border border-sage-100 bg-sage-50/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-sage-900">{cafeteria.name}</h3>
                <p className="text-xs text-sage-500 mt-1">
                  {[cafeteria.location, cafeteria.floor, cafeteria.openingHours]
                    .filter(Boolean)
                    .join(" · ") || "Venue food option"}
                </p>
              </div>
              {cafeteria.priceRange && (
                <span className="rounded-full border border-sage-200 bg-white px-2.5 py-1 text-xs text-sage-700">
                  {PRICE_LABELS[cafeteria.priceRange]}
                </span>
              )}
            </div>

            {cafeteria.seatingNotes && (
              <p className="text-sm text-sage-700 mt-3">{cafeteria.seatingNotes}</p>
            )}

            {cafeteria.menu.length > 0 ? (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-sage-500">Menu highlights</p>
                {cafeteria.menu.map((item) => (
                  <div key={`${cafeteria.name}-${item.name}`} className="rounded-lg border border-sage-100 bg-white px-3 py-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-sage-800">{item.name}</p>
                        {item.description && <p className="text-xs text-sage-500 mt-0.5">{item.description}</p>}
                      </div>
                      {item.price && <span className="text-sm font-semibold text-sage-700 whitespace-nowrap">{item.price}</span>}
                    </div>
                    {(item.dietary.length > 0 || (item.allergens?.length ?? 0) > 0) && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {item.dietary.map((dietary) => (
                          <span key={`${item.name}-${dietary}`} className="rounded-full bg-sage-50 px-2 py-0.5 text-[11px] text-sage-700 border border-sage-100">
                            {dietary}
                          </span>
                        ))}
                        {item.allergens?.map((allergen) => (
                          <span key={`${item.name}-${allergen}`} className="rounded-full bg-warm-50 px-2 py-0.5 text-[11px] text-warm-700 border border-warm-100">
                            Contains {allergen}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-sage-600 mt-4">Menu details were not available on the venue site.</p>
            )}

            {typeof cafeteria.canBringOwnFood === "boolean" && (
              <p className="text-xs text-sage-500 mt-3">
                {cafeteria.canBringOwnFood
                  ? "You can usually bring your own food."
                  : "The venue may prefer food purchased on site — check ahead if that matters for you."}
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
