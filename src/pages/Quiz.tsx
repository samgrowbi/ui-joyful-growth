import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleCheck,
  Sparkles,
  Loader2,
  TrendingDown,
  Frown,
  Minus,
  Waves,
  CircleDot,
  CircleDashed,
  Sun,
  Moon,
  Flame,
  Layers,
  Palette,
  ClipboardList,
  Target,
  CalendarCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { BeforeAfterCard } from "@/components/BeforeAfterCard";
import { defaultResults } from "@/components/Results";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { BRAND_NAME } from "@/config/brand";
import { FACELIFT_TREATMENT } from "@/config/treatments";

// Quiz-exclusive pricing — only shown to people who complete the assessment,
// distinct from the treatment's general list price elsewhere on the site.
const QUIZ_OFFER_PRICE = "69.99";
const QUIZ_REGULAR_PRICE = "249.99";
const QUIZ_SAVINGS = Math.round(parseFloat(QUIZ_REGULAR_PRICE) - parseFloat(QUIZ_OFFER_PRICE));


const CONCERNS: { label: string; Icon: typeof TrendingDown }[] = [
  { label: "Sagging Neck", Icon: TrendingDown },
  { label: "Sagging Cheeks", Icon: Frown },
  { label: "Fine Lines", Icon: Minus },
  { label: "Wrinkles", Icon: Waves },
  { label: "Acne", Icon: CircleDot },
  { label: "Pigmentation", Icon: Palette },
  { label: "Sun Damage", Icon: Sun },
  { label: "Dark Circles", Icon: Moon },
  { label: "Rosacea", Icon: Flame },
  { label: "Big Pores", Icon: CircleDashed },
  { label: "Skin Texture", Icon: Layers },
  { label: "No Concerns", Icon: CircleCheck },
];

const AGE_RANGES = ["Below 20", "21-34", "35-49", "50-65", "66+"];

