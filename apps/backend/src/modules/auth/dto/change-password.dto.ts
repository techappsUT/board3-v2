import { IsNotEmpty, IsString, IsStrongPassword } from 'class-validator';

export class ChangePasswordDto {
  @IsString({ message: 'Current password must be a string' })
  @IsNotEmpty({ message: 'Current password is required' })
  currentPassword: string;

  @IsStrongPassword(
    {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    {
      message:
        'New password must be at least 8 characters long and contain at least 1 lowercase letter, 1 uppercase letter, 1 number, and 1 symbol',
    },
  )
  newPassword: string;
}