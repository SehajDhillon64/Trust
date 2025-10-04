import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { fetchPayPalConfig } from '../services/paypal';
import { rpcCall } from '../services/rpc';

export default function OnlinePaymentModal({
  residentId,
  facilityId,
  onClose,
  onSuccess,
}: {
  residentId: string;
  facilityId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loadingCfg, setLoadingCfg] = useState(true);
  const [cfg, setCfg] = useState<{ clientId: string; environment: 'sandbox' | 'live'; scriptUrl: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingCfg(true);
        const c = await fetchPayPalConfig(facilityId);
        setCfg(c);
      } catch (e: any) {
        setError(e?.message || 'Failed to load PayPal configuration');
      } finally {
        setLoadingCfg(false);
      }
    };
    load();
  }, [facilityId]);

  const initialOptions = useMemo(() => {
    if (!cfg) return undefined;
    return {
    clientId: cfg.clientId,
      currency: 'CAD',
      intent: 'capture',
      components: 'buttons',
    } as any;
  }, [cfg]);

  const parsedAmount = Number(amount);
  const computedChargeRaw = (1.03 * parsedAmount) + 0.30;
  const chargeAmount = !isNaN(computedChargeRaw) && isFinite(computedChargeRaw) ? Math.max(0, computedChargeRaw) : 0;
  const canPay = !isNaN(parsedAmount) && parsedAmount > 0.01 && chargeAmount > 0.01;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Add Funds Online</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Trust Top-Up Amount (CAD)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter amount"
            />
          </div>
            
          {canPay && (
            <div className="text-sm text-gray-700">
              Card will be charged: <span className="font-medium">${chargeAmount.toFixed(2)} CAD</span>
            </div>
          )}

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          {loadingCfg && (
            <div className="text-gray-600 text-sm">Loading payment options...</div>
          )}

          {!loadingCfg && cfg && initialOptions && (
            <PayPalScriptProvider options={initialOptions as any}>
              <PayPalButtons
                style={{ layout: 'vertical' }}
                disabled={!canPay}
                createOrder={async (_data, actions) => {
                  setError('');
                  try {
                    // Create the order on client via PayPal SDK
                    const orderId = await actions.order.create({
                      purchase_units: [
                        {
                          amount: {
                            currency_code: 'CAD',
                            value: chargeAmount.toFixed(2),
                          },
                          description: 'Resident Trust Deposit',
                          custom_id: JSON.stringify({ residentId, facilityId, trustTopUp: parsedAmount.toFixed(2), cardCharge: chargeAmount.toFixed(2) }),
                          reference_id: residentId,
                        },
                      ],
                    });
                    return orderId;
                  } catch (e: any) {
                    setError(e?.message || 'Failed to create order');
                    throw e;
                  }
                }}
                onApprove={async (_data, actions) => {
                  try {
                    // Capture via PayPal SDK
                    const details = await actions.order?.capture();

                    // Determine amount and currency
                    const pu = details?.purchase_units?.[0] as any;
                    const captured = pu?.payments?.captures?.[0];
                    const amountStr = captured?.amount?.value || pu?.amount?.value;
                    const currency = captured?.amount?.currency_code || pu?.amount?.currency_code || 'CAD';
                    const cardChargedNum = amountStr ? Number(amountStr) : chargeAmount;
                    const trustTopUpNum = parsedAmount;
                    const breakdown = captured?.seller_receivable_breakdown;
                    const grossNum = amountStr ? Number(amountStr) : cardChargedNum;
                    const feeNum = breakdown?.paypal_fee?.value ? Number(breakdown.paypal_fee.value) : (cardChargedNum - trustTopUpNum);
                    const netNum = breakdown?.net_amount?.value ? Number(breakdown.net_amount.value) : (grossNum - feeNum);

                    // Persist server-side using existing RPC to create transactions
                    await rpcCall('createTransaction', [{
                      residentId,
                      facilityId,
                      type: 'credit',
                      amount: trustTopUpNum,
                      method: 'manual',
                      description: `Online Payment (PayPal ${currency}) - Gross ${grossNum.toFixed(2)} ${currency}, PayPal fee ${feeNum.toFixed(2)} ${currency}, Net received ${netNum.toFixed(2)} ${currency} | Top-up credited ${trustTopUpNum.toFixed(2)} ${currency}`,
                      createdBy: ''
                    }]);

                    onSuccess();
                  } catch (e: any) {
                    setError(e?.message || 'Payment capture failed');
                  }
                }}
                onError={() => {
                  setError('PayPal error. Please try again.');
                }}
              />
            </PayPalScriptProvider>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Close</button>
        </div>
      </div>
    </div>
  );
}