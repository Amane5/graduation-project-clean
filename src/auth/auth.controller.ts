import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt.guard';
import { SaveFcmDto } from './dto/save-fcm.dto';

type AuthenticatedRequest = {
    user: {
        sub: number;
    };
};

@Controller('auth')
export class AuthController{
    constructor(private authService:AuthService){}
    //register
    @Post('register')
    register(@Body() dto:RegisterDto){
    return this.authService.register(dto)
    }

    @HttpCode(200)
    @Post('verify-email')
    verify(@Body() dto:VerifyEmailDto){
        return this.authService.verifyEmail(dto)
    }

    @HttpCode(200)
    @Post('resend-otp')
    resendOtp(@Body() dto:ResendOtpDto){
        return this.authService.resendOtp(dto)
    }

    //Login
    @HttpCode(200)
    @Post('login')
    login(@Body() dto:LoginDto){
    return this.authService.login(dto)
    }

    //Forgot password
    @HttpCode(200)
    @Post('forgot-password')
    forgotPassword(@Body() dto:ForgotPasswordDto){
        return this.authService.forgotPassword(dto)
    }
    
    @HttpCode(200)
    @Post('reset-password')
    resetPassword(@Body() dto:ResetPasswordDto){
        return this.authService.resetPassword(dto)
    }

    @HttpCode(200)
    @Post('logout')
    @UseGuards(JwtAuthGuard)
    logout(@Req() req: AuthenticatedRequest){
        return this.authService.logout(req)
    }

    @Post('save-fcm')
    @UseGuards(JwtAuthGuard)
    async saveFcm(@Body() body:SaveFcmDto, @Req() req: AuthenticatedRequest){
        return this.authService.SaveFcmToken(req.user.sub, body.fcmToken)
    }
}
