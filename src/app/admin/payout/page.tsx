"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";

interface PayoutRow {
  id: string;
  reference: string;
  provider: string;
  providerPayoutId: string | null;
  amountMinor: string;
  feeMinor: string;
  status: string;
  destination: { method?: string; msisdn?: string; providerNet?: number | null };
  createdAt: string;
  user?: { name: string | null; email: string; phone: string | null } | null;
  organization?: { legalName: string; tradingName: string | null } | null;
  wallet: { id: string; currency: string; status: string };
}

const money = (minor: string) => new Intl.NumberFormat("pt-MZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(minor) / 100);

export default function AdminPayoutPage() {
  const [adminKey, setAdminKey] = useState("");
  const [walletId, setWalletId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"mpesa" | "emola">("mpesa");
  const [msisdn, setMsisdn] = useState("");
  const [reference, setReference] = useState("");
  const [rows, setRows] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const total = useMemo(() => rows.reduce((sum, row) => sum + Number(row.amountMinor), 0), [rows]);
  const pending = rows.filter((row) => row.status === "PENDING" || row.status === "PROCESSING").length;
  const successful = rows.filter((row) => row.status === "SUCCESS").length;

  async function load() {
    if (!adminKey) return;
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/payouts", { headers: { "x-admin-payout-key": adminKey }, cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível carregar os payouts.");
      setRows(data.payouts || []); sessionStorage.setItem("paygo_admin_payout_key", adminKey);
    } catch (err) { setError(err instanceof Error ? err.message : "Erro ao carregar payouts."); }
    finally { setLoading(false); }
  }

  useEffect(() => { const saved = sessionStorage.getItem("paygo_admin_payout_key"); if (saved) setAdminKey(saved); }, []);
  useEffect(() => { if (adminKey) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [adminKey]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setMessage(""); setError("");
    try {
      const response = await fetch("/api/admin/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-payout-key": adminKey },
        body: JSON.stringify({ walletId, amount, method, msisdn, reference: reference || undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "O payout foi recusado.");
      setMessage(`Payout ${data.payout.reference} enviado. Estado: ${data.payout.status}.`);
      setAmount(""); setMsisdn(""); setReference(""); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Erro ao criar payout."); }
    finally { setLoading(false); }
  }

  return (
    <main className="min-h-screen bg-[#f6f8fc] text-[#101a3a]">
      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 rounded-3xl border border-[#e6ebf5] bg-white p-5 shadow-[0_12px_40px_rgba(23,63,143,.06)] md:flex-row md:items-center md:justify-between">
          <div><div className="mb-2 inline-flex rounded-full bg-[#eef4ff] px-3 py-1 text-xs font-bold text-[#1260e9]">PayGo Finance</div><h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Payouts</h1><p className="mt-1 text-sm text-[#65718f]">Envie fundos via NetShop para M-Pesa ou e-Mola.</p></div>
          <div className="flex w-full items-center gap-3 md:w-auto"><input value={adminKey} onChange={(e) => setAdminKey(e.target.value)} type="password" placeholder="Chave admin" className="w-full rounded-xl border border-[#dce3f0] bg-[#fbfcff] px-4 py-3 text-sm outline-none focus:border-[#1260e9] md:w-64" /><button onClick={load} className="rounded-xl bg-[#1260e9] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200">Atualizar</button></div>
        </header>

        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Stat label="Payouts" value={rows.length.toString()} /><Stat label="Processados" value={successful.toString()} /><Stat label="Pendentes" value={pending.toString()} /><Stat label="Volume" value={`${money(String(total))} MT`} /></section>

        <div className="grid gap-6 xl:grid-cols-[390px_1fr]">
          <section className="rounded-3xl border border-[#e6ebf5] bg-white p-6 shadow-[0_12px_40px_rgba(23,63,143,.06)]">
            <div className="mb-5"><h2 className="text-lg font-extrabold">Novo payout</h2><p className="mt-1 text-sm text-[#65718f]">O pedido é criado server-side com idempotência.</p></div>
            <form onSubmit={submit} className="space-y-4">
              <Field label="Wallet PayGo"><input required value={walletId} onChange={(e) => setWalletId(e.target.value)} placeholder="ID da carteira" /></Field>
              <Field label="Valor (MT)"><input required inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1 000,00" /></Field>
              <Field label="Método"><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setMethod("mpesa")} className={`rounded-xl border px-4 py-3 text-sm font-bold ${method === "mpesa" ? "border-[#1260e9] bg-[#eef4ff] text-[#1260e9]" : "border-[#dce3f0]"}`}>M-Pesa</button><button type="button" onClick={() => setMethod("emola")} className={`rounded-xl border px-4 py-3 text-sm font-bold ${method === "emola" ? "border-[#1260e9] bg-[#eef4ff] text-[#1260e9]" : "border-[#dce3f0]"}`}>e-Mola</button></div></Field>
              <Field label="Número do destinatário"><input required value={msisdn} onChange={(e) => setMsisdn(e.target.value)} placeholder="+258 84 123 4567" /></Field>
              <Field label="Referência"><input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="PAYGO-OUT-001" /></Field>
              <div className="rounded-2xl bg-[#f7f9fd] p-4 text-xs leading-5 text-[#65718f]"><b className="text-[#101a3a]">NetShop:</b> payouts B2C para M-Pesa/e-Mola usam <code>/v1/payouts</code>. O mínimo para payout manual é 1.000 MT.</div>
              {message && <div className="rounded-xl bg-[#e9fbf0] px-4 py-3 text-sm font-semibold text-[#168448]">{message}</div>}{error && <div className="rounded-xl bg-[#fff0f0] px-4 py-3 text-sm font-semibold text-[#c52d3d]">{error}</div>}
              <button disabled={loading || !adminKey} className="w-full rounded-xl bg-[#1260e9] px-5 py-4 text-sm font-extrabold text-white shadow-lg shadow-blue-200 disabled:cursor-not-allowed disabled:opacity-50">{loading ? "A processar…" : "Enviar payout via NetShop"}</button>
            </form>
          </section>

          <section className="overflow-hidden rounded-3xl border border-[#e6ebf5] bg-white shadow-[0_12px_40px_rgba(23,63,143,.06)]">
            <div className="flex items-center justify-between border-b border-[#edf0f6] px-6 py-5"><div><h2 className="text-lg font-extrabold">Histórico de payouts</h2><p className="mt-1 text-sm text-[#65718f]">Últimos 50 pedidos PayGo.</p></div><span className="rounded-full bg-[#eef4ff] px-3 py-1 text-xs font-bold text-[#1260e9]">NetShop</span></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[#fafbfe] text-xs uppercase tracking-wide text-[#78839d]"><tr><th className="px-6 py-4">Referência</th><th className="px-6 py-4">Destino</th><th className="px-6 py-4">Valor</th><th className="px-6 py-4">Estado</th><th className="px-6 py-4">Data</th></tr></thead><tbody className="divide-y divide-[#edf0f6]">{rows.map((row) => <tr key={row.id} className="hover:bg-[#fbfcff]"><td className="px-6 py-4"><div className="font-bold">{row.reference}</div><div className="text-xs text-[#8a94aa]">{row.providerPayoutId || "—"}</div></td><td className="px-6 py-4"><div className="font-semibold">{row.destination?.method?.toUpperCase() || "—"}</div><div className="text-xs text-[#8a94aa]">{row.destination?.msisdn || "—"}</div></td><td className="px-6 py-4 font-extrabold">{money(row.amountMinor)} MT</td><td className="px-6 py-4"><Status status={row.status} /></td><td className="px-6 py-4 text-[#65718f]">{new Date(row.createdAt).toLocaleString("pt-MZ")}</td></tr>)}{!rows.length && <tr><td colSpan={5} className="px-6 py-16 text-center text-[#7b859c]">{loading ? "A carregar…" : "Nenhum payout registado."}</td></tr>}</tbody></table></div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block"><span className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-[#68748f]">{label}</span>{children}</label>; }
function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-[#e6ebf5] bg-white p-5 shadow-[0_10px_30px_rgba(23,63,143,.05)]"><div className="text-xs font-bold uppercase tracking-wide text-[#78839d]">{label}</div><div className="mt-2 text-2xl font-extrabold">{value}</div></div>; }
function Status({ status }: { status: string }) { const style = status === "SUCCESS" ? "bg-[#e9fbf0] text-[#168448]" : status === "FAILED" ? "bg-[#fff0f0] text-[#c52d3d]" : "bg-[#fff7df] text-[#a16a00]"; return <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${style}`}>{status}</span>; }
