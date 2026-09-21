import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, ArrowRight, Check, CircleCheck, Clock, Sparkles, Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { BRAND_NAME } from "@/config/brand";
import { FACELIFT_TREATMENT } from "@/config/treatments";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

const CONCERNS = [
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
];

const AGE_RANGES = ["Below 20", "21-34", "35-49", "50-65", "66+"];

const ANALYSIS_STEPS = [
  "Reviewing your concerns",
  "Matching to treatment options",
  "Checking appointment availability",
  "Preparing your consultation",
];

const INTRO_STATS = [
  { Icon: Clock, value: `${FACELIFT_TREATMENT.duration} min`, label: "Treatment Time" },
  { Icon: Zap, value: "Zero", label: "Recovery" },
  { Icon: Sparkles, value: "Immediate", label: "Results" },
];

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const normalizeSubscriber = (value: string) => {
  let digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  return digits.slice(0, 10);
};

const formatSubscriber = (digits: string) => {
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
};

const readCookie = (name: string) => {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? match[2] : undefined;
};

type Screen = 0 | 1 | 2 | 3 | 4;

const Quiz = () => {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>(0);
  const [concerns, setConcerns] = useState<string[]>([]);
  const [ageRange, setAgeRange] = useState<string>("");
  const [analysisDone, setAnalysisDone] = useState(0);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    document.title = `${BRAND_NAME} | Free Skin Assessment`;
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [screen]);

  // Screen 3 - analysing checklist
  useEffect(() => {
    if (screen !== 3) return;
    setAnalysisDone(0);
    const timers = ANALYSIS_STEPS.map((_, i) =>
      setTimeout(() => setAnalysisDone(i + 1), 450 * (i + 1)),
    );
    const done = setTimeout(() => setScreen(4), 450 * ANALYSIS_STEPS.length + 500);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(done);
    };
  }, [screen]);

  const toggleConcern = (concern: string) => {
    setConcerns((prev) => {
      if (concern === "No Concerns") return prev.includes(concern) ? [] : ["No Concerns"];
      const withoutNone = prev.filter((c) => c !== "No Concerns");
      return withoutNone.includes(concern)
        ? withoutNone.filter((c) => c !== concern)
        : [...withoutNone, concern];
    });
  };

  const progress = useMemo(() => {
    if (screen === 1) return 50;
    if (screen === 2) return 100;
    return 0;
  }, [screen]);

  const validate = () => {
    const next: Record<string, string | undefined> = {};
    if (!form.firstName.trim()) next.firstName = "Please enter your first name";
    if (!form.lastName.trim()) next.lastName = "Please enter your last name";
    if (!form.email.trim()) next.email = "Please enter your email address";
    else if (!isValidEmail(form.email)) next.email = "Please enter a valid email address";
    if (!form.phone) next.phone = "Please enter your phone number";
    else if (form.phone.startsWith("1")) next.phone = "Phone number cannot start with 1 after the country code";
    else if (form.phone.length < 10) next.phone = "Please enter a valid 10-digit phone number";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    setSubmitError(null);

    const eventId = `quiz_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const phone = `+1${form.phone}`;

    try {
      const { data, error } = await supabase.functions.invoke("quiz-submit", {
        body: {
          concerns,
          ageRange: ageRange || null,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone,
          sourcePage: "/quiz",
          eventId,
          fbp: readCookie("_fbp"),
          fbc: readCookie("_fbc"),
          eventSourceUrl: window.location.href,
          userAgent: navigator.userAgent,
          referrer: document.referrer || undefined,
        },
      });

      if (error || (data as { error?: unknown })?.error) {
        throw error || new Error("submission failed");
      }

      try {
        window.fbq?.("track", "Lead", { content_name: "Skin Assessment Quiz" }, { eventID: eventId });
      } catch {
        /* pixel optional */
      }

      const params = new URLSearchParams({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone,
      });
      navigate(`/book/facelift?${params.toString()}`);
    } catch (err) {
      console.error(err);
      setSubmitError("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  const goBack = () => setScreen((s) => (s === 4 ? 2 : ((s - 1) as Screen)));

  const screenMotion = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
    transition: { duration: 0.3 },
  };

  return (
    <div dir="ltr" className="min-h-screen bg-gradient-to-b from-blue-50/60 via-white to-blue-50/40">
      {/* Progress bar */}
      <div className="sticky top-0 z-20 h-1.5 w-full bg-blue-100/70">
        <motion.div
          className="h-full bg-blue-500"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>

      <div className="container mx-auto px-5 py-10 sm:py-16">
        <div className="mx-auto w-full max-w-3xl">
          {/* Back arrow */}
          {(screen === 1 || screen === 2 || screen === 4) && (
            <button
              onClick={goBack}
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium mb-6 group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
              Back
            </button>
          )}

          <AnimatePresence mode="wait">
            {/* ---------- Screen 0: Intro ---------- */}
            {screen === 0 && (
              <motion.div key="intro" {...screenMotion} className="text-center">
                <p className="text-[11px] sm:text-xs uppercase tracking-[0.28em] text-blue-600 font-semibold">
                  Dermatologist-Developed
                </p>
                <h1 className="mt-5 font-serif text-4xl sm:text-5xl lg:text-6xl text-gray-900 leading-[1.08] tracking-tight">
                  Find your personalized face lift plan in 60 seconds.
                </h1>
                <div className="mt-5 flex items-center justify-center gap-2 text-gray-700">
                  <span className="text-yellow-500 tracking-tight">★★★★★</span>
                  <span className="font-semibold">4.9</span>
                  <span className="text-gray-300">·</span>
                  <span>from 200+ happy clients</span>
                </div>

                <Button
                  size="lg"
                  onClick={() => setScreen(1)}
                  className="mt-8 h-14 px-10 text-base bg-blue-500 hover:bg-blue-600 text-white rounded-xl"
                >
                  Start My Free Assessment <ArrowRight className="ml-2 h-5 w-5" />
                </Button>

                <div className="mt-12 grid grid-cols-3 gap-3 sm:gap-5">
                  {INTRO_STATS.map(({ Icon, value, label }) => (
                    <div
                      key={label}
                      className="flex flex-col items-center bg-white rounded-2xl px-3 py-6 border border-blue-100/70 shadow-[0_2px_20px_-12px_rgba(59,130,246,0.25)]"
                    >
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-white to-blue-50 text-blue-500 ring-1 ring-blue-200/80 mb-4">
                        <Icon className="w-5 h-5" strokeWidth={1.5} />
                      </div>
                      <p className="font-serif text-xl sm:text-2xl text-gray-900 leading-tight">{value}</p>
                      <span className="block w-6 h-px bg-blue-300/60 my-2.5" />
                      <p className="text-[10px] sm:text-[11px] text-gray-500 tracking-[0.22em] uppercase font-semibold text-center">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ---------- Screen 1: Concerns ---------- */}
            {screen === 1 && (
              <motion.div key="concerns" {...screenMotion}>
                <p className="text-xs uppercase tracking-[0.28em] text-blue-600 font-semibold">Your Concerns</p>
                <p className="mt-2 text-sm text-gray-500">Question 1 of 2</p>
                <h1 className="mt-3 font-serif text-3xl sm:text-5xl text-gray-900 leading-[1.1] tracking-tight">
                  What are your concerns?
                </h1>
                <p className="mt-2 text-gray-500">Select all that apply</p>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CONCERNS.map((concern) => {
                    const selected = concerns.includes(concern);
                    return (
                      <button
                        key={concern}
                        type="button"
                        onClick={() => toggleConcern(concern)}
                        aria-pressed={selected}
                        className={cn(
                          "flex items-center justify-between gap-3 w-full text-left rounded-xl border px-5 py-4 transition-all duration-200",
                          selected
                            ? "border-blue-500 bg-blue-50 shadow-[0_4px_20px_-12px_rgba(59,130,246,0.6)]"
                            : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40",
                        )}
                      >
                        <span className={cn("text-base", selected ? "text-blue-700 font-medium" : "text-gray-800")}>
                          {concern}
                        </span>
                        {selected && (
                          <span className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-500 text-white shrink-0">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <Button
                  onClick={() => setScreen(2)}
                  disabled={concerns.length === 0}
                  className="mt-8 w-full h-13 py-6 text-base bg-blue-500 hover:bg-blue-600 text-white rounded-xl"
                >
                  Continue
                </Button>
              </motion.div>
            )}

            {/* ---------- Screen 2: Age range ---------- */}
            {screen === 2 && (
              <motion.div key="age" {...screenMotion}>
                <p className="text-xs uppercase tracking-[0.28em] text-blue-600 font-semibold">About You</p>
                <p className="mt-2 text-sm text-gray-500">Question 2 of 2</p>
                <h1 className="mt-3 font-serif text-3xl sm:text-5xl text-gray-900 leading-[1.1] tracking-tight">
                  What's your age range?
                </h1>

                <div className="mt-8 space-y-3">
                  {AGE_RANGES.map((range) => {
                    const selected = ageRange === range;
                    return (
                      <button
                        key={range}
                        type="button"
                        onClick={() => {
                          setAgeRange(range);
                          setTimeout(() => setScreen(3), 180);
                        }}
                        aria-pressed={selected}
                        className={cn(
                          "flex items-center justify-between gap-3 w-full text-left rounded-xl border px-5 py-4 transition-all duration-200",
                          selected
                            ? "border-blue-500 bg-blue-50 shadow-[0_4px_20px_-12px_rgba(59,130,246,0.6)]"
                            : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40",
                        )}
                      >
                        <span className={cn("text-base", selected ? "text-blue-700 font-medium" : "text-gray-800")}>
                          {range}
                        </span>
                        {selected && (
                          <span className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-500 text-white shrink-0">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ---------- Screen 3: Analyzing ---------- */}
            {screen === 3 && (
              <motion.div key="analyzing" {...screenMotion} className="text-center py-10">
                <CircleCheck className="mx-auto h-16 w-16 text-blue-500" strokeWidth={1.25} />
                <h1 className="mt-6 font-serif text-3xl sm:text-4xl text-gray-900 tracking-tight">
                  Finding your personalized plan...
                </h1>

                <div className="mt-8 mx-auto max-w-md space-y-3 text-left">
                  {ANALYSIS_STEPS.map((step, i) => {
                    const done = i < analysisDone;
                    return (
                      <div
                        key={step}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-300",
                          done ? "border-blue-200 bg-blue-50" : "border-gray-200 bg-white",
                        )}
                      >
                        <span
                          className={cn(
                            "flex items-center justify-center h-6 w-6 rounded-full shrink-0 transition-colors",
                            done ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-300",
                          )}
                        >
                          {done ? <Check className="h-3.5 w-3.5" /> : <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        </span>
                        <span className={cn("text-sm", done ? "text-blue-700 font-medium" : "text-gray-500")}>
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ---------- Screen 4: Contact details ---------- */}
            {screen === 4 && (
              <motion.div key="contact" {...screenMotion}>
                <h1 className="font-serif text-3xl sm:text-4xl text-gray-900 leading-[1.15] tracking-tight">
                  Almost done - where should we send your plan?
                </h1>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quiz-first">First Name *</Label>
                    <Input
                      id="quiz-first"
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      placeholder="Jane"
                    />
                    {errors.firstName && <p className="text-sm text-red-600">{errors.firstName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quiz-last">Last Name *</Label>
                    <Input
                      id="quiz-last"
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      placeholder="Doe"
                    />
                    {errors.lastName && <p className="text-sm text-red-600">{errors.lastName}</p>}
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="quiz-email">Email *</Label>
                    <Input
                      id="quiz-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="jane@example.com"
                    />
                    {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="quiz-phone">Phone *</Label>
                    <div className="flex gap-2">
                      <span className="flex items-center justify-center px-3 rounded-md border border-input bg-gray-50 text-sm text-gray-600 shrink-0">
                        +1
                      </span>
                      <Input
                        id="quiz-phone"
                        inputMode="tel"
                        value={formatSubscriber(form.phone)}
                        onChange={(e) => setForm({ ...form, phone: normalizeSubscriber(e.target.value) })}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    {errors.phone && <p className="text-sm text-red-600">{errors.phone}</p>}
                  </div>
                </div>

                {submitError && <p className="mt-4 text-sm text-red-600">{submitError}</p>}

                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="mt-8 w-full py-6 text-base bg-blue-500 hover:bg-blue-600 text-white rounded-xl"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      Complete My Assessment <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Quiz;
