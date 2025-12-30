"use client";

import { useMemo, useState, useTransition } from "react";
import {
  CALL_STYLES,
  CALL_TEMPLATES,
  buildTemplatePreview,
  type CallStyle,
} from "@/lib/call-templates";

type CallLogStatus = "processing" | "success" | "error";

interface CallLogEntry {
  id: string;
  createdAt: number;
  status: CallLogStatus;
  title: string;
  detail: string;
  simulated?: boolean;
}

const VOICE_OPTIONS = [
  { id: "Polly.Joanna", label: "Polly Joanna (Female)" },
  { id: "Polly.Matthew", label: "Polly Matthew (Male)" },
  { id: "Polly.Kendra", label: "Polly Kendra (Warm)" },
];

const LANGUAGE_OPTIONS = [
  { id: "en-US", label: "English (United States)" },
  { id: "en-GB", label: "English (United Kingdom)" },
  { id: "es-ES", label: "Spanish (Spain)" },
];

const DEFAULT_VALUES = {
  agentName: "Alex Rivera",
  companyName: "Nova Reach",
  objective: "schedule a follow-up strategy session",
  valueProp: "accelerate pipeline with AI-assisted outreach",
  nextStep: "find 30 minutes this week for a discovery call",
  notes:
    "If now isn't ideal just let me know and I can send the details over email.",
};

