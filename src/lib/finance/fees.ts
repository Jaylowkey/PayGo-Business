export type FeeRule = {
  fixedMinor: bigint;
  rateBps: bigint;
  minimumMinor?: bigint;
  maximumMinor?: bigint;
};

export function calculateFee(amountMinor: bigint, rule: FeeRule): bigint {
  if (amountMinor <= 0n) throw new Error('FEE_AMOUNT_MUST_BE_POSITIVE');
  if (rule.fixedMinor < 0n || rule.rateBps < 0n) throw new Error('FEE_RULE_INVALID');

  let fee = rule.fixedMinor + (amountMinor * rule.rateBps) / 10_000n;
  if (rule.minimumMinor !== undefined && fee < rule.minimumMinor) fee = rule.minimumMinor;
  if (rule.maximumMinor !== undefined && fee > rule.maximumMinor) fee = rule.maximumMinor;
  return fee;
}
