import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MessageCircle, X, Send, Bot } from "lucide-react";
import { api } from "../services/api";

const SUGGESTIONS = [
  "Where is the gym?",
  "How do I get to the restaurant?",
  "Show me the reception",
];

const fabStyle = {
  position: "fixed",
  right: "max(1rem, env(safe-area-inset-right))",
  bottom: "max(1.25rem, env(safe-area-inset-bottom))",
  zIndex: 2147483647,
  width: "4rem",
  height: "4rem",
  borderRadius: "9999px",
  border: "none",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)",
  color: "#fff",
  boxShadow: "0 10px 40px rgba(37, 99, 235, 0.35)",
};

function useLargeScreenDocked() {
  const [docked, setDocked] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const fn = () => setDocked(mq.matches);
    fn();
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return docked;
}

/**
 * AI guide: docked right panel on lg+ screens; floating FAB + sheet on smaller viewports.
 */
export default function FloatingNavigationChat({
  compoundId,
  destinationKey,
  phase,
  compoundName,
  guideBootstrap,
  navSession = 0,
}) {
  const docked = useLargeScreenDocked();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [insideBuilding, setInsideBuilding] = useState(false);
  const listRef = useRef(null);
  const lastBootstrapKey = useRef(null);

  const indoorMode = phase === "indoor" || insideBuilding;
  const hasCompound = Boolean(compoundId);
  const panelVisible = docked || open;

  useEffect(() => {
    setMessages([]);
    lastBootstrapKey.current = null;
    setInsideBuilding(false);
    setOpen(false);
  }, [compoundId, navSession]);

  useEffect(() => {
    const k = guideBootstrap?.key;
    const text = guideBootstrap?.text;
    if (k == null || !text || lastBootstrapKey.current === k) return;
    lastBootstrapKey.current = k;
    setMessages((m) => [...m, { role: "guide", text }]);
    if (!docked) setOpen(true);
  }, [guideBootstrap?.key, guideBootstrap?.text, docked]);

  useEffect(() => {
    if (phase === "indoor") setInsideBuilding(true);
  }, [phase]);

  useEffect(() => {
    if (!panelVisible) return;
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, panelVisible, loading]);

  useEffect(() => {
    const openChat = () => setOpen(true);
    window.addEventListener("navai-open-chat", openChat);
    return () => window.removeEventListener("navai-open-chat", openChat);
  }, []);

  async function send(text) {
    const msg = text.trim();
    if (!msg) return;

    if (!compoundId) {
      if (!docked) setOpen(true);
      setInput("");
      setMessages((m) => [
        ...m,
        { role: "user", text: msg },
        {
          role: "guide",
          text: "Select a compound from the list above — then I can use your site’s data to help.",
        },
      ]);
      return;
    }

    const historyForApi = messages
      .filter((m) => m.role === "user" || m.role === "guide")
      .map((m) => ({
        role: m.role === "user" ? "user" : "model",
        text: m.text,
      }))
      .slice(-20);

    setLoading(true);
    setMessages((m) => [...m, { role: "user", text: msg }]);
    setInput("");
    try {
      const { data } = await api.chatQuery({
        message: msg,
        compoundId,
        destinationKey: destinationKey || undefined,
        indoorMode,
        phase: indoorMode ? "indoor" : "outdoor",
        history: historyForApi,
      });
      setMessages((m) => [
        ...m,
        {
          role: "guide",
          text: data.reply,
          source: data.replySource,
        },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "guide",
          text:
            err.response?.data?.message ||
            "Could not reach the guide. Check your connection.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const panelInner = (
    <>
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white">
            <Bot className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id="floating-chat-title"
                className="font-semibold text-slate-900"
              >
                Navigation Assistant
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Online
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              Ask me for directions
              {compoundName ? ` · ${compoundName}` : ""}
            </p>
          </div>
        </div>
        {!docked && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {!hasCompound && (
        <div className="mx-4 mt-3 shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Select a <strong>compound</strong> in the list on the left, then ask
          your question here.
        </div>
      )}

      {hasCompound && phase !== "indoor" && (
        <label className="mx-4 mt-3 flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          <input
            type="checkbox"
            checked={insideBuilding}
            onChange={(e) => setInsideBuilding(e.target.checked)}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          I’m already inside a building (better indoor directions)
        </label>
      )}

      <div
        ref={listRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3"
      >
        {messages.length === 0 && (
          <p className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm leading-relaxed text-slate-600">
            {hasCompound
              ? "Ask about this compound — toilets, stairs, rooms — using names your admin added. Or tap a suggestion below."
              : "Choose a compound on the left, then ask me anything about that site."}
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
              m.role === "user"
                ? "ml-auto bg-blue-600 text-white"
                : "mr-auto border border-slate-200 bg-slate-50 text-slate-800"
            }`}
          >
            {m.text}
            {m.role === "guide" && m.source === "gemini" && (
              <span className="mt-1 block text-[10px] uppercase tracking-wide text-slate-400">
                AI guide
              </span>
            )}
          </div>
        ))}
        {loading && (
          <p className="text-xs text-slate-500">Guide is thinking…</p>
        )}
      </div>

      <div className="shrink-0 border-t border-slate-200 px-3 py-2">
        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
          Suggestions
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              disabled={loading}
              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-left text-[11px] text-slate-700 shadow-sm hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <form
        className="flex shrink-0 gap-2 border-t border-slate-200 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            hasCompound
              ? "Ask for directions…"
              : "Select a compound first…"
          }
          className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none ring-blue-500 focus:ring-2"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm hover:bg-blue-500 disabled:opacity-40"
          aria-label="Send"
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
    </>
  );

  if (typeof document === "undefined") return null;

  const dockedPanel = (
    <div className="hidden h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md lg:flex lg:max-h-[calc(100vh-9rem)] lg:w-[min(100%,420px)] lg:shrink-0">
      {panelInner}
    </div>
  );

  const floatingUi = (
    <>
      <button
        type="button"
        style={fabStyle}
        className="navai-chat-fab hover:brightness-110 active:scale-95 lg:hidden"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat guide" : "Open AI chat guide"}
        title="AI navigation guide"
      >
        {open ? (
          <X className="h-8 w-8" strokeWidth={2.2} />
        ) : (
          <MessageCircle className="h-8 w-8" strokeWidth={2.2} />
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 2147483645,
              background: "rgba(15, 23, 42, 0.4)",
              border: "none",
              cursor: "pointer",
            }}
            className="lg:hidden"
            aria-label="Close chat"
            onClick={() => setOpen(false)}
          />
          <div
            style={{ zIndex: 2147483646 }}
            className="fixed bottom-0 left-0 right-0 flex max-h-[88vh] flex-col rounded-t-3xl border border-slate-200 bg-white shadow-2xl lg:hidden sm:bottom-28 sm:left-auto sm:right-6 sm:max-h-[min(580px,75vh)] sm:w-full sm:max-w-md sm:rounded-2xl"
            role="dialog"
            aria-labelledby="floating-chat-title"
          >
            {panelInner}
          </div>
        </>
      )}
    </>
  );

  return (
    <>
      {dockedPanel}
      {!docked && createPortal(floatingUi, document.body)}
    </>
  );
}
