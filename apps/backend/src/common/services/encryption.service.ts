import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-cbc';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly tagLength = 16; // 128 bits

  constructor(private configService: ConfigService) {}

  /**
   * Get encryption key from environment
   */
  private getEncryptionKey(keyName: string = 'ENCRYPTION_KEY'): Buffer {
    const key = this.configService.get<string>(keyName);
    if (!key) {
      throw new Error(`${keyName} environment variable is required`);
    }

    if (key.length !== this.keyLength * 2) {
      // Hex string is 2x the byte length
      throw new Error(
        `${keyName} must be ${this.keyLength * 2} characters (${this.keyLength} bytes)`
      );
    }

    return Buffer.from(key, 'hex');
  }

  /**
   * Generate a random encryption key
   */
  generateKey(): string {
    return crypto.randomBytes(this.keyLength).toString('hex');
  }

  /**
   * Encrypt data using AES-256-CBC
   */
  encrypt(data: string, keyName: string = 'ENCRYPTION_KEY'): string {
    try {
      const key = this.getEncryptionKey(keyName);
      // Using deprecated but simpler approach for now
      const cipher = crypto.createCipher(this.algorithm, key.toString('hex'));
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return encrypted;
    } catch (error) {
      this.logger.error('Encryption failed:', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt data using AES-256-CBC
   */
  decrypt(encryptedData: string, keyName: string = 'ENCRYPTION_KEY'): string {
    try {
      const key = this.getEncryptionKey(keyName);
      const decipher = crypto.createDecipher(this.algorithm, key.toString('hex'));
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      this.logger.error('Decryption failed:', error);
      throw new Error('Decryption failed');
    }
  }

  /**
   * Encrypt Terraform state data
   */
  encryptTerraformState(stateData: string): string {
    return this.encrypt(stateData, 'TERRAFORM_STATE_ENCRYPTION_KEY');
  }

  /**
   * Decrypt Terraform state data
   */
  decryptTerraformState(encryptedState: string): string {
    return this.decrypt(encryptedState, 'TERRAFORM_STATE_ENCRYPTION_KEY');
  }

  /**
   * Encrypt API keys and secrets
   */
  encryptSecret(secret: string): string {
    return this.encrypt(secret);
  }

  /**
   * Decrypt API keys and secrets
   */
  decryptSecret(encryptedSecret: string): string {
    return this.decrypt(encryptedSecret);
  }

  /**
   * Hash sensitive data (one-way)
   */
  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate secure random string
   */
  generateSecureRandom(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate API key
   */
  generateApiKey(): { key: string; hash: string } {
    const key = 'b3_' + crypto.randomBytes(32).toString('base64url');
    const hash = crypto.createHash('sha256').update(key).digest('hex');

    return { key, hash };
  }

  /**
   * Verify API key against hash
   */
  verifyApiKey(key: string, hash: string): boolean {
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(keyHash));
  }

  /**
   * Encrypt JSON data
   */
  encryptJSON(data: any, keyName: string = 'ENCRYPTION_KEY'): string {
    const jsonString = JSON.stringify(data);
    return this.encrypt(jsonString, keyName);
  }

  /**
   * Decrypt JSON data
   */
  decryptJSON<T>(encryptedData: string, keyName: string = 'ENCRYPTION_KEY'): T {
    const decryptedString = this.decrypt(encryptedData, keyName);
    return JSON.parse(decryptedString);
  }

  /**
   * Create integrity hash for data verification
   */
  createIntegrityHash(data: string): string {
    return crypto.createHmac('sha256', this.getEncryptionKey()).update(data).digest('hex');
  }

  /**
   * Verify data integrity
   */
  verifyIntegrity(data: string, expectedHash: string): boolean {
    const actualHash = this.createIntegrityHash(data);
    return crypto.timingSafeEqual(Buffer.from(expectedHash), Buffer.from(actualHash));
  }

  /**
   * Encrypt backend configuration for Terraform states
   */
  encryptBackendConfig(config: Record<string, any>): string {
    return this.encryptJSON(config, 'TERRAFORM_STATE_ENCRYPTION_KEY');
  }

  /**
   * Decrypt backend configuration for Terraform states
   */
  decryptBackendConfig(encryptedConfig: string): Record<string, any> {
    return this.decryptJSON(encryptedConfig, 'TERRAFORM_STATE_ENCRYPTION_KEY');
  }

  /**
   * Generate encryption keys for new deployment
   */
  generateKeysForDeployment(): {
    encryptionKey: string;
    terraformStateKey: string;
    sessionSecret: string;
  } {
    return {
      encryptionKey: this.generateKey(),
      terraformStateKey: this.generateKey(),
      sessionSecret: this.generateSecureRandom(64),
    };
  }
}
