import PDFDocument from 'pdfkit';
import { AnalyticsService } from './analytics.service.js';
import { AnomalyService } from './anomaly.service.js';
import { TenantRepository } from '../repositories/tenant.repository.js';

export class ReportService {
  /**
   * Generates a polished executive PDF financial spend report as a Buffer
   */
  public static async generateTenantPdfReport(tenantId: string): Promise<Buffer> {
    const summary = AnalyticsService.getTenantSummary(tenantId, true);
    const anomalies = AnomalyService.listByTenant(tenantId, 10);
    const tenant = TenantRepository.findById(tenantId);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // Header Banner
      doc
        .rect(40, 40, doc.page.width - 80, 50)
        .fill('#0f172a'); // Dark slate

      doc
        .fillColor('#ffffff')
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('SaaS CostGuard — Financial Spend & Anomaly Report', 55, 52);

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#94a3b8')
        .text(`Generated on ${new Date().toUTCString()} | Org: ${summary.tenant_name}`, 55, 72);

      doc.moveDown(3);

      // Section 1: Executive KPI Cards
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text('1. Executive Financial Summary', 40, 110);

      const kpis = [
        { label: 'Monthly Budget', value: `$${summary.monthly_budget_usd.toFixed(2)}` },
        { label: 'Total Spend', value: `$${summary.total_cost_usd.toFixed(4)}` },
        { label: 'Budget Used', value: `${summary.budget_used_percentage}%` },
        { label: 'Total API Requests', value: summary.total_requests.toLocaleString() },
        { label: 'Total Tokens', value: summary.total_tokens.toLocaleString() },
        { label: 'Avg Latency', value: `${summary.average_latency_ms} ms` },
      ];

      let startX = 40;
      let startY = 135;
      const cardWidth = 160;
      const cardHeight = 50;

      kpis.forEach((kpi, index) => {
        const col = index % 3;
        const row = Math.floor(index / 3);
        const x = startX + col * (cardWidth + 15);
        const y = startY + row * (cardHeight + 12);

        // Card box
        doc.rect(x, y, cardWidth, cardHeight).fillAndStroke('#f8fafc', '#e2e8f0');

        // Card Label
        doc
          .fillColor('#64748b')
          .fontSize(9)
          .font('Helvetica')
          .text(kpi.label, x + 10, y + 10);

        // Card Value
        doc
          .fillColor('#0f172a')
          .fontSize(14)
          .font('Helvetica-Bold')
          .text(kpi.value, x + 10, y + 25);
      });

      // Section 2: Model Spend Breakdown
      const tableTop = startY + 2 * (cardHeight + 12) + 25;
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text('2. LLM Model Cost & Token Distribution', 40, tableTop);

      let rowY = tableTop + 25;

      // Table Header
      doc.rect(40, rowY, doc.page.width - 80, 22).fill('#1e293b');
      doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
      doc.text('Model', 50, rowY + 6);
      doc.text('Provider', 180, rowY + 6);
      doc.text('Requests', 270, rowY + 6);
      doc.text('Tokens', 350, rowY + 6);
      doc.text('Spend (USD)', 440, rowY + 6);
      doc.text('Cost %', 510, rowY + 6);

      rowY += 22;

      if (summary.models.length === 0) {
        doc.rect(40, rowY, doc.page.width - 80, 24).fill('#ffffff');
        doc.fillColor('#64748b').fontSize(9).font('Helvetica').text('No telemetry recorded yet.', 50, rowY + 7);
        rowY += 24;
      } else {
        summary.models.forEach((m, idx) => {
          const bg = idx % 2 === 0 ? '#f8fafc' : '#ffffff';
          doc.rect(40, rowY, doc.page.width - 80, 20).fill(bg);
          doc.fillColor('#1e293b').fontSize(9).font('Helvetica');

          doc.text(m.model, 50, rowY + 5);
          doc.text(m.provider.toUpperCase(), 180, rowY + 5);
          doc.text(m.request_count.toLocaleString(), 270, rowY + 5);
          doc.text(m.total_tokens.toLocaleString(), 350, rowY + 5);
          doc.text(`$${m.total_cost_usd.toFixed(4)}`, 440, rowY + 5);
          doc.text(`${m.percentage_of_total_cost}%`, 510, rowY + 5);

          rowY += 20;
        });
      }

      // Section 3: Anomaly & Risk Alerts
      rowY += 25;
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text('3. Detected Anomalies & Risk Flags', 40, rowY);

      rowY += 22;

      if (anomalies.length === 0) {
        doc.rect(40, rowY, doc.page.width - 80, 30).fill('#f0fdf4'); // soft green
        doc.fillColor('#166534').fontSize(9).font('Helvetica-Bold').text('STATUS HEALTHY: Zero cost anomalies or runaway loops detected in this billing window.', 50, rowY + 10);
      } else {
        anomalies.slice(0, 5).forEach((anom) => {
          doc.rect(40, rowY, doc.page.width - 80, 35).fill('#fff1f2'); // soft red
          doc.fillColor('#991b1b').fontSize(9).font('Helvetica-Bold').text(`[${anom.severity}] ${anom.anomaly_type} — ${new Date(anom.created_at).toLocaleString()}`, 50, rowY + 6);
          doc.fillColor('#7f1d1d').fontSize(8).font('Helvetica').text(anom.description, 50, rowY + 18, { width: 450 });
          rowY += 38;
        });
      }

      // Footer
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#94a3b8')
        .text('SaaS CostGuard — FlyRank Backend Track Capstone — Confidential Financial Audit', 40, doc.page.height - 30, {
          align: 'center',
          width: doc.page.width - 80,
        });

      doc.end();
    });
  }
}
