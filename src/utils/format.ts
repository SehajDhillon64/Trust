export type SimplifyContext = {
  audience: 'resident' | 'poa' | 'om' | 'admin' | 'vendor';
};

// Map common verbose patterns to simplified labels
function mapDescriptionToSimpleLabel(original: string): string {
  const text = original || '';

  // Online payments (PayPal/Stripe etc.)
  if (/online payment/i.test(text)) {
    return 'Online Payment';
  }

  // Top-ups/credits
  if (/top-?up|top up|credited/i.test(text)) {
    return 'Online Payment';
  }

  // Batch payments for services
  if (/hair\s*care/i.test(text)) {
    return 'Hair Care Fees';
  }
  if (/foot\s*care/i.test(text)) {
    return 'Foot Care Fees';
  }
  if (/pharmacy/i.test(text)) {
    return 'Pharmacy Purchase';
  }
  if (/wheelchair/i.test(text)) {
    return 'Wheelchair Repair';
  }
  if (/cable/i.test(text)) {
    return 'Cable TV';
  }

  // Manual deposits/withdrawals
  if (/manual|cash|cheque|deposit/i.test(text) && /credit|deposit|add(ed)?/i.test(text)) {
    return 'Manual Deposit';
  }
  if (/withdraw|debit|remov(al|e)/i.test(text)) {
    return 'Manual Withdrawal';
  }

  // Default fallback trims batch wording and amounts
  return text
    .replace(/Batch Payment[^|\-]*/i, 'Service Fees')
    .replace(/Deposit Batch #[^|\-]*/i, 'Deposit')
    .replace(/\(Cheque[^\)]*\)/gi, '')
    .replace(/Gross [\d,.]+ [A-Z]{3}/gi, '')
    .replace(/PayPal fee [\d,.]+ [A-Z]{3}/gi, '')
    .replace(/Net received [\d,.]+ [A-Z]{3}/gi, '')
    .replace(/Top-?up credited [\d,.]+ [A-Z]{3}/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function simplifyTransactionDescription(original: string, ctx: SimplifyContext): string {
  if (ctx.audience === 'resident' || ctx.audience === 'poa') {
    return mapDescriptionToSimpleLabel(original);
  }
  return original;
}

