import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class AuthResponseDto {
  @IsString()
  accessToken: string;

  @IsString()
  refreshToken: string;

  @IsObject()
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    username?: string;
    mfaEnabled: boolean;
    isEmailVerified: boolean;
  };

  @IsOptional()
  @IsBoolean()
  requiresMfa?: boolean;
}