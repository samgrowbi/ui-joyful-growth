import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { X, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import specialistAvatar from "@/assets/specialist-avatar.jpg";
import { getTreatmentBySlug, getIntakeFields, type IntakeField } from "@/config/treatmentRegistry";

const SESSION_KEY = "lumiere_chat_session_id";
const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/skin-specialist-chat`;

const QUICK_REPLIES = [
  "Non Surgical Face Lift",
  "Instant Lift & Skin Tightening",
  "LED + Cryo Face & Neck Lift",
  "Carbon Peeling",
  "Body Sculpting",
  "I have a question",
];

const WELCOME_MESSAGE: UIMessage = {
  id: "welcome",
  role: "assistant",
  parts: [
    {
      type: "text",
      text:
        "Hi, I'm Sofia one of the skin specialists at the Garden Retreat clinic. I'm here to help you find the right treatment for your skin and book your spot, right inside this chat.\n\nWhat's bothering you most about your skin lately?",
    },
  ],
};

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

type DbMessage = {
  id: string;
  role: string;
  parts: unknown;
  created_at: string;
};

export default function SkinSpecialistChat() {
  const [open, setOpen] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([
    WELCOME_MESSAGE,
  ]);
  const sessionId = useMemo(() => getOrCreateSessionId(), []);

  // Load conversation history from DB on first mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("chat-history", {
          headers: { "x-session-id": sessionId },
          body: { sessionId },
        });
        if (cancelled) return;
        if (error) {
          setBootstrapped(true);
          return;
        }
        const msgs = (data?.messages ?? []) as DbMessage[];
        if (msgs.length > 0) {
          const ui: UIMessage[] = (msgs as DbMessage[]).map((m) => ({
            id: m.id,
            role: m.role as UIMessage["role"],
            parts: Array.isArray(m.parts)
              ? (m.parts as UIMessage["parts"])
              : ([{ type: "text", text: String(m.parts ?? "") }] as UIMessage["parts"]),
          }));
          setInitialMessages([WELCOME_MESSAGE, ...ui]);
        }
        setBootstrapped(true);
      } catch {
        if (!cancelled) setBootstrapped(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (!bootstrapped) {
    return <FloatingBubble onClick={() => setOpen(true)} hidden />;
  }

  return (
    <>
      {!open && <FloatingBubble onClick={() => setOpen(true)} />}
      {open && (
        <ChatWindow
          key={sessionId}
          sessionId={sessionId}
          initialMessages={initialMessages}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function FloatingBubble({
  onClick,
  hidden,
}: {
  onClick: () => void;
  hidden?: boolean;
}) {
  if (hidden) return null;
  return (
    <button
      onClick={onClick}
      aria-label="Chat with Sofia, our skin specialist"
      className="fixed z-[60] bottom-24 right-5 md:bottom-6 md:right-6 group flex items-center gap-3 rounded-full bg-white border border-blue-200 shadow-2xl transition-all hover:scale-105 hover:shadow-blue-200/60 pl-1.5 pr-4 py-1.5 md:py-2"
    >
      <span className="relative h-12 w-12 md:h-14 md:w-14 shrink-0">
        <img
          src={specialistAvatar}
          alt="Sofia, skin specialist"
          width={112}
          height={112}
          loading="lazy"
          className="h-full w-full rounded-full object-cover ring-2 ring-blue-100" decoding="async" />
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
      </span>
      <span className="hidden md:flex flex-col items-start text-left leading-tight">
        <span className="text-[13px] font-semibold text-gray-900">Chat with Sofia</span>
        <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Online now
        </span>
      </span>
    </button>
  );
}

function ChatWindow({
  sessionId,
  initialMessages,
  onClose,
}: {
  sessionId: string;
  initialMessages: UIMessage[];
  onClose: () => void;
}) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: ENDPOINT,
        headers: {
          "x-session-id": sessionId,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      }),
    [sessionId],
  );

  const { messages, sendMessage, status, error } = useChat({
    id: sessionId,
    messages: initialMessages,
    transport,
  });

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isLoading = status === "submitted" || status === "streaming";

  // Auto-scroll on new content
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, [status]);

  const onSubmit = async (text: string) => {
    const value = text.trim();
    if (!value || isLoading) return;
    setInput("");
    await sendMessage({ text: value });
  };

  const suggested = useMemo(() => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant) return [] as string[];
    const part = [...lastAssistant.parts]
      .reverse()
      .find((p) => p.type === "tool-suggest_quick_replies") as
      | { output?: { replies?: string[] } }
      | undefined;
    return part?.output?.replies ?? [];
  }, [messages]);

  const [chipsDismissed, setChipsDismissed] = useState(false);
  useEffect(() => {
    setChipsDismissed(false);
  }, [messages.length]);

  const activeChips =
    chipsDismissed || isLoading || input.trim()
      ? []
      : suggested.length > 0
        ? suggested
        : messages.length <= 1
          ? QUICK_REPLIES
          : [];
  const showQuickReplies = activeChips.length > 0;

  return (
    <div className="fixed inset-0 md:inset-auto md:bottom-6 md:right-6 z-[70] md:w-[400px] md:h-[640px] md:max-h-[85vh] flex flex-col bg-white md:rounded-3xl shadow-2xl overflow-hidden border border-blue-100">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
        <div className="relative h-11 w-11 shrink-0">
          <img
            src={specialistAvatar}
            alt="Sofia"
            width={88}
            height={88}
            className="h-11 w-11 rounded-full object-cover ring-2 ring-white/30" decoding="async" loading="lazy" />
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-blue-500" />
        </div>
        <div className="flex-1 min-w-0 leading-tight">
          <div className="font-medium text-[15px]">Sofia · Skin Specialist</div>
          <div className="text-[11px] opacity-90 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Online now · Garden Retreat clinic
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close chat"
          className="p-2 rounded-full hover:bg-white/15 transition"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-5 space-y-4 bg-blue-50/40"
      >
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} onSend={onSubmit} />
        ))}
        {isLoading && <TypingIndicator />}
        {error && (
          <div className="text-xs text-red-600 px-3 py-2 bg-red-50 rounded-lg">
            Sorry, something went wrong. Please try again in a moment.
          </div>
        )}

        {showQuickReplies && (
          <div className="flex flex-wrap gap-2 pt-2">
            {activeChips.map((q) => (
              <button
                key={q}
                onClick={() => {
                  setChipsDismissed(true);
                  onSubmit(q);
                }}
                className="text-xs px-3 py-2 rounded-full bg-white border border-blue-200 text-blue-700 hover:bg-blue-100 transition"
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(input);
        }}
        className="border-t border-blue-100 bg-white p-3 flex items-end gap-2"
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit(input);
            }
          }}
          rows={1}
          placeholder="Type your message…"
          disabled={isLoading}
          className="flex-1 resize-none max-h-32 rounded-2xl border border-blue-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="h-10 w-10 shrink-0 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition disabled:opacity-40"
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

function MessageBubble({
  message,
  onSend,
}: {
  message: UIMessage;
  onSend: (text: string) => void | Promise<void>;
}) {
  const isUser = message.role === "user";
  let text = message.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("")
    .trim();
  // Hide raw form submission payloads from the transcript.
  if (isUser && text.startsWith("[BOOKING_FORM_SUBMISSION]")) {
    text = "Sent my details 💕";
  }
  const toolParts = message.parts.filter((p) => p.type?.startsWith("tool-"));

  if (!text && toolParts.length === 0) return null;

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] text-sm leading-relaxed",
          isUser
            ? "bg-blue-500 text-white px-4 py-2.5 rounded-2xl rounded-br-md"
            : "text-gray-800",
        )}
      >
        {!isUser && text && (
          <div className="px-1">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => (
                  <p className="mb-2 last:mb-0">{children}</p>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-blue-700">
                    {children}
                  </strong>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>
                ),
                a: ({ children, href }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline"
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {text}
            </ReactMarkdown>
          </div>
        )}
        {isUser && <span className="whitespace-pre-wrap">{text}</span>}

        {toolParts.map((p, idx) => (
          <ToolPartRender key={idx} part={p} onSend={onSend} />
        ))}
      </div>
    </div>
  );
}

function ToolPartRender({
  part,
  onSend,
}: {
  part: UIMessage["parts"][number];
  onSend: (text: string) => void | Promise<void>;
}) {
  const type = part.type ?? "";

  if (type === "tool-request_booking_form") {
    const state = (part as { state?: string }).state;
    const output = (part as {
      output?: { ready?: boolean; treatmentSlug?: string; datetime?: string };
    }).output;
    if (state === "output-available" && output?.ready && output.treatmentSlug) {
      return (
        <BookingFormCard
          treatmentSlug={output.treatmentSlug}
          datetime={output.datetime ?? ""}
          onSend={onSend}
        />
      );
    }
    return null;
  }

  // Booking success card
  if (type === "tool-book_appointment") {
    const state = (part as { state?: string }).state;
    const output = (part as { output?: BookingOutput }).output;
    if (state === "output-available" && output?.success) {
      const dt = output.datetime ? new Date(output.datetime) : null;
      fireSchedulePixel(output as BookingOutput);
      return (
        <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
            <span className="h-6 w-6 rounded-full bg-emerald-500 text-white flex items-center justify-center">
              ✓
            </span>
            You're booked
          </div>
          <div className="mt-2 text-sm text-gray-700">
            <div className="font-medium">{output.treatmentName}</div>
            {dt && (
              <div className="text-xs text-gray-600 mt-0.5">
                {dt.toLocaleString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  timeZone: "America/New_York",
                })}{" "}
                ET
              </div>
            )}
            <div className="text-[11px] text-gray-500 mt-2">
              A confirmation is on its way to your email.
            </div>
          </div>
        </div>
      );
    }
  }
  return null;
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-white rounded-2xl rounded-bl-md px-4 py-2.5 shadow-sm flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Dot delay="0s" />
          <Dot delay="0.15s" />
          <Dot delay="0.3s" />
        </div>
        <span className="text-[12px] text-blue-600/80">Sofia is typing…</span>
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="h-2 w-2 rounded-full bg-blue-400 animate-bounce"
      style={{ animationDelay: delay }}
    />
  );
}

/* ------------------------------- Booking form ------------------------------ */

type BookingOutput = {
  success?: boolean;
  treatmentName?: string;
  treatmentSlug?: string;
  datetime?: string;
  appointmentId?: string | number;
};

function fireSchedulePixel(output: BookingOutput) {
  if (typeof window === "undefined" || !output?.appointmentId) return;
  const key = `pixel_schedule_sent_${output.appointmentId}`;
  try {
    if (sessionStorage.getItem(key)) return;
    const fbq = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq;
    if (typeof fbq !== "function") return;
    fbq(
      "track",
      "Schedule",
      {
        content_name: output.treatmentName,
        content_category: "Booking",
        appointment_id: String(output.appointmentId),
        source: "sofia_chatbot",
      },
      { eventID: `schedule_${output.appointmentId}` },
    );
    sessionStorage.setItem(key, "1");
  } catch {
    /* no-op */
  }
}

const inputCls =
  "w-full rounded-xl border border-blue-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300";

function BookingFormCard({
  treatmentSlug,
  datetime,
  onSend,
}: {
  treatmentSlug: string;
  datetime: string;
  onSend: (text: string) => void | Promise<void>;
}) {
  const treatment = getTreatmentBySlug(treatmentSlug);
  const fields = getIntakeFields(treatmentSlug);
  const [submitted, setSubmitted] = useState(false);
  const [values, setValues] = useState<Record<string, string | string[]>>({});
  const [contact, setContact] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setField = (id: number, value: string | string[]) =>
    setValues((prev) => ({ ...prev, [String(id)]: value }));

  const toggleCheckbox = (id: number, option: string) => {
    const current = (values[String(id)] as string[]) ?? [];
    setField(
      id,
      current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option],
    );
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!contact.firstName.trim()) next.firstName = "First name is required";
    if (!contact.lastName.trim()) next.lastName = "Last name is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact.email.trim()))
      next.email = "Enter a valid email";
    if (contact.phone.replace(/\D/g, "").length < 10)
      next.phone = "Enter a valid phone number";
    for (const f of fields) {
      if (!f.required) continue;
      const v = values[String(f.acuityFieldId)];
      const empty = Array.isArray(v) ? v.length === 0 : !String(v ?? "").trim();
      if (empty) next[String(f.acuityFieldId)] = `Please complete: ${f.label}`;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (submitted) return;
    if (!validate()) return;
    setSubmitted(true);
    const payload = {
      firstName: contact.firstName.trim(),
      lastName: contact.lastName.trim(),
      email: contact.email.trim(),
      phone: contact.phone.trim(),
      intakeAnswers: values,
      datetime,
      treatmentSlug,
    };
    await onSend(`[BOOKING_FORM_SUBMISSION] ${JSON.stringify(payload)}`);
  };

  const dt = datetime ? new Date(datetime) : null;

  return (
    <div className="mt-3 rounded-2xl border border-blue-200 bg-white p-4 space-y-3">
      <div>
        <div className="text-sm font-semibold text-gray-900">
          {treatment.label ?? "Your appointment"}
        </div>
        {dt && (
          <div className="text-xs text-gray-600 mt-0.5">
            {dt.toLocaleString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
              timeZone: "America/New_York",
            })}{" "}
            ET
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <input
            className={inputCls}
            placeholder="First name"
            value={contact.firstName}
            disabled={submitted}
            onChange={(e) =>
              setContact((c) => ({ ...c, firstName: e.target.value }))
            }
          />
          {errors.firstName && <FieldError text={errors.firstName} />}
        </div>
        <div>
          <input
            className={inputCls}
            placeholder="Last name"
            value={contact.lastName}
            disabled={submitted}
            onChange={(e) =>
              setContact((c) => ({ ...c, lastName: e.target.value }))
            }
          />
          {errors.lastName && <FieldError text={errors.lastName} />}
        </div>
      </div>
      <div>
        <input
          className={inputCls}
          type="email"
          placeholder="Email"
          value={contact.email}
          disabled={submitted}
          onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
        />
        {errors.email && <FieldError text={errors.email} />}
      </div>
      <div>
        <input
          className={inputCls}
          type="tel"
          placeholder="Phone"
          value={contact.phone}
          disabled={submitted}
          onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))}
        />
        {errors.phone && <FieldError text={errors.phone} />}
      </div>

      {fields.map((f) => (
        <IntakeFieldInput
          key={f.acuityFieldId}
          field={f}
          value={values[String(f.acuityFieldId)]}
          disabled={submitted}
          error={errors[String(f.acuityFieldId)]}
          onChange={(v) => setField(f.acuityFieldId, v)}
          onToggle={(opt) => toggleCheckbox(f.acuityFieldId, opt)}
        />
      ))}

      <button
        type="button"
        onClick={submit}
        disabled={submitted}
        className="w-full rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium py-2.5 transition disabled:opacity-50"
      >
        {submitted ? "Sending..." : "Confirm my booking"}
      </button>
    </div>
  );
}

function FieldError({ text }: { text: string }) {
  return <p className="text-[11px] text-red-600 mt-1">{text}</p>;
}

function IntakeFieldInput({
  field,
  value,
  disabled,
  error,
  onChange,
  onToggle,
}: {
  field: IntakeField;
  value: string | string[] | undefined;
  disabled: boolean;
  error?: string;
  onChange: (v: string) => void;
  onToggle: (option: string) => void;
}) {
  const selected = Array.isArray(value) ? value : [];
  const single = typeof value === "string" ? value : "";
  const options =
    field.type === "yesno" ? ["Yes", "No"] : field.options ?? [];

  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1.5">
        {field.label}
        {field.required && <span className="text-blue-600"> *</span>}
      </label>
      {field.helpText && (
        <p className="text-[11px] text-gray-500 mb-1.5">{field.helpText}</p>
      )}

      {field.type === "checkboxes" && (
        <div className="flex flex-wrap gap-1.5">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              disabled={disabled}
              onClick={() => onToggle(opt)}
              className={cn(
                "text-[11px] px-2.5 py-1.5 rounded-full border transition",
                selected.includes(opt)
                  ? "bg-blue-500 border-blue-500 text-white"
                  : "bg-white border-blue-200 text-blue-700 hover:bg-blue-50",
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {(field.type === "radio" || field.type === "yesno") && (
        <div className="flex flex-wrap gap-1.5">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt)}
              className={cn(
                "text-[11px] px-3 py-1.5 rounded-full border transition",
                single === opt
                  ? "bg-blue-500 border-blue-500 text-white"
                  : "bg-white border-blue-200 text-blue-700 hover:bg-blue-50",
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {field.type === "select" && (
        <select
          className={inputCls}
          disabled={disabled}
          value={single}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select...</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )}

      {field.type === "text" && (
        <input
          className={inputCls}
          disabled={disabled}
          value={single}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {field.type === "textarea" && (
        <textarea
          className={cn(inputCls, "resize-none")}
          rows={3}
          disabled={disabled}
          value={single}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {error && <FieldError text={error} />}
    </div>
  );
}
