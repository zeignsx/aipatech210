import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/page-hero";
import { MapPin, Clock, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Projects — AIPATECH Energy" },
      { name: "description", content: "Selected oil & gas projects delivered for Shell, ExxonMobil, Chevron, NNPC, Total and Dangote Refinery." },
    ],
  }),
  component: Projects,
});

const PROJECTS = [
  { t: "Pipeline Integrity Program", c: "Shell Nigeria", l: "Niger Delta", s: "Completed", d: "18 months", desc: "End-to-end pipeline inspection, NDT and corrosion mitigation across 320 km of trunk lines." },
  { t: "OCTG Supply & Threading", c: "ExxonMobil", l: "Akwa Ibom", s: "Ongoing", d: "24 months", desc: "Multi-year supply of premium connection casing and tubing with on-site storage." },
  { t: "Compressor Station Upgrade", c: "Chevron", l: "Escravos", s: "Completed", d: "9 months", desc: "Refurbishment and re-rate of two reciprocating compressor packages." },
  { t: "Wellhead Maintenance", c: "NNPC", l: "Port Harcourt", s: "Ongoing", d: "12 months", desc: "Routine and breakdown maintenance of cluster wellheads with HSE oversight." },
  { t: "Process Skid Fabrication", c: "Dangote Refinery", l: "Lagos", s: "Completed", d: "6 months", desc: "Design, fabrication and FAT of metering and chemical injection skids." },
  { t: "Drilling Waste Treatment", c: "Total E&P", l: "OML 58", s: "Completed", d: "8 months", desc: "Containerised treatment of cuttings with 98% volume reduction." },
];

function Projects() {
  return (
    <>
      <PageHero eyebrow="Projects" title="Delivering for the operators that move Nigeria." sub="A snapshot of recent work across upstream and downstream assets." />
      <section className="container-x grid gap-6 py-20 md:grid-cols-2 lg:grid-cols-3">
        {PROJECTS.map((p) => (
          <article key={p.t} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all hover:-translate-y-1 hover:shadow-card">
            <div className="relative h-44 bg-gradient-hero">
              <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 30% 30%, white, transparent 60%)" }} />
              <div className="absolute bottom-3 left-4 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur">{p.c}</div>
              <div className={`absolute right-4 top-4 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${p.s === "Completed" ? "bg-emerald text-emerald-foreground" : "bg-gold text-gold-foreground"}`}>
                <CheckCircle2 className="h-3.5 w-3.5" /> {p.s}
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-lg font-semibold">{p.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{p.desc}</p>
              <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-emerald" /> {p.l}</span>
                <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-emerald" /> {p.d}</span>
              </div>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
