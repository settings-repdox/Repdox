"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  Instagram,
  Heart,
  Sparkles,
} from "lucide-react";
import { getEventImage } from "@/lib/eventImages";

export type EventDraft = {
  id?: string;
  title?: string;
  description?: string;
  date?: string;
  start_at?: string;
  end_at?: string;
  location?: string;
  cover?: string;
  tags?: string[];
  type?: string;
  format?: string | string[];
  registration_start?: string;
  registration_end?: string;
  sections?: Array<{
    id: string;
    type: string;
    title?: string;
    content?: unknown;
  }>;
};

export default function LivePreview({ draft }: { draft: EventDraft }) {
  const [activeTab, setActiveTab] = React.useState<
    "details" | "schedule" | "teams"
  >("details");
  const parseAgenda = (content?: unknown) => {
    if (!content || typeof content !== "string")
      return [] as Array<{
        time?: string;
        title?: string;
        description?: string;
      }>;
    const text = content as string;
    return text.split("\n").map((line) => {
      const parts = line.split("|").map((p) => p.trim());
      return {
        time: parts[0] || "",
        title: parts[1] || "",
        description: parts[2] || "",
      };
    });
  };

  const parseJson = <T,>(c: unknown): T[] => {
    if (!c) return [] as T[];
    try {
      return typeof c === "string" ? JSON.parse(c) : (c as T[]);
    } catch {
      return [] as T[];
    }
  };

  const renderSectionContent = (s: any) => {
    switch (s.type) {
      case "Agenda": {
        const items = parseAgenda(s.content);
        return (
          <ul className="space-y-4">
            {items.map((it, i) => (
              <li
                key={i}
                className="flex gap-4 items-start border-l-2 border-purple-500/20 pl-4 py-2"
              >
                <div className="text-xs font-mono text-purple-600 dark:text-purple-400 w-16 shrink-0">
                  {it.time}
                </div>
                <div>
                  <div className="text-sm font-bold">{it.title}</div>
                  {it.description && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {it.description}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        );
      }
      case "FAQs": {
        const faqsSelection = parseJson<{ question?: string; answer?: string }>(
          s.content,
        );
        return (
          <div className="space-y-3">
            {faqsSelection.map((f, i) => (
              <div key={i} className="bg-muted/30 rounded-lg p-3">
                <div className="text-sm font-bold mb-1">{f.question}</div>
                <div className="text-xs text-muted-foreground">{f.answer}</div>
              </div>
            ))}
          </div>
        );
      }
      case "Committees": {
        const committees = (typeof s.content === "string" ? s.content : "")
          .split("\n")
          .filter(Boolean);
        return (
          <div className="grid gap-3 sm:grid-cols-2">
            {committees.map((c, i) => {
              const parts = c.split("|");
              return (
                <div key={i} className="p-3 rounded-lg border bg-card/50">
                  <div className="font-semibold text-sm">{parts[0]}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {parts[1]}
                  </div>
                </div>
              );
            })}
          </div>
        );
      }
      default:
        return (
          <div className="text-xs text-muted-foreground whitespace-pre-wrap">
            {typeof s.content === "string" ? s.content : "Content added"}
          </div>
        );
    }
  };

  return (
    <div className="bg-background min-h-[600px] font-sans selection:bg-purple-500/30">
      <motion.div layout className="overflow-hidden">
        <section className="relative h-64 overflow-hidden">
          {draft.cover ? (
            <img
              src={
                /^blob:|https?:\/\//i.test(draft.cover)
                  ? draft.cover
                  : getEventImage(draft.cover)
              }
              alt="cover"
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="w-full h-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-neutral-400">
              <Calendar className="w-12 h-12 opacity-20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

          <div className="absolute inset-0 flex items-end p-6">
            <div className="w-full">
              <div className="mb-3 flex flex-wrap gap-2">
                {draft.type &&
                  (Array.isArray(draft.type) ? (
                    draft.type.map((t) => (
                      <span
                        key={t}
                        className="bg-purple-600 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                      >
                        {t}
                      </span>
                    ))
                  ) : (
                    <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                      {draft.type}
                    </span>
                  ))}
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {draft.title || "Untitled Event"}
              </h1>
              <div className="flex items-center gap-2 text-purple-500 font-mono text-xs">
                <Clock className="w-4 h-4" />
                <span>Starts in 00d 00h 00m 00s (Demo)</span>
              </div>
            </div>
          </div>
        </section>

        {/* Content Layout Replicated */}
        <div className="p-6">
          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">
            {/* Main Content Area */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center gap-4 border-b border-border mb-4 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setActiveTab("details")}
                  className={`px-4 py-2 font-medium text-sm whitespace-nowrap transition-all border-b-2 ${activeTab === "details" ? "text-purple-600 border-purple-600" : "text-muted-foreground hover:text-foreground border-transparent"}`}
                >
                  Details
                </button>
                <button
                  onClick={() => setActiveTab("schedule")}
                  className={`px-4 py-2 font-medium text-sm whitespace-nowrap transition-all border-b-2 ${activeTab === "schedule" ? "text-purple-600 border-purple-600" : "text-muted-foreground hover:text-foreground border-transparent"}`}
                >
                  Event Schedule
                </button>
                <button
                  onClick={() => setActiveTab("teams")}
                  className={`px-4 py-2 font-medium text-sm whitespace-nowrap transition-all border-b-2 ${activeTab === "teams" ? "text-purple-600 border-purple-600" : "text-muted-foreground hover:text-foreground border-transparent"}`}
                >
                  Teams
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === "details" && (
                <div className="space-y-6">
                  {/* Description Card */}
                  <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">
                      Overview
                    </h3>
                    <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {draft.description ||
                        "No description yet — use the editor to craft a full description."}
                    </div>

                    {draft.tags && draft.tags.length > 0 && (
                      <div className="mt-6 flex flex-wrap gap-2">
                        {draft.tags.map((t) => (
                          <span
                            key={t}
                            className="text-[10px] px-2 py-1 rounded-md border border-purple-500/20 bg-purple-500/5 text-purple-500 font-medium"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Dynamic Sections (Filtered for Detail tab) */}
                  {draft.sections &&
                    draft.sections
                      .filter((s) => !["Agenda", "Teams"].includes(s.type))
                      .map((s) => (
                        <div
                          key={s.id}
                          className="rounded-xl border border-border bg-card p-6 shadow-sm"
                        >
                          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">
                            {s.title || s.type}
                          </h3>
                          {renderSectionContent(s)}
                        </div>
                      ))}
                </div>
              )}

              {activeTab === "schedule" && (
                <div className="space-y-6">
                  {draft.sections &&
                    draft.sections
                      .filter((s) => s.type === "Agenda")
                      .map((s) => (
                        <div
                          key={s.id}
                          className="rounded-xl border border-border bg-card p-6 shadow-sm"
                        >
                          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">
                            {s.title || s.type}
                          </h3>
                          {renderSectionContent(s)}
                        </div>
                      ))}
                  {(!draft.sections ||
                    !draft.sections.some((s) => s.type === "Agenda")) && (
                    <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground italic">
                      No agenda items added yet.
                    </div>
                  )}
                </div>
              )}

              {activeTab === "teams" && (
                <div className="space-y-6">
                  {draft.sections &&
                    draft.sections
                      .filter((s) => s.type === "Teams")
                      .map((s) => (
                        <div
                          key={s.id}
                          className="rounded-xl border border-border bg-card p-6 shadow-sm"
                        >
                          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">
                            {s.title || s.type}
                          </h3>
                          {renderSectionContent(s)}
                        </div>
                      ))}
                  {(!draft.sections ||
                    !draft.sections.some((s) => s.type === "Teams")) && (
                    <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground italic">
                      No teams information added yet.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar Replicated */}
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">
                  Event Details
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-purple-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold">Date & Time</p>
                      <p className="text-xs text-muted-foreground">
                        {draft.date
                          ? formatDateWithOptions(draft.date, { weekday: true })
                          : "Date not set"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {draft.date
                          ? new Date(draft.date).toLocaleTimeString(undefined, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Time not set"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-purple-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold">Location</p>
                      <p className="text-xs text-muted-foreground">
                        {draft.location || "Location not set"}
                      </p>
                      {draft.format && (
                        <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-500 font-medium border border-purple-500/20">
                          {Array.isArray(draft.format)
                            ? draft.format.join(" / ")
                            : String(draft.format)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
