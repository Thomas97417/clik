import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { BarChart3, Check, SlidersHorizontal } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  analyticsConfigured,
  setAnalyticsConsent,
  useAnalyticsConsent,
} from "@/lib/analytics-consent";

export function AnalyticsPreferences({ onSave }: { onSave?: () => void }) {
  const choice = useAnalyticsConsent();
  if (!analyticsConfigured())
    return (
      <p className="analytics-disabled">
        La mesure d’audience est désactivée sur cette version de Clik.
      </p>
    );
  return (
    <div className="analytics-preferences">
      <p className="analytics-status" role="status">
        {choice === "accepted"
          ? "Votre choix : mesure d’audience acceptée."
          : choice === "declined"
            ? "Votre choix : mesure d’audience refusée."
            : "La mesure d’audience attend votre accord."}
      </p>
      <div
        className="analytics-choices"
        role="group"
        aria-label="Choisir la mesure d’audience"
      >
        {(
          [
            ["declined", "Refuser"],
            ["accepted", "Accepter"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={choice === value}
            onClick={() => {
              setAnalyticsConsent(value);
              onSave?.();
            }}
          >
            {choice === value && <Check size={15} aria-hidden="true" />}
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function AnalyticsPreferencesButton() {
  const [open, setOpen] = useState(false);
  if (!analyticsConfigured()) return null;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="analytics-preferences-link">
        <SlidersHorizontal size={14} aria-hidden="true" /> Préférences de
        confidentialité
      </DialogTrigger>
      <DialogContent className="analytics-dialog">
        <span className="analytics-symbol">
          <BarChart3 size={23} aria-hidden="true" />
        </span>
        <DialogTitle>Vos préférences de confidentialité</DialogTitle>
        <DialogDescription>
          Les fonctions essentielles de Clik restent disponibles quel que soit
          votre choix. La mesure d’audience optionnelle avec PostHog nous aide à
          comprendre la fréquentation et la performance du site.
        </DialogDescription>
        <AnalyticsPreferences onSave={() => setOpen(false)} />
        <Link
          className="analytics-policy-link"
          to="/privacy"
          hash="cookies"
          onClick={() => setOpen(false)}
        >
          Lire la politique de confidentialité
        </Link>
      </DialogContent>
    </Dialog>
  );
}

export function AnalyticsConsentBanner() {
  const choice = useAnalyticsConsent();
  if (!analyticsConfigured() || choice !== null) return null;
  return (
    <section
      className="analytics-banner"
      aria-labelledby="analytics-banner-title"
    >
      <span className="analytics-symbol">
        <BarChart3 size={21} aria-hidden="true" />
      </span>
      <div>
        <h2 id="analytics-banner-title">Un atelier qui s’améliore</h2>
        <p>
          Acceptez-vous la mesure d’audience avec PostHog ? Elle nous aide à
          comprendre la fréquentation et à améliorer la performance du site.
          Votre choix ne change pas votre accès à Clik.
        </p>
      </div>
      <AnalyticsPreferences />
      <Link className="analytics-policy-link" to="/privacy" hash="cookies">
        En savoir plus sur vos données
      </Link>
    </section>
  );
}