export default function Home() {
  const [to, setTo] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [agentName, setAgentName] = useState(DEFAULT_VALUES.agentName);
  const [companyName, setCompanyName] = useState(DEFAULT_VALUES.companyName);
  const [objective, setObjective] = useState(DEFAULT_VALUES.objective);
  const [valueProp, setValueProp] = useState(DEFAULT_VALUES.valueProp);
  const [nextStep, setNextStep] = useState(DEFAULT_VALUES.nextStep);
  const [notes, setNotes] = useState(DEFAULT_VALUES.notes);
  const [voice, setVoice] = useState(VOICE_OPTIONS[0]!.id);
  const [language, setLanguage] = useState(LANGUAGE_OPTIONS[0]!.id);
  const [style, setStyle] = useState<CallStyle>("friendly");
  const [templateId, setTemplateId] = useState(CALL_TEMPLATES[0]!.id);
  const [callLogs, setCallLogs] = useState<CallLogEntry[]>([]);
  const [isPending, startTransition] = useTransition();

  const template = useMemo(
    () => CALL_TEMPLATES.find((item) => item.id === templateId) ?? CALL_TEMPLATES[0]!,
    [templateId],
  );

  const previewSections = useMemo(
    () =>
      buildTemplatePreview(template, style, {
        agentName,
        customerName,
        companyName,
        objective,
        valueProp,
        nextStep,
        notes,
      }).filter((section) => section.text.trim().length > 0),
    [
      agentName,
      companyName,
      customerName,
      notes,
      objective,
      style,
      template,
      valueProp,
      nextStep,
    ],
  );

  const readyForCall =
    to.trim().length > 7 && customerName.trim().length > 1 && !isPending;

  const handlePlaceCall = () => {
    if (!readyForCall) return;

    const entryId = crypto.randomUUID();
    const createdAt = Date.now();
    const templateName = template.label;

    const payload = {
      to,
      templateId,
      style,
      voice,
      language,
      variables: {
        agentName,
        customerName,
        companyName,
        objective,
        valueProp,
        nextStep,
        notes,
      },
    };

    setCallLogs((prev) => [
      {
        id: entryId,
        createdAt,
        status: "processing",
        title: `Dialing ${customerName || to}`,
        detail: `Template • ${templateName} • ${style} tone`,
      },
      ...prev,
    ]);

    startTransition(async () => {
      try {
        const response = await fetch("/api/calls", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const body = await response.json();

        if (!response.ok) {
          throw new Error(
            body?.details || body?.error || "Unknown error creating call",
          );
        }

        setCallLogs((prev) =>
          prev.map((entry) =>
            entry.id === entryId
              ? {
                  ...entry,
                  status: "success",
                  detail: body?.simulated
                    ? "Simulated call queued. Configure Twilio credentials to place live calls."
                    : `Call queued with SID ${body?.sid} • status ${body?.status}`,
                  simulated: body?.simulated,
                }
              : entry,
          ),
        );
      } catch (error) {
        setCallLogs((prev) =>
          prev.map((entry) =>
            entry.id === entryId
              ? {
                  ...entry,
                  status: "error",
                  detail:
                    error instanceof Error
                      ? error.message
                      : "Unexpected error creating call.",
                }
              : entry,
          ),
        );
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 pb-16 pt-12 text-slate-50 sm:px-12">
        <header className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Nova Reach Calling Agent
              </h1>
              <p className="mt-2 max-w-xl text-sm text-slate-200">
                Spin up an outbound call with adaptive scripting, synthesized
                speech, and configurable tone.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-1 text-sm text-emerald-300">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              {"Ready"}
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-slate-300">
            <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1">
              Twilio Voice ready
            </span>
            <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1">
              AI-enhanced scripts
            </span>
            <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1">
              Real-time call sheet
            </span>
          </div>
        </header>

        <main className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">
          <section className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-slate-900/60 p-8">
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium text-white">
                  Call configuration
                </h2>
                <p className="text-sm text-slate-300">
                  Define who you&apos;re calling, the script template, and the
                  tone of voice.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-xs uppercase tracking-wide text-slate-400">
                    Destination Number
                  </span>
                  <input
                    value={to}
                    onChange={(event) => setTo(event.target.value)}
                    placeholder="+1 415 555 0199"
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-white/40 focus:bg-slate-900"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-xs uppercase tracking-wide text-slate-400">
                    Recipient Name
                  </span>
                  <input
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    placeholder="Jamie Rivera"
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-white/40 focus:bg-slate-900"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-xs uppercase tracking-wide text-slate-400">
                    Agent Name
                  </span>
                  <input
                    value={agentName}
                    onChange={(event) => setAgentName(event.target.value)}
                    placeholder="Alex Rivera"
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-white/40 focus:bg-slate-900"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-xs uppercase tracking-wide text-slate-400">
                    Company
                  </span>
                  <input
                    value={companyName}
                    onChange={(event) => setCompanyName(event.target.value)}
                    placeholder="Nova Reach"
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-white/40 focus:bg-slate-900"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-xs uppercase tracking-wide text-slate-400">
                    Objective
                  </span>
                  <input
                    value={objective}
                    onChange={(event) => setObjective(event.target.value)}
                    placeholder="schedule a follow-up strategy session"
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-white/40 focus:bg-slate-900"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-xs uppercase tracking-wide text-slate-400">
                    Value Proposition
                  </span>
                  <input
                    value={valueProp}
                    onChange={(event) => setValueProp(event.target.value)}
                    placeholder="accelerate pipeline with AI-assisted outreach"
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-white/40 focus:bg-slate-900"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-xs uppercase tracking-wide text-slate-400">
                    Next Step
                  </span>
                  <input
                    value={nextStep}
                    onChange={(event) => setNextStep(event.target.value)}
                    placeholder="find 30 minutes this week for a discovery call"
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-white/40 focus:bg-slate-900"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-xs uppercase tracking-wide text-slate-400">
                    Tone & Delivery
                  </span>
                  <div className="flex gap-2">
                    {CALL_STYLES.map((styleOption) => (
                      <button
                        key={styleOption.id}
                        type="button"
                        onClick={() => setStyle(styleOption.id)}
                        className={`flex-1 rounded-lg border px-3 py-2 text-sm transition ${
                          style === styleOption.id
                            ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                            : "border-white/10 bg-white/5 text-slate-200 hover:border-white/40"
                        }`}
                      >
                        <div className="font-medium capitalize">
                          {styleOption.label}
                        </div>
                        <p className="mt-1 text-[10px] leading-tight text-slate-300">
                          {styleOption.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </label>
              </div>

              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-wide text-slate-400">
                  Script Template
                </span>
                <div className="grid gap-3 sm:grid-cols-3">
                  {CALL_TEMPLATES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTemplateId(item.id)}
                      className={`rounded-xl border px-4 py-3 text-left transition ${
                        templateId === item.id
                          ? "border-sky-400 bg-sky-500/10"
                          : "border-white/10 bg-white/5 hover:border-white/40"
                      }`}
                    >
                      <div className="text-sm font-semibold text-white">
                        {item.label}
                      </div>
                      <p className="mt-1 text-xs text-slate-300">
                        {item.description}
                      </p>
                    </button>
                  ))}
                </div>
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-xs uppercase tracking-wide text-slate-400">
                    Voice
                  </span>
                  <select
                    value={voice}
                    onChange={(event) => setVoice(event.target.value)}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-white/40 focus:bg-slate-900"
                  >
                    {VOICE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id} className="text-black">
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-xs uppercase tracking-wide text-slate-400">
                    Language
                  </span>
                  <select
                    value={language}
                    onChange={(event) => setLanguage(event.target.value)}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-white/40 focus:bg-slate-900"
                  >
                    {LANGUAGE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id} className="text-black">
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-wide text-slate-400">
                  Additional Notes (optional)
                </span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Mention promotion, timeline, or handoff details."
                  rows={3}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-white/40 focus:bg-slate-900"
                />
              </label>
            </div>

            <button
              type="button"
              disabled={!readyForCall}
              onClick={handlePlaceCall}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-medium transition ${
                readyForCall
                  ? "border-emerald-400 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30"
                  : "cursor-not-allowed border-white/10 bg-white/5 text-slate-400"
              }`}
            >
              <span>{isPending ? "Queuing call..." : "Launch call"}</span>
            </button>
          </section>

          <aside className="flex flex-col gap-6">
            <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
              <h3 className="text-base font-semibold text-white">Script preview</h3>
              <p className="mt-1 text-xs text-slate-300">
                Live rendering of the synthesized voice script, adapted to your tone
                and variables.
              </p>

              <div className="mt-4 space-y-4">
                {previewSections.map((section) => (
                  <div
                    key={section.id}
                    className="rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-slate-50 shadow-sm"
                  >
                    <p>{section.text}</p>
                    {section.pauseSeconds ? (
                      <p className="mt-2 text-[11px] uppercase tracking-wide text-slate-400">
                        Pause {section.pauseSeconds}s
                      </p>
                    ) : null}
                  </div>
                ))}
                {previewSections.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 bg-white/0 px-4 py-4 text-center text-xs text-slate-300">
                    Provide call details to generate the script.
                  </div>
                ) : null}
              </div>

              <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
                {template.recommendedNextSteps.length > 0 ? (
                  <>
                    <p className="font-semibold uppercase tracking-wide text-amber-100">
                      Suggested follow-ups
                    </p>
                    <ul className="mt-2 space-y-1">
                      {template.recommendedNextSteps.map((step) => (
                        <li key={step}>• {step}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
              <h3 className="text-base font-semibold text-white">
                Activity timeline
              </h3>
              <p className="mt-1 text-xs text-slate-300">
                Track queued calls and simulation results in real time.
              </p>

              <div className="mt-4 space-y-3">
                {callLogs.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 bg-white/0 px-4 py-4 text-center text-xs text-slate-300">
                    No calls yet. Configure details and launch your first call.
                  </div>
                ) : (
                  callLogs.map((entry) => (
                    <article
                      key={entry.id}
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium">{entry.title}</div>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] uppercase tracking-wide ${
                            entry.status === "success"
                              ? "bg-emerald-500/10 text-emerald-200"
                              : entry.status === "error"
                                ? "bg-rose-500/10 text-rose-200"
                                : "bg-sky-500/10 text-sky-200"
                          }`}
                        >
                          {entry.status === "processing"
                            ? "Processing"
                            : entry.status === "success"
                              ? entry.simulated
                                ? "Simulated"
                                : "Queued"
                              : "Error"}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-300">{entry.detail}</p>
                      <p className="mt-2 text-[10px] uppercase tracking-wide text-slate-500">
                        {new Intl.DateTimeFormat("en-US", {
                          hour: "numeric",
                          minute: "numeric",
                          second: "numeric",
                        }).format(new Date(entry.createdAt))}
                      </p>
                    </article>
                  ))
                )}
              </div>
            </section>
          </aside>
        </main>
      </div>
    </div>
  );
}
