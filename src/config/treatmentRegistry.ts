import {
  LED_TREATMENT,
  LED_CRYO_TREATMENT,
  BODY_SCULPTING_TREATMENT,
  FACELIFT_TREATMENT,
  CARBON_PEELING_TREATMENT,
  TreatmentConfig,
} from "./treatments";

const treatments: Record<string, TreatmentConfig> = {
  facelift: FACELIFT_TREATMENT,
  led: LED_TREATMENT,
  "led-cryo": LED_CRYO_TREATMENT,
  "body-sculpting": BODY_SCULPTING_TREATMENT,
  "carbon-peeling": CARBON_PEELING_TREATMENT,
};

export function getTreatmentBySlug(slug: string | null): TreatmentConfig {
  return (slug && treatments[slug]) || FACELIFT_TREATMENT;
}
