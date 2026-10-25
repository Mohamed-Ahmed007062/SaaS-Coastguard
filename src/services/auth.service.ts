import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config/index.js';
import { UserRepository } from '../repositories/user.repository.js';
import { TenantRepository } from '../repositories/tenant.repository.js';
import { ApiKeyRepository } from '../repositories/apiKey.repository.js';
import { User, Tenant, ApiKey } from '../types/index.js';

export interface TokenPayload {
  userId: string;
  tenantId: string;
  role: 'admin' | 'member';
  email: string;
}

export class AuthService {
  public static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  public static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  public static generateJwt(payload: TokenPayload): string {
    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn as any,
    });
  }

  public static verifyJwt(token: string): TokenPayload {
    return jwt.verify(token, config.jwtSecret) as TokenPayload;
  }

  public static hashApiKey(rawKey: string): string {
    return crypto.createHash('sha256').update(rawKey).digest('hex');
  }

  public static generateApiKey(
    tenantId: string,
    name: string
  ): { key: string; apiKeyRecord: ApiKey } {
    const randomHex = crypto.randomBytes(24).toString('hex');
    const rawKey = `cg_live_${randomHex}`;
    const keyHash = this.hashApiKey(rawKey);

    const apiKeyRecord = ApiKeyRepository.create(tenantId, name, keyHash);
    return { key: rawKey, apiKeyRecord };
  }

  public static verifyApiKey(rawKey: string): ApiKey | null {
    if (!rawKey.startsWith('cg_live_')) {
      return null;
    }
    const hash = this.hashApiKey(rawKey);
    return ApiKeyRepository.findByHash(hash);
  }
}
