import { Request, Response, NextFunction } from 'express';
import { AuthService, TokenPayload } from '../services/auth.service.js';
import { TenantRepository } from '../repositories/tenant.repository.js';
import { Tenant } from '../types/index.js';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
  tenant?: Tenant;
  apiKeyId?: string;
}

export function requireUserAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Missing or invalid Bearer token',
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = AuthService.verifyJwt(token);
    req.user = payload;

    const tenant = TenantRepository.findById(payload.tenantId);
    if (!tenant) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: Associated tenant not found',
      });
      return;
    }
    req.tenant = tenant;
    next();
  } catch (err: any) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid or expired token',
      details: err.message,
    });
  }
}

export function requireAnyAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const apiKeyHeader = req.headers['x-api-key'] as string | undefined;
  const authHeader = req.headers.authorization;

  // 1. Try API Key
  if (apiKeyHeader) {
    const apiKeyRecord = AuthService.verifyApiKey(apiKeyHeader);
    if (!apiKeyRecord) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: Invalid or revoked API key',
      });
      return;
    }

    const tenant = TenantRepository.findById(apiKeyRecord.tenant_id);
    if (!tenant) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: Tenant not found for API key',
      });
      return;
    }

    req.tenant = tenant;
    req.apiKeyId = apiKeyRecord.id;
    next();
    return;
  }

  // 2. Try Bearer JWT
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return requireUserAuth(req, res, next);
  }

  res.status(401).json({
    success: false,
    error: 'Unauthorized: Provide an x-api-key header or Authorization: Bearer <token>',
  });
}
