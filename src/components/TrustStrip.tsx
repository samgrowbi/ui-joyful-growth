import { useTreatment } from "@/context/TreatmentContext";
import { Clock, Sparkles, Zap, CheckCircle2, ShieldCheck } from "lucide-react";
import { useReveal } from "@/hooks/useReveal";

const items = [
  { heading: "Treatment Time", value: (duration: number) => `${duration}`, suffix: "min", Icon: Clock },
  { heading: "Discomfort", value: () => "None", suffix: "", Icon: Sparkles },
  { heading: "Recovery", value: () => "Zero", suffix: "", Icon: Zap },
  { heading: "Results", value: () => "Immediate", suffix: "", Icon: CheckCircle2 },
  { heading: "Safe For", value: () => "All Skin Tones", suffix: "", Icon: ShieldCheck },
];

export function TrustStrip() {
  const treatment = useTreatment();
  const ref = useReveal<HTMLDivElement>();

  return (
    <section className="relative bg-gradient-to-b from-white via-blue-50/30 to-white">
      {/* Decorative top hairline */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-200/70 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-200/70 to-transparent" />

      <div ref={ref} className="container mx-auto px-5 py-6 sm:py-8 lg:py-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 lg:gap-4 reveal">
          {items.map(({ heading, value, suffix, Icon }, i) => (
            <div
              key={heading}
              className={`group relative flex flex-col items-center text-center bg-white rounded-2xl px-3 py-4 lg:px-4 lg:py-5 border border-blue-100/70 shadow-[0_2px_20px_-12px_rgba(59,130,246,0.25)] hover:shadow-[0_10px_40px_-15px_rgba(59,130,246,0.35)] hover:-translate-y-1 transition-all duration-500 ${i === 4 ? "col-span-2 w-[calc(50%-0.375rem)] justify-self-center md:col-span-1 md:w-auto" : ""}`}
              style={{ transitionDelay: `${i * 40}ms` }}
            >
              {/* Top accent bar */}
              <span className="absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-10 rounded-full bg-gradient-to-r from-blue-300 via-blue-500 to-blue-300 opacity-70 group-hover:w-16 group-hover:opacity-100 transition-all duration-500" />

              {/* Icon */}
              <div className="relative mt-1 mb-3">
                <div className="absolute inset-0 rounded-full bg-blue-200/40 blur-xl group-hover:bg-blue-300/50 transition-colors duration-500" />
                <div className="relative flex items-center justify-center w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-gradient-to-br from-white to-blue-50 text-blue-500 ring-1 ring-blue-200/80 shadow-sm group-hover:scale-110 group-hover:rotate-[-4deg] transition-transform duration-500">
                  <Icon className="w-4 h-4 lg:w-5 lg:h-5" strokeWidth={1.5} />
                </div>
              </div>

              {/* Value */}
              <p className="font-serif text-[22px] lg:text-[26px] text-gray-900 font-normal leading-[1.1] tracking-normal whitespace-nowrap">
                {value(treatment.duration)}
                {suffix && (
                  <span className="ml-1 text-sm lg:text-base text-blue-400/80 font-sans font-light tracking-normal align-baseline">
                    {suffix}
                  </span>
                )}
              </p>

              {/* Divider */}
              <span className="block w-6 h-px bg-blue-300/60 my-2" />

              {/* Heading */}
              <p className="text-[10px] lg:text-[10px] text-gray-500 tracking-[0.2em] uppercase font-semibold whitespace-nowrap">
                {heading}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
