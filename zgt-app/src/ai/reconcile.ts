import { Order, Payment, ReconcileResult } from '../types';

interface ReconcileInput {
  orders: Order[];
  payments: Payment[];
}

interface ReconcileReport {
  results: ReconcileResult[];
  matched: number;
  anomalies: number;
  totalExpected: number;
  totalReceived: number;
  summary: string;
}

export function aiReconcile(input: ReconcileInput): ReconcileReport {
  const { orders, payments } = input;
  const confirmedPayments = payments.filter((p) => p.status === 'confirmed');

  const results: ReconcileResult[] = orders
    .filter((o) => o.status !== 'cancelled')
    .map((order) => {
      const orderPayments = confirmedPayments.filter((p) => p.orderId === order.id);
      const received = orderPayments.reduce((s, p) => s + p.amount, 0);
      const expected = order.depositAmount + order.finalAmount;
      const diff = received - expected;

      let status: ReconcileResult['status'] = 'matched';
      if (received === 0) status = 'missing';
      else if (orderPayments.length > 2) status = 'duplicate';
      else if (Math.abs(diff) < 0.01) status = 'matched';
      else if (diff > 0) status = 'overpaid';
      else status = 'underpaid';

      return {
        orderId: order.id,
        memberName: order.memberName,
        expected,
        received,
        status,
        diff: Math.round(diff * 100) / 100,
      };
    });

  const matched = results.filter((r) => r.status === 'matched').length;
  const anomalies = results.filter((r) => r.status !== 'matched').length;
  const totalExpected = results.reduce((s, r) => s + r.expected, 0);
  const totalReceived = results.reduce((s, r) => s + r.received, 0);

  const missing = results.filter((r) => r.status === 'missing').length;
  const underpaid = results.filter((r) => r.status === 'underpaid').length;
  const overpaid = results.filter((r) => r.status === 'overpaid').length;

  const summary = `AI对账完成：${results.length}笔订单，${matched}笔已匹配，${anomalies}笔异常。` +
    (missing > 0 ? `${missing}笔未收款、` : '') +
    (underpaid > 0 ? `${underpaid}笔少付、` : '') +
    (overpaid > 0 ? `${overpaid}笔多付、` : '') +
    `应收¥${totalExpected.toFixed(2)}，实收¥${totalReceived.toFixed(2)}，差额¥${(totalReceived - totalExpected).toFixed(2)}`;

  return { results, matched, anomalies, totalExpected, totalReceived, summary };
}

export function parseAmountFromText(text: string): number[] {
  const regex = /¥?\s*(\d+\.?\d{0,2})/g;
  const amounts: number[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    amounts.push(parseFloat(match[1]));
  }
  return amounts;
}
