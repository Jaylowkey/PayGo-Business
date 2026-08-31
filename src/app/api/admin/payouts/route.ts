import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminPayoutKey } from "@/lib/env";
import { createNetShopPayout } from "@/lib/payments/netshop-payout";
import { toMinorUnits } from "@/lib/financial-ledger";

function unauthorizedOrBadConfig(request: NextRequest) {
  try {
    requireAdminPayoutKey(request.headers.get("x-admin-payout-key"));
    return null;
  } catch (error) {
    const code = error instanceof Error ? error.message : "ADMIN_PAYOUT_UNAUTHORIZED";
    return NextResponse.json({ error: code }, { status: code === "ADMIN_PAYOUT_KEY_MISSING" ? 503 : 401 });
  }
}

export async function GET(request: NextRequest) {
  const guard = unauthorizedOrBadConfig(request);
  if (guard) return guard;

  const status = request.nextUrl.searchParams.get("status") || undefined;
  const payouts = await prisma.payout.findMany({
    where: status ? { status: status as never } : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      organization: { select: { id: true, legalName: true, tradingName: true } },
      wallet: { select: { id: true, currency: true, status: true } },
    },
  });

  return NextResponse.json({
    payouts: payouts.map((payout) => ({
      ...payout,
      amountMinor: payout.amountMinor.toString(),
      feeMinor: payout.feeMinor.toString(),
    })),
  });
}

export async function POST(request: NextRequest) {
  const guard = unauthorizedOrBadConfig(request);
  if (guard) return guard;

  try {
    const body = await request.json();
    const amount = String(body.amount ?? "").trim();
    const method = body.method;
    const msisdn = String(body.msisdn ?? "").trim();
    const walletId = String(body.walletId ?? "").trim();
    const reference = String(body.reference ?? `PG-PAYOUT-${Date.now()}`).trim();
    const idempotencyKey = String(body.idempotencyKey ?? crypto.randomUUID()).trim();

    if (!/^\d+(\.\d{1,2})?$/.test(amount)) {
      return NextResponse.json({ error: "INVALID_AMOUNT" }, { status: 400 });
    }
    if (!['mpesa', 'emola'].includes(method)) {
      return NextResponse.json({ error: "INVALID_PAYOUT_METHOD" }, { status: 400 });
    }
    if (!/^\+?258\d{8,9}$/.test(msisdn.replace(/\s+/g, ""))) {
      return NextResponse.json({ error: "INVALID_MSISDN" }, { status: 400 });
    }
    if (!walletId) {
      return NextResponse.json({ error: "WALLET_ID_REQUIRED" }, { status: 400 });
    }

    const amountMinor = toMinorUnits(amount);
    if (amountMinor < 100000n) {
      return NextResponse.json({ error: "PAYOUT_MINIMUM_1000_MZN" }, { status: 400 });
    }

    const wallet = await prisma.wallet.findUnique({ where: { id: walletId } });
    if (!wallet || wallet.currency !== "MZN" || wallet.status !== "ACTIVE") {
      return NextResponse.json({ error: "INVALID_WALLET" }, { status: 400 });
    }

    const existing = await prisma.payout.findUnique({ where: { idempotencyKey } });
    if (existing) {
      return NextResponse.json({
        payout: { ...existing, amountMinor: existing.amountMinor.toString(), feeMinor: existing.feeMinor.toString() },
        idempotent: true,
      });
    }

    const provider = await createNetShopPayout({
      amount: Number(amount),
      method,
      msisdn: msisdn.replace(/\s+/g, ""),
      reference,
      idempotencyKey,
      metadata: { paygo_wallet_id: walletId, source: "paygo_admin_payout" },
    });

    const providerPayout = provider.payload;
    const providerFee = Math.round(
      ((providerFeeNumber(providerPayout.fees?.our) + providerFeeNumber(providerPayout.fees?.provider)) * 100),
    );
    const status = providerPayout.status === "completed"
      ? "SUCCESS"
      : providerPayout.status === "pending"
        ? "PROCESSING"
        : "FAILED";

    const payout = await prisma.payout.create({
      data: {
        reference,
        provider: "netshop",
        providerPayoutId: providerPayout.id,
        userId: wallet.userId ?? undefined,
        organizationId: wallet.organizationId ?? undefined,
        walletId,
        amountMinor,
        feeMinor: BigInt(providerFee),
        currency: "MZN",
        status,
        destination: {
          method,
          msisdn: msisdn.replace(/\s+/g, ""),
          providerNet: providerPayout.net ?? null,
          providerFees: providerPayout.fees ?? null,
        },
        idempotencyKey: provider.idempotencyKey,
      },
    });

    return NextResponse.json({
      payout: { ...payout, amountMinor: payout.amountMinor.toString(), feeMinor: payout.feeMinor.toString() },
      provider: providerPayout,
    }, { status: providerPayout.status === "failed" ? 502 : 201 });
  } catch (error) {
    const err = error as Error & { status?: number; payload?: unknown };
    console.error("[admin/payouts]", err);
    return NextResponse.json({
      error: err.message || "PAYOUT_FAILED",
      provider: err.payload ?? null,
    }, { status: err.status && err.status >= 400 && err.status < 600 ? err.status : 500 });
  }
}

function providerFeeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
