import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Req,
  Res,
  Query,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  UpdateProfileDto,
} from '../dto/password.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthResponse } from '../interfaces/auth.interface';

class RefreshDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  refreshToken?: string;
}

class LogoutDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

const REFRESH_COOKIE = 'tolongin_rt';
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7d

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    path: '/api/auth',
  });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user (BUYER or SELLER)' })
  @ApiResponse({
    status: 201,
    description: 'User created. Refresh token set as httpOnly cookie.',
  })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const r = await this.authService.register(dto);
    setRefreshCookie(res, r.refreshToken);
    return r;
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email & password' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const r = await this.authService.login(dto);
    setRefreshCookie(res, r.refreshToken);
    return r;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Exchange refresh token for new access+refresh pair',
  })
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const cookieToken = (req as any).cookies?.[REFRESH_COOKIE];
    const token = cookieToken || dto?.refreshToken;
    const r = await this.authService.refresh(token);
    setRefreshCookie(res, r.refreshToken);
    return r;
  }

  @ApiBearerAuth('jwt')
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout, blacklist tokens, clears refresh cookie' })
  async logout(
    @Headers('authorization') auth: string | undefined,
    @Body() body: LogoutDto | undefined,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : undefined;
    const cookieToken = (req as any).cookies?.[REFRESH_COOKIE];
    const refreshToken = cookieToken || body?.refreshToken;
    const result = await this.authService.logout(token, refreshToken);
    clearRefreshCookie(res);
    return result;
  }

  @ApiBearerAuth('jwt')
  @Get('profile')
  @ApiOperation({ summary: 'Get authenticated user profile' })
  getProfile(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }

  @ApiBearerAuth('jwt')
  @Put('profile')
  @ApiOperation({ summary: 'Update profile' })
  updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(userId, dto);
  }

  @ApiBearerAuth('jwt')
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password (requires old password)' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(userId, dto);
    return { message: 'Password berhasil diubah' };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);
    return { message: 'Password berhasil direset' };
  }

  @ApiBearerAuth('jwt')
  @Post('send-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kirim ulang email verifikasi' })
  async sendVerification(@CurrentUser('id') userId: string) {
    return this.authService.sendVerificationEmail(userId);
  }

  @Public()
  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verifikasi email dengan token OTP' })
  async verifyEmail(@Query('token') token: string) {
    const result = await this.authService.verifyEmail(token);
    return result;
  }
}
