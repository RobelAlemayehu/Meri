import { Link } from "react-router-dom";
import {
  MapPin,
  Footprints,
  MessageCircle,
  Building2,
  Shield,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { BRAND_NAME, BRAND_TAGLINE, LOGO_SRC } from "../constants/brand";

const IMG = {
  hero: "/landing/hero-map.svg",
  compass: "/landing/feature-compass.svg",
  chat: "/landing/feature-chat.svg",
  directory: "/landing/feature-directory.svg",
};

export default function LandingPage() {
  return (
    <div className="space-y-0 pb-20">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-amber-50/50 px-6 py-12 shadow-sm sm:px-10 sm:py-16 lg:px-14 lg:py-20">
        <div
          className="pointer-events-none absolute inset-0 rounded-3xl bg-[linear-gradient(110deg,transparent_0%,rgba(251,191,36,0.07)_45%,rgba(148,197,255,0.12)_55%,transparent_100%)] bg-[length:220%_100%] animate-hero-shimmer"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-amber-200/30 blur-3xl animate-hero-blob will-change-transform"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-blue-200/25 blur-3xl animate-hero-blob-slow will-change-transform"
          aria-hidden
        />
        <div className="relative grid items-center gap-12 lg:grid-cols-[1fr_min(42%,420px)] lg:gap-16">
          <div className="space-y-6">
            <div
              className="inline-flex animate-hero-fade-up items-center gap-3 rounded-2xl border border-slate-200/90 bg-white/90 p-2 pr-5 shadow-sm backdrop-blur-sm [animation-delay:0ms]"
            >
              <img
                src={LOGO_SRC}
                alt=""
                className="h-14 w-14 rounded-xl object-cover shadow-md ring-2 ring-amber-200/50 sm:h-16 sm:w-16"
              />
              <div>
                <p className="text-xl font-bold text-[#0c1524] sm:text-2xl">
                  {BRAND_NAME}
                </p>
                <p className="text-sm text-slate-600">{BRAND_TAGLINE}</p>
              </div>
            </div>
            <div className="space-y-3">
              <h1 className="animate-hero-fade-up text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.35rem] lg:leading-tight [animation-delay:80ms]">
                Find the building. Then find the room.
              </h1>
              <p className="animate-hero-fade-up max-w-md text-base leading-relaxed text-slate-600 [animation-delay:160ms]">
                Choose where you&apos;re headed, walk the route on the map, and
                ping the assistant if you need a nudge—no account, just your
                browser.
              </p>
            </div>
            <div className="flex animate-hero-fade-up flex-wrap items-center gap-3 [animation-delay:240ms]">
              <Link
                to="/navigate/guide"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-[#0c1524] px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:bg-[#152a45] hover:shadow-xl hover:shadow-slate-900/25 active:scale-[0.98]"
              >
                Start navigating
                <MapPin className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#how-it-works"
                className="group inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 active:scale-[0.98]"
              >
                How it works
                <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </a>
              <Link
                to="/navigate/superadmin-apply"
                className="group inline-flex items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-5 py-3.5 text-sm font-semibold text-violet-900 shadow-sm transition hover:border-violet-300 hover:bg-violet-100 active:scale-[0.98]"
              >
                Get started as superadmin
                <ShieldCheck className="h-4 w-4" />
              </Link>
            </div>
            <p className="animate-hero-fade-up text-sm text-slate-500 [animation-delay:300ms]">
              Map · walking directions · chat
            </p>
          </div>
          <div className="relative mx-auto w-full max-w-md animate-hero-fade-up lg:max-w-none [animation-delay:140ms]">
            <div className="animate-hero-float rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/5 [animation-delay:0.55s] motion-reduce:animate-none">
              <img
                src={IMG.hero}
                alt="Stylized map with a walking route between two pins"
                className="w-full rounded-xl transition-transform duration-700 ease-out hover:scale-[1.02]"
                width={480}
                height={360}
                loading="eager"
              />
            </div>
            <p className="animate-hero-fade-up mt-3 text-center text-xs text-slate-500 lg:text-left [animation-delay:340ms]">
              Sample map—yours shows the real site.
            </p>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="mx-auto mt-16 max-w-4xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-800/90">
          Why {BRAND_NAME}
        </p>
        <h2 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">
          One flow from gate to room
        </h2>
        <p className="mt-4 text-base leading-relaxed text-slate-600">
          Large sites are hard to signpost. Static PDFs go out of date, and
          generic maps don&apos;t know your lab names or which staircase is
          closest. {BRAND_NAME} ties together{" "}
          <span className="font-medium text-slate-800">search</span>,{" "}
          <span className="font-medium text-slate-800">GPS-aware outdoor
          routing</span>, and an{" "}
          <span className="font-medium text-slate-800">assistant</span> that
          only promises what admins have recorded — so answers stay aligned with
          your official directory.
        </p>
      </section>

      <section className="mt-12 grid gap-4 sm:grid-cols-3">
        {[
          {
            icon: MapPin,
            title: "Outdoor first",
            body: "Distance, ETA, and compass-style bearing toward the destination building, with a path drawn on an interactive map.",
            color: "bg-sky-50 text-sky-800 ring-sky-100",
          },
          {
            icon: Footprints,
            title: "Arrival handoff",
            body: "When you reach the building, the experience shifts to indoor-oriented guidance and suggestions from your site data.",
            color: "bg-amber-50 text-amber-900 ring-amber-100",
          },
          {
            icon: MessageCircle,
            title: "Ask in plain language",
            body: "The assistant handles questions like “Where is the toilet on floor 2?” using buildings, floors, and named places admins entered.",
            color: "bg-indigo-50 text-indigo-800 ring-indigo-100",
          },
        ].map(({ icon: Icon, title, body, color }) => (
          <div
            key={title}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            <span
              className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${color}`}
            >
              <Icon className="h-5 w-5" />
            </span>
            <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
          </div>
        ))}
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="mt-24 scroll-mt-24 rounded-3xl border border-slate-200 bg-slate-900 px-6 py-14 text-slate-100 sm:px-10"
      >
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-200/90">
            Flow
          </p>
          <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
            How it works for a visitor
          </h2>
          <p className="mt-4 text-slate-300">
            Three straightforward steps — from choosing a site to getting
            answers inside the building.
          </p>
        </div>
        <ol className="mx-auto mt-12 grid max-w-5xl gap-8 md:grid-cols-3">
          {[
            {
              step: "01",
              title: "Find your compound",
              text: "Search and select from compounds registered in the system (up to a short list for quick picking). Each site has its own buildings, map, and directory.",
            },
            {
              step: "02",
              title: "Choose a destination",
              text: "Pick a building and destination from the official list — the same entries staff maintain for navigation and the assistant. Allow location when prompted for live outdoor guidance.",
            },
            {
              step: "03",
              title: "Follow, then ask",
              text: "Use the map and live guidance to walk to the pin. After arrival, use the assistant for room-level and facility questions grounded in your site’s structured data.",
            },
          ].map((item) => (
            <li
              key={item.step}
              className="relative rounded-2xl border border-slate-700/80 bg-slate-800/50 p-6 backdrop-blur-sm"
            >
              <span className="font-mono text-3xl font-bold text-amber-400/90">
                {item.step}
              </span>
              <h3 className="mt-3 text-lg font-semibold text-white">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {item.text}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* Feature detail + images */}
      <section className="mt-24 space-y-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Product detail
          </p>
          <h2 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">
            What you get in the app
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Below is a concise breakdown of the main capabilities visitors see
            after they open Navigate. Screens are stylized illustrations; the
            live app uses real map tiles, your GeoJSON footprints, and
            server-calculated walking routes where configured.
          </p>
        </div>

        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="order-2 space-y-4 lg:order-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
              <Sparkles className="h-3.5 w-3.5" />
              Live guidance
            </div>
            <h3 className="text-xl font-bold text-slate-900 sm:text-2xl">
              Outdoor map, route, and real-time cues
            </h3>
            <p className="leading-relaxed text-slate-600">
              While you are outside, the interface shows an interactive map
              centered on the area, your position when GPS is available, and a
              highlighted walking route toward the destination building where
              routing is enabled. A dedicated guidance panel summarizes{" "}
              <strong className="font-medium text-slate-800">
                remaining distance
              </strong>
              ,{" "}
              <strong className="font-medium text-slate-800">
                estimated walking time
              </strong>
              , and{" "}
              <strong className="font-medium text-slate-800">
                heading / bearing
              </strong>{" "}
              so you can orient yourself even before you look at the path on the
              map.
            </p>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                Building footprints and labels from your published compound map
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                Route polyline aligned to pedestrian paths when the backend
                routing service is available
              </li>
            </ul>
          </div>
          <div className="order-1 lg:order-2">
            <img
              src={IMG.compass}
              alt="Illustration of compass-style bearing and ETA display"
              className="mx-auto w-full max-w-sm rounded-2xl shadow-lg ring-1 ring-slate-200/80 lg:max-w-md"
              width={320}
              height={240}
              loading="lazy"
            />
          </div>
        </div>

        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <img
              src={IMG.directory}
              alt="Illustration of a destination list from the compound directory"
              className="mx-auto w-full max-w-sm rounded-2xl shadow-lg ring-1 ring-slate-200/80 lg:max-w-md"
              width={320}
              height={240}
              loading="lazy"
            />
          </div>
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900">
              <Building2 className="h-3.5 w-3.5" />
              Official directory
            </div>
            <h3 className="text-xl font-bold text-slate-900 sm:text-2xl">
              Destinations staff define — not random POIs
            </h3>
            <p className="leading-relaxed text-slate-600">
              Visitors choose from{" "}
              <strong className="font-medium text-slate-800">
                buildings and named places
              </strong>{" "}
              that administrators attach to each compound: floors, wings, rooms,
              labs, halls, and optional indoor direction notes. That same
              structured information feeds both the navigation flow and the
              assistant, so terminology stays consistent across the product.
            </p>
            <p className="text-sm leading-relaxed text-slate-500">
              Branch admins curate content for their site; superadmins can
              provision compounds and assign who manages them.
            </p>
          </div>
        </div>

        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="order-2 space-y-4 lg:order-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-900">
              <MessageCircle className="h-3.5 w-3.5" />
              AI assistant
            </div>
            <h3 className="text-xl font-bold text-slate-900 sm:text-2xl">
              Chat grounded in your compound data
            </h3>
            <p className="leading-relaxed text-slate-600">
              The assistant is designed to answer using the{" "}
              <strong className="font-medium text-slate-800">
                directory and descriptions
              </strong>{" "}
              your team entered — not the open web. That keeps guidance specific
              to your layout and reduces generic or hallucinated instructions.
              On large screens the chat can appear beside the map; on smaller
              devices it opens as a focused panel so typing and reading stay
              comfortable.
            </p>
          </div>
          <div className="order-1 lg:order-2">
            <img
              src={IMG.chat}
              alt="Illustration of chat messages and assistant access"
              className="mx-auto w-full max-w-sm rounded-2xl shadow-lg ring-1 ring-slate-200/80 lg:max-w-md"
              width={320}
              height={240}
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* Institutions */}
      <section className="mt-24 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10 lg:p-12">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-start lg:gap-12">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              <Shield className="h-3.5 w-3.5" />
              For institutions
            </div>
            <h2 className="mt-4 text-2xl font-bold text-slate-900 sm:text-3xl">
              Operations behind the guest experience
            </h2>
            <p className="mt-4 leading-relaxed text-slate-600">
              Staff sign in through a separate login (not linked from this
              public home).{" "}
              <strong className="font-medium text-slate-800">
                Branch admins
              </strong>{" "}
              manage their assigned compound: buildings, geographic coordinates
              for pins and outdoor context, floor plans where applicable, and
              the directory entries visitors search and ask about.{" "}
              <strong className="font-medium text-slate-800">
                Superadmins
              </strong>{" "}
              create compounds, register branch admin accounts, and assign who
              owns which site — so responsibilities stay clear as you scale to
              more campuses or clients.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              This separation keeps the guest path simple while giving you a
              structured way to maintain accurate, AI-consumable site data.
            </p>
          </div>
          <ul className="space-y-4 rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-200/80">
            {[
              "Role-based access: superadmin vs branch admin",
              "Compound-scoped maps and destination lists",
              "Guest navigation and assistant without signup",
              "API-backed auth and data for maintainability",
            ].map((line) => (
              <li key={line} className="flex gap-3 text-sm text-slate-700">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                {line}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-24">
        <h2 className="text-center text-2xl font-bold text-slate-900">
          Common questions
        </h2>
        <div className="mx-auto mt-8 max-w-3xl space-y-3">
          {[
            {
              q: "Do I need to create an account to use navigation?",
              a: "No. Guests open Navigate, choose a compound and destination, and proceed. Staff accounts are only for administrators who maintain site data.",
            },
            {
              q: "Why does the app ask for my location?",
              a: "Location is optional but improves outdoor guidance: your position on the map, distance and ETA updates, and bearing toward the destination. You can still explore the map if you deny access, but live cues will be limited.",
            },
            {
              q: "How accurate is indoor information?",
              a: "Indoor answers follow what your institution entered — room names, floors, directions, and descriptions. If something is missing from the directory, the assistant cannot invent it; updating the admin data improves both search and chat.",
            },
            {
              q: "What is መሪ (Meri)?",
              a: "Meri means guide or leader in Amharic. The product name reflects the goal: leading people through complex sites with clear, trustworthy directions.",
            },
          ].map((item) => (
            <details
              key={item.q}
              className="group rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm open:shadow-md"
            >
              <summary className="cursor-pointer list-none font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-3">
                  {item.q}
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 transition group-open:rotate-90" />
                </span>
              </summary>
              <p className="mt-3 border-t border-slate-100 pt-3 text-sm leading-relaxed text-slate-600">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="mt-20 rounded-3xl bg-gradient-to-br from-[#0c1524] to-[#152a45] px-8 py-12 text-center text-white shadow-xl sm:px-12">
        <h2 className="text-2xl font-bold sm:text-3xl">
          Ready to find your way?
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-slate-300 sm:text-base">
          Open the navigator, select your compound, and let {BRAND_NAME} guide
          you from the map to the right door.
        </p>
        <Link
          to="/navigate/guide"
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-8 py-3.5 text-sm font-bold text-[#0c1524] shadow-lg transition hover:bg-amber-300"
        >
          Go to Navigate
          <MapPin className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}
