import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Facility, Invoice, InvoiceItem, Resident } from '../types';

export async function generateInvoicePdf(
  invoice: Invoice,
  facility: Facility,
  getResidentById: (id: string) => Resident | null
): Promise<Blob> {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });

  const left = 40;
  const right = 555;
  let y = 40;

  // Facility name header (top center)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(facility.name, (left + right) / 2, y, { align: 'center' });
  y += 18;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Invoice', left, y);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  y += 20;
  doc.text(`Invoice #: ${String(invoice.invoice_no || invoice.id).slice(0, 12)}`, left, y);
  y += 14;
  doc.text(
    `Invoice Date: ${invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : new Date(invoice.createdAt).toLocaleDateString()}`,
    left,
    y
  );
  y += 14;
  if (invoice.paidAt) {
    doc.text(`Status: Paid on ${new Date(invoice.paidAt).toLocaleDateString()}`, left, y);
  } else {
    doc.text(`Status: ${invoice.status}`, left, y);
  }

  // Facility block
  y += 24;
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To (Facility):', left, y);
  doc.setFont('helvetica', 'normal');
  y += 14;
  doc.text(facility.name, left, y);
  y += 14;
  doc.text(facility.address, left, y, { maxWidth: 260 });

  // Vendor block
  let y2 = 94;
  doc.setFont('helvetica', 'bold');
  doc.text('Vendor:', right - 200, y2);
  doc.setFont('helvetica', 'normal');
  y2 += 14;
  doc.text(invoice.vendorName || '—', right - 200, y2, { maxWidth: 200 });
  y2 += 14;
  if (invoice.vendorEmail) {
    doc.text(String(invoice.vendorEmail), right - 200, y2, { maxWidth: 200 });
    y2 += 14;
  }
  if (invoice.vendorAddress) {
    const split = doc.splitTextToSize(invoice.vendorAddress, 200);
    split.forEach((line: string) => {
      doc.text(line, right - 200, y2);
      y2 += 14;
    });
  }

  // Items table
  const rows = (invoice.items || []).map((item: InvoiceItem) => {
    const res = getResidentById(item.residentId);
    return [
      res?.name || 'Unknown',
      res?.residentId || '',
      item.description || '',
      `$${item.amount.toFixed(2)}`,
      new Date(item.createdAt).toLocaleDateString(),
    ];
  });

  autoTable(doc, {
    startY: Math.max(y + 20, y2 + 20),
    head: [['Resident', 'Resident ID', 'Description', 'Amount', 'Date']],
    body: rows,
    styles: { fontSize: 10 },
    headStyles: { fillColor: [34, 102, 221] },
    columnStyles: {
      0: { cellWidth: 140 },
      1: { cellWidth: 90 },
      2: { cellWidth: 170 },
      3: { halign: 'right', cellWidth: 80 },
      4: { cellWidth: 80 },
    },
  });

  const total = (invoice.items || []).reduce((sum, i) => sum + i.amount, 0);
  let after = (doc as any).lastAutoTable.finalY || 140;
  after += 16;
  doc.setFont('helvetica', 'bold');
  doc.text('Total:', right - 160, after);
  doc.text(`$${total.toFixed(2)}`, right - 80, after, { align: 'right' });

  // OM notes
  after += 24;
  doc.setFont('helvetica', 'bold');
  doc.text('OM Notes:', left, after);
  doc.setFont('helvetica', 'normal');
  after += 14;
  const notes = invoice.omNotes || '';
  const splitNotes = doc.splitTextToSize(notes || '—', right - left);
  splitNotes.forEach((line: string) => {
    doc.text(line, left, after);
    after += 14;
  });

  const blob = doc.output('blob');
  return blob as Blob;
}

