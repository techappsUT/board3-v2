import { IsNotEmpty, IsString } from 'class-validator';

export class EnableMfaDto {
  @IsString({ message: 'MFA token must be a string' })
  @IsNotEmpty({ message: 'MFA token is required' })
  token: string;
}

export class DisableMfaDto {
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  password: string;

  @IsString({ message: 'MFA token must be a string' })
  @IsNotEmpty({ message: 'MFA token is required' })
  token: string;
}

export class VerifyMfaDto {
  @IsString({ message: 'MFA token must be a string' })
  @IsNotEmpty({ message: 'MFA token is required' })
  token: string;
}

export class MfaSetupResponseDto {
  secret: string;
  qrCodeUrl: string;
  manualEntryKey: string;
}