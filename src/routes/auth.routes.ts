import { Router, Response } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validation.js';
import { AuthService } from '../services/auth.service.js';
import { UserRepository } from '../repositories/user.repository.js';
import { TenantRepository } from '../repositories/tenant.repository.js';
import { ApiKeyRepository } from '../repositories/apiKey.repository.js';
import { requireUserAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';

export const authRouter = Router();

const registerSchema = z.object({
  tenant_name: z.string().min(2, 'Tenant name must be at least 2 characters'),
  tenant_slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  monthly_budget_usd: z.number().positive().default(50.0),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const createApiKeySchema = z.object({
  name: z.string().min(2, 'Key name must be at least 2 characters').default('Production API Key'),
});

// Register new tenant + admin user
authRouter.post('/register', validateBody(registerSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { tenant_name, tenant_slug, email, password, monthly_budget_usd } = req.body;

    const existingUser = UserRepository.findByEmail(email);
    if (existingUser) {
      res.status(409).json({
        success: false,
        error: 'A user with this email already exists',
      });
      return;
    }

    const existingTenant = TenantRepository.findBySlug(tenant_slug);
    if (existingTenant) {
      res.status(409).json({
        success: false,
        error: `Tenant slug '${tenant_slug}' is already taken`,
      });
      return;
    }

    // Create tenant
    const tenant = TenantRepository.create(tenant_name, tenant_slug, monthly_budget_usd);

    // Hash password & create user
    const passwordHash = await AuthService.hashPassword(password);
    const user = UserRepository.create(tenant.id, email, passwordHash, 'admin');

    // Generate token
    const token = AuthService.generateJwt({
      userId: user.id,
      tenantId: tenant.id,
      role: user.role,
      email: user.email,
    });

    res.status(201).json({
      success: true,
      message: 'Tenant and admin user created successfully',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          monthly_budget_usd: tenant.monthly_budget_usd,
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Registration failed',
      details: err.message,
    });
  }
});

// Login user
authRouter.post('/login', validateBody(loginSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = UserRepository.findByEmail(email);
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
      return;
    }

    const isValid = await AuthService.comparePassword(password, user.password_hash);
    if (!isValid) {
      res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
      return;
    }

    const tenant = TenantRepository.findById(user.tenant_id);
    if (!tenant) {
      res.status(404).json({
        success: false,
        error: 'Associated tenant organization not found',
      });
      return;
    }

    const token = AuthService.generateJwt({
      userId: user.id,
      tenantId: tenant.id,
      role: user.role,
      email: user.email,
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          monthly_budget_usd: tenant.monthly_budget_usd,
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Login failed',
      details: err.message,
    });
  }
});

// Get current user profile
authRouter.get('/me', requireUserAuth, (req: AuthenticatedRequest, res: Response): void => {
  res.status(200).json({
    success: true,
    user: req.user,
    tenant: req.tenant,
  });
});

// Generate new API Key
authRouter.post(
  '/api-keys',
  requireUserAuth,
  validateBody(createApiKeySchema),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const { name } = req.body;
      const tenantId = req.tenant!.id;

      const { key, apiKeyRecord } = AuthService.generateApiKey(tenantId, name);

      res.status(201).json({
        success: true,
        message: 'API Key generated successfully. Store this key safely; it cannot be shown again.',
        data: {
          id: apiKeyRecord.id,
          name: apiKeyRecord.name,
          api_key: key,
          created_at: apiKeyRecord.created_at,
        },
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to generate API Key',
        details: err.message,
      });
    }
  }
);

// List API Keys
authRouter.get('/api-keys', requireUserAuth, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const keys = ApiKeyRepository.listByTenant(req.tenant!.id);
    res.status(200).json({
      success: true,
      count: keys.length,
      data: keys,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to list API keys',
      details: err.message,
    });
  }
});

// Revoke API Key
authRouter.delete('/api-keys/:id', requireUserAuth, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const keyId = String(req.params.id);
    const success = ApiKeyRepository.revoke(keyId, req.tenant!.id);

    if (!success) {
      res.status(404).json({
        success: false,
        error: 'API key not found or already revoked',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'API key revoked successfully',
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to revoke API key',
      details: err.message,
    });
  }
});
