"use client";

import { Button } from "@/components/ui/button";
import { speakCalmText } from "@/lib/voice";
import type { SensoryProfile } from "@/types/sensory-profile";
import { AlertTriangle, Copy, Phone, Volume2 } from "lucide-react";
import { useMemo, useState } from "react";

interface SupportToolkitProps {
  profile: SensoryProfile;
  showEmergencyContacts?: boolean;
}

export default function SupportToolkit({ profile, showEmergencyContacts = true }: SupportToolkitProps) {
  const [message, setMessage] = useState("");

  const supportText = useMemo(() => {
    const namePrefix = profile.supportCardName ? `${profile.supportCardName}: ` : "";
    return `${namePrefix}${profile.supportCardMessage}`.trim();
  }, [profile.supportCardMessage, profile.supportCardName]);

  const speak = () => {
    if (!supportText) return;
    speakCalmText(supportText, { lang: "en-AU", rate: 0.9, pitch: 0.9 });
  };

  const copyCard = async () => {
    try {
      await navigator.clipboard.writeText(supportText);
      setMessage("Support card copied.");
    } catch {
      setMessage("Could not copy support card.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-lavender-200 bg-lavender-50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-lavender-700 mb-1">
              I need support card
            </p>
            <p className="text-sm text-sage-800 leading-relaxed">
              {supportText || "Add a support message in your profile to show staff or other passengers what helps."}
            </p>
          </div>
          <AlertTriangle className="w-5 h-5 text-lavender-600 shrink-0" />
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={copyCard}>
            <Copy className="w-3.5 h-3.5" />
            Copy card
          </Button>
          {profile.wantsTextToSpeech && (
            <Button type="button" size="sm" variant="calm" className="gap-1.5" onClick={speak}>
              <Volume2 className="w-3.5 h-3.5" />
              Read aloud
            </Button>
          )}
        </div>
        {message && <p className="text-xs text-sage-500 mt-2">{message}</p>}
      </div>

      {profile.groundingTechniques.length > 0 && (
        <div className="rounded-2xl border border-sage-100 bg-white p-4">
          <p className="text-sm font-semibold text-sage-900 mb-2">Grounding techniques</p>
          <ul className="space-y-1.5">
            {profile.groundingTechniques.map((technique) => (
              <li key={technique} className="text-sm text-sage-700 flex items-start gap-2">
                <span className="text-sage-400 mt-0.5">•</span>
                <span>{technique}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showEmergencyContacts && profile.emergencyContacts.length > 0 && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800 mb-2">Emergency contacts</p>
          <div className="space-y-2">
            {profile.emergencyContacts.map((contact) => (
              <a
                key={`${contact.name}-${contact.phone}`}
                href={`tel:${contact.phone}`}
                className="flex items-center justify-between rounded-xl border border-red-100 bg-white px-3 py-2 hover:bg-red-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-sage-900">{contact.name}</p>
                  <p className="text-xs text-sage-500">{contact.relationship ?? "Trusted contact"}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-sm text-red-700">
                  <Phone className="w-3.5 h-3.5" />
                  Call
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
