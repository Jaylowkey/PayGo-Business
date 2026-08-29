export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-6 py-16 lg:px-8">
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-medium text-blue-700 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            PayGo Business
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">
            A plataforma empresarial da PayGo.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Pagamentos, carteira, clientes, KYC/KYB, faturação, notificações,
            marketing e ferramentas para developers em um único ambiente.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            {[
              "KYC / KYB",
              "Payments",
              "Wallet",
              "Invoices",
              "Notifications",
              "Developer API",
            ].map((feature) => (
              <span
                key={feature}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
