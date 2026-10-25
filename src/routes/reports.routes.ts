import { Router, Request, Response } from 'express';
import { ReportService } from '../services/report.service.js';
import { TenantRepository } from '../repositories/tenant.repository.js';
import { AnalyticsService } from '../services/analytics.service.js';
import { AnomalyService } from '../services/anomaly.service.js';

export const reportsRouter = Router();

// Stream generated PDF financial report
reportsRouter.get('/pdf', async (req: Request, res: Response): Promise<void> => {
  try {
    let tenantId = req.query.tenant_id as string | undefined;
    if (!tenantId) {
      tenantId = TenantRepository.ensureDefaultTenant().id;
    }

    const tenant = TenantRepository.findById(tenantId);
    if (!tenant) {
      res.status(404).json({
        success: false,
        error: `Tenant '${tenantId}' not found`,
      });
      return;
    }

    const pdfBuffer = await ReportService.generateTenantPdfReport(tenantId);
    const filename = `costguard_report_${tenant.slug}_${new Date().toISOString().split('T')[0]}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.status(200).send(pdfBuffer);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate PDF report',
      details: err.message,
    });
  }
});

// JSON preview of report contents
reportsRouter.get('/preview', (req: Request, res: Response): void => {
  try {
    let tenantId = req.query.tenant_id as string | undefined;
    if (!tenantId) {
      tenantId = TenantRepository.ensureDefaultTenant().id;
    }

    const summary = AnalyticsService.getTenantSummary(tenantId);
    const anomalies = AnomalyService.listByTenant(tenantId, 10);

    res.status(200).json({
      success: true,
      data: {
        summary,
        anomalies,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate report preview',
      details: err.message,
    });
  }
});
