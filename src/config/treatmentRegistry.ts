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

/* -------------------------------------------------------------------------
   Acuity intake fields per treatment (used by Sofia's in-chat booking form).
   Field IDs come from the Acuity API (acuity-forms) for each appointment type.
   Do NOT reuse these for the /book pages - those keep their own flow.
---------------------------------------------------------------------------*/
export type IntakeField = {
  acuityFieldId: number;
  label: string;
  type: "checkboxes" | "radio" | "select" | "text" | "textarea" | "yesno";
  options?: string[];
  required: boolean;
  helpText?: string;
};

const CONCERNS_FIELD: IntakeField = {
  acuityFieldId: 15022710,
  label: "Please tick your concerns",
  type: "checkboxes",
  options: [
    "Sagging Neck",
    "Sagging Cheeks",
    "Fine Lines",
    "Wrinkles",
    "Acne",
    "Pigmentation",
    "Sun Damage",
    "Dark Circles",
    "Rosacea",
    "Big Pores",
    "Skin Texture",
    "No Concerns",
  ],
  required: true,
};

const AGE_FIELD: IntakeField = {
  acuityFieldId: 15022734,
  label: "Please specify your age range",
  type: "radio",
  options: ["Below 20", "21-34", "35-49", "50-65", "66+"],
  required: true,
};

const SMS_CONSENT_FIELD: IntakeField = {
  acuityFieldId: 13364829,
  label: "I agree to receive SMS + email appointment reminders",
  type: "yesno",
  required: true,
};

function policyField(acuityFieldId: number): IntakeField {
  return {
    acuityFieldId,
    label: "I agree to the promotional cancellation policy",
    type: "yesno",
    required: true,
    helpText:
      "Promotional bookings need 24 hours notice to cancel or reschedule.",
  };
}

export const TREATMENT_INTAKE_FIELDS: Record<string, IntakeField[]> = {
  facelift: [CONCERNS_FIELD, AGE_FIELD, policyField(15671088), SMS_CONSENT_FIELD],
  led: [CONCERNS_FIELD, AGE_FIELD, policyField(15671088), SMS_CONSENT_FIELD],
  "led-cryo": [CONCERNS_FIELD, AGE_FIELD, policyField(15671088), SMS_CONSENT_FIELD],
  "carbon-peeling": [CONCERNS_FIELD, AGE_FIELD, policyField(18308880), SMS_CONSENT_FIELD],
  "body-sculpting": [policyField(15671088), SMS_CONSENT_FIELD],
};

export function getIntakeFields(slug: string | null): IntakeField[] {
  return (slug && TREATMENT_INTAKE_FIELDS[slug]) || TREATMENT_INTAKE_FIELDS.facelift;
}