const ANALYSIS_STEPS = [
  { label: "Reviewing your concerns", Icon: ClipboardList },
  { label: "Matching to treatment options", Icon: Target },
  { label: "Checking appointment availability", Icon: CalendarCheck },
  { label: "Preparing your consultation", Icon: Sparkles },
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
    if (screen === 1) return 25;
    if (screen === 2) return 50;
    if (screen === 3) return 75;
    if (screen === 4) return 100;
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
      if (concerns.length > 0) params.set("concerns", concerns.join(","));
      if (ageRange) params.set("ageRange", ageRange);
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
    <div dir="ltr" className="min-h-screen bg-[#F5F0E8]">
      <div className="container mx-auto px-5 py-10 sm:py-16">
        <div className="mx-auto w-full max-w-3xl">
          {/* Centered brand + progress header (hidden on the intro screen) */}
          {screen !== 0 && (
            <div className="mb-8 text-center">
              <p className="text-sm font-semibold tracking-[0.2em] text-gray-800">
                {BRAND_NAME.toUpperCase()}
              </p>
              <div className="mt-3 h-[2px] w-full bg-[#E4DCCB]">
                <motion.div
                  className="h-full bg-[#C1694F]"
                  initial={false}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
              {(screen === 1 || screen === 2) && (
                <p className="mt-3 text-xs text-gray-400 tracking-wide">Question {screen} of 2</p>
              )}
            </div>
          )}

          {/* Back arrow */}
          {(screen === 1 || screen === 2 || screen === 4) && (
            <button
              onClick={goBack}
              className="inline-flex items-center gap-1.5 text-sm text-[#C1694F] hover:text-[#A85940] font-medium mb-6 group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
              Back
            </button>
          )}

          <AnimatePresence mode="wait">
            {/* ---------- Screen 0: Intro ---------- */}
            {screen === 0 && (
              <motion.div key="intro" {...screenMotion} className="text-center">
                <p className="text-xs sm:text-sm font-bold text-gray-900">
                  No Surgery <span className="text-gray-400 font-normal">·</span> No Pain{" "}
                  <span className="text-gray-400 font-normal">·</span> Zero Downtime
                </p>

                <h1 className="mt-5 font-serif text-4xl sm:text-5xl lg:text-6xl text-gray-900 leading-[1.08] tracking-tight">
                  Look Years <span className="text-blue-500">Younger</span>
                </h1>
                <p className="mt-2 text-sm sm:text-base font-medium text-blue-500">With</p>
                <h2 className="mt-2 font-serif text-3xl sm:text-4xl lg:text-5xl text-gray-900 leading-[1.1] tracking-tight">
                  {FACELIFT_TREATMENT.heroTitle.line1} {FACELIFT_TREATMENT.heroTitle.highlight}
                  <br />
                  {FACELIFT_TREATMENT.heroTitle.line2}
                </h2>

                <p className="mt-4 text-lg sm:text-xl text-gray-500">
                  Find Your Plan <span className="font-bold text-blue-500">in 60 Seconds</span>
                </p>
                <div className="mt-2 flex items-center justify-center gap-2 text-gray-700">
                  <span className="text-yellow-500 tracking-tight">★★★★★</span>
                  <span className="font-semibold">4.9</span>
                  <span className="text-gray-300">·</span>
                  <span>from 200+ happy clients</span>
                </div>

                <div className="mt-6 mx-auto max-w-xs rounded-2xl bg-[#C1694F] px-5 py-3.5 text-center shadow-[0_16px_36px_-16px_rgba(193,105,79,0.55)]">
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="font-serif text-2xl sm:text-3xl text-white leading-none">
                      ${QUIZ_OFFER_PRICE}
                    </span>
                    <span className="text-sm text-white/70 line-through">${QUIZ_REGULAR_PRICE}</span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-white">You Save ${QUIZ_SAVINGS}</p>
                </div>

                <div className="mt-8 max-w-2xl mx-auto">
                  <Carousel
                    opts={{ align: "start", loop: true, dragFree: false, containScroll: "trimSnaps", duration: 40 }}
                    plugins={[Autoplay({ delay: 2500, stopOnInteraction: false, stopOnMouseEnter: true })]}
                    className="w-full"
                  >
                    <CarouselContent className="-ml-3">
                      {defaultResults.map((r) => (
                        <CarouselItem key={r.id} className="basis-[85%] sm:basis-1/2 pl-3">
                          <BeforeAfterCard
                            beforeImg={r.before}
                            afterImg={r.after}
                            label={r.label}
                            name={r.name}
                            age={r.age}
                            compact
                          />
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                  </Carousel>
                </div>

                <Button
                  size="lg"
                  onClick={() => setScreen(1)}
                  className="mt-6 h-14 px-10 text-base bg-[#C1694F] hover:bg-[#A85940] text-white rounded-xl"
                >
                  Start My Free Assessment <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
            )}

            {/* ---------- Screen 1: Concerns ---------- */}
            {screen === 1 && (
              <motion.div key="concerns" {...screenMotion}>
                <p className="text-xs uppercase tracking-[0.28em] text-[#C1694F] font-semibold">Your Concerns</p>
                <h1 className="mt-3 font-serif text-3xl sm:text-5xl text-gray-900 leading-[1.1] tracking-tight">
                  What are your concerns?
                </h1>
                <p className="mt-2 text-gray-500">Select all that apply</p>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CONCERNS.map(({ label, Icon }) => {
                    const selected = concerns.includes(label);
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => toggleConcern(label)}
                        aria-pressed={selected}
                        className={cn(
                          "flex items-center gap-3 w-full text-left rounded-xl border px-4 py-4 transition-all duration-200",
                          selected
                            ? "border-[#C1694F] bg-[#C1694F]/5"
                            : "border-gray-200 bg-white hover:border-[#C1694F]/40 hover:bg-[#C1694F]/5",
                        )}
                      >
                        <span
                          className={cn(
                            "flex items-center justify-center h-9 w-9 rounded-lg shrink-0 transition-colors",
                            selected ? "bg-[#C1694F] text-white" : "bg-[#F5F0E8] text-[#C1694F]",
                          )}
                        >
                          <Icon className="h-4 w-4" strokeWidth={1.75} />
                        </span>
                        <span
                          className={cn(
                            "text-base flex-1",
                            selected ? "text-[#A85940] font-medium" : "text-gray-800",
                          )}
                        >
                          {label}
                        </span>
                        {selected && (
                          <span className="flex items-center justify-center h-6 w-6 rounded-full bg-[#C1694F] text-white shrink-0">
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
                  className="mt-8 w-full h-13 py-6 text-base bg-[#C1694F] hover:bg-[#A85940] text-white rounded-xl"
                >
                  Continue
                </Button>
              </motion.div>
            )}

            {/* ---------- Screen 2: Age range ---------- */}
            {screen === 2 && (
              <motion.div key="age" {...screenMotion}>
                <p className="text-xs uppercase tracking-[0.28em] text-[#C1694F] font-semibold">About You</p>
                <h1 className="mt-3 font-serif text-3xl sm:text-5xl text-gray-900 leading-[1.1] tracking-tight">
                  What's your age range?
                </h1>

                <div className="mt-8 grid grid-cols-3 gap-3">
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
                          "flex flex-col items-center justify-center gap-2 rounded-xl border px-3 py-6 text-center transition-all duration-200",
                          selected
                            ? "border-[#C1694F] bg-[#C1694F]/5"
                            : "border-gray-200 bg-white hover:border-[#C1694F]/40 hover:bg-[#C1694F]/5",
                        )}
                      >
                        <span className={cn("text-base", selected ? "text-[#A85940] font-medium" : "text-gray-800")}>
                          {range}
                        </span>
                        {selected && (
                          <span className="flex items-center justify-center h-5 w-5 rounded-full bg-[#C1694F] text-white">
                            <Check className="h-3 w-3" />
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
                <CircleCheck className="mx-auto h-16 w-16 text-[#C1694F]" strokeWidth={1.25} />
                <h1 className="mt-6 font-serif text-3xl sm:text-4xl text-gray-900 tracking-tight">
                  Finding your personalized plan...
                </h1>
                <p className="mt-2 text-sm font-medium text-[#C1694F]">
                  {Math.round((analysisDone / ANALYSIS_STEPS.length) * 100)}% complete
                </p>

                <div className="mt-8 mx-auto max-w-md space-y-3 text-left">
                  {ANALYSIS_STEPS.map(({ label, Icon }, i) => {
                    const done = i < analysisDone;
                    const active = i === analysisDone;
                    return (
                      <motion.div
                        key={label}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.05 }}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-300",
                          done ? "border-[#C1694F]/30 bg-[#C1694F]/5" : "border-gray-200 bg-white",
                        )}
                      >
                        <span
                          className={cn(
                            "relative flex items-center justify-center h-8 w-8 rounded-full shrink-0 transition-colors",
                            done
                              ? "bg-[#C1694F] text-white"
                              : active
                                ? "bg-[#C1694F]/10 text-[#C1694F]"
                                : "bg-gray-100 text-gray-300",
                          )}
                        >
                          {active && !done && (
                            <span className="absolute inset-0 rounded-full bg-[#C1694F]/40 animate-ping" />
                          )}
                          {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" strokeWidth={1.75} />}
                        </span>
                        <span className={cn("text-sm", done ? "text-[#A85940] font-medium" : "text-gray-500")}>
                          {label}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ---------- Screen 4: Contact details ---------- */}
            {screen === 4 && (
              <motion.div key="contact" {...screenMotion}>
                <p className="text-xs uppercase tracking-[0.28em] text-[#C1694F] font-semibold">Your Dream Result</p>
                <h1 className="mt-3 font-serif text-3xl sm:text-4xl text-gray-900 leading-[1.15] tracking-tight">
                  Almost done - where should we send your plan?
                </h1>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="quiz-first">First Name *</Label>
                    <Input
                      id="quiz-first"
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      placeholder="Jane"
                      className="h-12 rounded-xl bg-white border-gray-200 focus-visible:ring-2 focus-visible:ring-[#C1694F]/40 focus-visible:border-[#C1694F]"
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
                      className="h-12 rounded-xl bg-white border-gray-200 focus-visible:ring-2 focus-visible:ring-[#C1694F]/40 focus-visible:border-[#C1694F]"
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
                      className="h-12 rounded-xl bg-white border-gray-200 focus-visible:ring-2 focus-visible:ring-[#C1694F]/40 focus-visible:border-[#C1694F]"
                    />
                    {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="quiz-phone">Phone *</Label>
                    <div className="flex gap-2">
                      <span className="flex items-center justify-center px-3.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-600 shrink-0">
                        +1
                      </span>
                      <Input
                        id="quiz-phone"
                        inputMode="tel"
                        value={formatSubscriber(form.phone)}
                        onChange={(e) => setForm({ ...form, phone: normalizeSubscriber(e.target.value) })}
                        placeholder="(555) 123-4567"
                        className="h-12 rounded-xl bg-white border-gray-200 focus-visible:ring-2 focus-visible:ring-[#C1694F]/40 focus-visible:border-[#C1694F]"
                      />
                    </div>
                    {errors.phone && <p className="text-sm text-red-600">{errors.phone}</p>}
                  </div>
                </div>

                {submitError && <p className="mt-4 text-sm text-red-600">{submitError}</p>}

                <p className="mt-5 text-center text-sm text-gray-500">
                  Your quiz price of <span className="font-semibold text-[#C1694F]">${QUIZ_OFFER_PRICE}</span>{" "}
                  <span className="line-through">${QUIZ_REGULAR_PRICE}</span> is locked in.
                </p>

                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="mt-3 w-full py-6 text-base bg-[#C1694F] hover:bg-[#A85940] text-white rounded-xl"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      Continue to Pick Your Time <ArrowRight className="ml-2 h-5 w-5" />
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
