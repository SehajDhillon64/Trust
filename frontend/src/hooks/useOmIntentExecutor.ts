import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContextSupabase';
import { getCashBoxTransactions as fetchCashBoxTx } from '../services/cashbox-database';

export function useOmIntentExecutor() {
  const { currentFacility } = useAuth();
  const {
    residents,
    getResidentTransactions,
    getFacilityServiceBatches,
    getDepositBatches,
    getFacilityTransactions,
  } = useData();

  const facilityId = currentFacility?.id || '';

  function normalize(s: string) {
    return s.toLowerCase().trim();
  }

  /**
   * Extract resident by:
   * - quoted name ("John Doe")
   * - any full resident name present as substring in message
   * If multiple, prefer the longest name to reduce partial collisions.
   */
  function extractResidentFromText(messageRaw: string) {
    const messageLower = messageRaw.toLowerCase();
    const quotedMatch = messageRaw.match(/["'][^"']+["']/);
    const quotedName = quotedMatch ? quotedMatch[0].replace(/^['"]|['"]$/g, '') : '';

    const facilityResidents = residents.filter(r => r.facilityId === facilityId);

    if (quotedName) {
      const exact = facilityResidents.find(r => r.name.toLowerCase() === quotedName.toLowerCase());
      if (exact) return exact;
      const contains = facilityResidents.find(r => r.name.toLowerCase().includes(quotedName.toLowerCase()));
      if (contains) return contains;
    }

    const matches = facilityResidents.filter(r => messageLower.includes(r.name.toLowerCase()));
    if (matches.length === 0) return null;
    if (matches.length === 1) return matches[0];
    return matches.slice().sort((a, b) => b.name.length - a.name.length)[0];
  }

  function findResidentByName(input: string) {
    const name = input.trim().replace(/^['\"]|['\"]$/g, '');
    const lowered = name.toLowerCase();
    const options = residents.filter(r => r.facilityId === facilityId && r.name.toLowerCase() === lowered);
    if (options.length > 0) return options[0];
    const fuzzy = residents.find(r => r.facilityId === facilityId && r.name.toLowerCase().includes(lowered));
    return fuzzy || null;
  }

  function parseServiceType(text: string): 'haircare' | 'footcare' | 'pharmacy' | 'cable' | 'wheelchairRepair' | 'miscellaneous' | null {
    const t = normalize(text);
    if (/(hair\s*care|haircare)/.test(t)) return 'haircare';
    if (/(foot\s*care|footcare)/.test(t)) return 'footcare';
    if (/pharmacy/.test(t)) return 'pharmacy';
    if (/(cable|tv)/.test(t)) return 'cable';
    if (/(misc|miscellaneous|other|general)/.test(t)) return 'miscellaneous';
    if (/(wheelchair\s*repair|wheelchairrepair)/.test(t)) return 'wheelchairRepair';
    return null;
  }

  function monthBounds(date = new Date()) {
    const start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
    return { start, end };
  }

  async function execute(queryRaw: string): Promise<string> {
    const q = normalize(queryRaw);
    if (!facilityId) return 'No facility context available.';
    const inferredResident = extractResidentFromText(queryRaw);

    // Balance in resident account
    if (/balance\s+in\s+['\"]?.+['\"]?\s+account/.test(q) || (/balance/.test(q) && (/account/.test(q) || !!inferredResident))) {
      const m = queryRaw.match(/balance\s+in\s+['\"]([^'\"]+)['\"]/i) || queryRaw.match(/balance\s+in\s+([^?]+)\s+account/i);
      const name = m?.[1];
      const res = name ? findResidentByName(name) : inferredResident;
      if (!res) return 'Please specify a resident name, e.g., balance in "John Doe" account.';
      if (!res) return `Resident '${name}' not found.`;
      return `Balance for ${res.name}: $${res.trustBalance.toFixed(2)}`;
    }

    // Recent N transactions in resident account (default 5)
    if (
      /recent\s+\d+\s+transactions\s+in\s+['\"]?.+['\"]?\s+account/.test(q) ||
      /recent\s+transactions\s+in\s+['\"]?.+['\"]?\s+account/.test(q) ||
      (/recent/.test(q) && (/transactions?/.test(q) || /history|statement/.test(q)) && (/(account|for|of)/.test(q) || !!inferredResident))
    ) {
      const countMatch = q.match(/recent\s+(\d+)\s+transactions/);
      const limit = countMatch ? Math.max(1, Math.min(50, parseInt(countMatch[1], 10))) : 5;
      const m = queryRaw.match(/in\s+['\"]([^'\"]+)['\"]/i) || queryRaw.match(/in\s+([^']+)\s+account/i);
      const name = m?.[1];
      const res = name ? findResidentByName(name) : inferredResident;
      if (!res) return 'Please specify a resident name, e.g., recent 5 transactions in "Jane Smith" account.';
      if (!res) return `Resident '${name}' not found.`;
      const tx = getResidentTransactions(res.id).slice().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
      if (tx.length === 0) return `No transactions found for ${res.name}.`;
      const lines = tx.map(t => `${new Date(t.timestamp).toLocaleString()} • ${t.type.toUpperCase()} • $${t.amount.toFixed(2)} • ${t.method} • ${t.description}`);
      return `Recent ${tx.length} transactions for ${res.name}:\n${lines.join('\n')}`;
    }

    // All transactions in 'service type' batch (latest batch by that type)
    if (/all\s+transactions\s+in\s+.+\s+batch/.test(q) || (/transactions/.test(q) && /batch/.test(q))) {
      const st = parseServiceType(q);
      if (!st) return 'Please specify a service type (haircare, footcare, pharmacy, cable, miscellaneous, wheelchair repair).';
      const batches = getFacilityServiceBatches(facilityId, st);
      if (!batches || batches.length === 0) return `No ${st} batches found.`;
      const latest = batches.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      if (!latest.items || latest.items.length === 0) return `Batch ${latest.id} has no items.`;
      const lines = latest.items.map(item => {
        const resident = residents.find(r => r.id === item.residentId);
        return `${resident?.name || 'Resident'} • $${item.amount.toFixed(2)} • ${item.status.toUpperCase()}`;
      });
      return `${st} batch ${latest.service_batch_no ?? latest.id} (${latest.status.toUpperCase()}):\n${lines.join('\n')}`;
    }

    // Recent/All online transactions for this month
    if (/(recent|all)?\s*online\s+transactions.*(this\s+month|current\s+month)?/.test(q) || ((/online|web/.test(q)) && (/transactions|payments?/.test(q)))) {
      const { start, end } = monthBounds();
      const tx = getFacilityTransactions(facilityId).filter(t => {
        const d = new Date(t.timestamp);
        return d >= start && d <= end && t.type === 'credit' && (t.description || '').startsWith('Online Payment');
      }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const recent = /recent/.test(q) ? tx.slice(0, 10) : tx;
      if (recent.length === 0) return 'No online transactions recorded for this month.';
      const lines = recent.map(t => {
        const r = residents.find(x => x.id === t.residentId);
        return `${new Date(t.timestamp).toLocaleDateString()} • ${r?.name || 'Resident'} • $${t.amount.toFixed(2)} • ${t.description}`;
      });
      return `${/recent/.test(q) ? 'Recent' : 'All'} online transactions (${lines.length}):\n${lines.join('\n')}`;
    }

    // Recent deposit batch transactions
    if (/recent\s+deposit\s+batch\s+transactions?/.test(q) || (/deposit/.test(q) && /batch/.test(q) && /transactions?/.test(q))) {
      const batches = getDepositBatches(facilityId, 'closed');
      const flat = batches
        .flatMap(b => (b.entries || []).map(e => ({ batch: b, entry: e })))
        .filter(x => x.entry.status === 'processed')
        .sort((a, b) => new Date(b.entry.processedAt || b.batch.closedAt || b.batch.createdAt).getTime() - new Date(a.entry.processedAt || a.batch.closedAt || a.batch.createdAt).getTime())
        .slice(0, 10);
      if (flat.length === 0) return 'No processed deposit batch transactions found.';
      const lines = flat.map(x => {
        const r = residents.find(rr => rr.id === x.entry.residentId);
        return `${new Date((x.entry.processedAt || x.batch.closedAt || x.batch.createdAt)!).toLocaleString()} • ${r?.name || 'Resident'} • $${x.entry.amount.toFixed(2)} • ${x.entry.method} • Batch ${x.batch.community_dbatch_number || x.batch.id}`;
      });
      return `Recent deposit batch transactions (${lines.length}):\n${lines.join('\n')}`;
    }

    // Recent cash box transactions
    if (/recent\s+cash\s*box\s+transactions?/.test(q) || /^cash\s*box\s+transactions?/.test(q) || (/cash/.test(q) && /box/.test(q) && /transactions?/.test(q))) {
      try {
        const tx = await fetchCashBoxTx(facilityId, 10, 0);
        if (!tx || tx.length === 0) return 'No cash box transactions found.';
        const lines = tx.map(t => `${new Date(t.created_at).toLocaleString()} • ${t.transaction_type.toUpperCase()} • $${Number(t.amount).toFixed(2)} • ${t.description}${t.resident_name ? ' • ' + t.resident_name : ''}`);
        return `Recent cash box transactions (${lines.length}):\n${lines.join('\n')}`;
      } catch (e: any) {
        return `Failed to load cash box transactions: ${e?.message || 'unknown error'}`;
      }
    }

    return 'Sorry, I did not understand. Try keywords like: balance "Resident Name" account; recent transactions "Resident Name" account; transactions haircare batch; online transactions this month; deposit batch transactions; cash box transactions.';
  }

  return { execute };
}

