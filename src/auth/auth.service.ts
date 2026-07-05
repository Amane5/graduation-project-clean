import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { prisma } from 'src/lib/prisma';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '@/email/email.service';
import { UserMapper } from '@/common/mappers/user.mapper';

@Injectable()
export class AuthService {
    constructor(
        private jwtService: JwtService,
        private emailService: EmailService){}

    //register
    async register(dto: RegisterDto){
        const {email , password , confirmPassword ,username, firstName , lastName} = dto
        const normalizedEmail = email.toLowerCase()
        const existingUser = await prisma.user.findUnique({
            where: {email: normalizedEmail}
        })
        if(existingUser){
            throw new UnprocessableEntityException({
                message: 'Email already exists',
                error: 'EMAIL_EXISTS'
              });
        }

        const existingUsername = await prisma.user.findUnique({
            where: { username }
        });
        
        if (existingUsername) {
            throw new UnprocessableEntityException({
                message: 'Username already exists',
                error: 'USERNAME_EXISTS'
              });;
        }
        //Hash password;
        const hashedPassword = await bcrypt.hash(password, 10)

        //Create user
        
        const newUser = await prisma.user.create ({
            data: {
                email:normalizedEmail,
                password: hashedPassword,
                username,
                firstName,
                lastName,
                isVerified: false,
                type: 'parent',
            }
           
        })

        //Generate otp
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpRecord ={
            userId:newUser.id,
            otp:otpCode,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
        }
        await prisma.otp.create({
            data:{
                userId: newUser.id,
                otp: otpCode,
                type: 'verify',
                expiresAt: new Date(Date.now() +5 * 60 * 1000)
            }
        })
        await this.emailService.sendOtp(email, otpCode)
        return {
            message: 'check your email',
            user: UserMapper.toResponse(newUser)
        }
    }

    async verifyEmail(dto:VerifyEmailDto){
        const {email , otp} = dto
        const user= await prisma.user.findUnique({
            where : {email : email.toLowerCase()}
        })
        if(!user){
            throw new NotFoundException({
                message: 'User not found',
                error: 'USER_NOT_FOUND'
              });
        }
        if (user.isVerified) {
            throw new ConflictException({
                message: 'Email already verifyed',
                error: 'EMAIL_ALEARDY_VERIFYED'
              });;
        }
        const otpRecord = await prisma.otp.findFirst({
            where:{userId : user.id, type: 'verify'}
        })
        if(!otpRecord){
            throw new NotFoundException({
                message: 'OTP not found',
                error: 'OTP_NOT_FOUND'
              });
        }
        if(otpRecord.otp !== otp){
            throw new BadRequestException({
                message: 'Invalid otp',
                error: 'INVALID_OTP'
              });
        }
        if(otpRecord.expiresAt.getTime() < Date.now()){
            throw new BadRequestException({
                message: 'OTP expired',
                error: 'OTP_EXPIRED'
              });
        }
        await prisma.user.update({
            where:{id: user.id},
            data: {isVerified: true}
        })
    
        await prisma.otp.deleteMany({
            where: {
                userId: user.id,
                type: 'verify'
            }
        });
        return{
            message: 'Email Verifyed successfuly',
            userId : user.id
        }
    }

    async resendOtp(dto:ResendOtpDto){
        const {email} = dto
        const user = await prisma.user.findUnique({
            where : {email : email.toLowerCase()}
        })
        if(!user){
            throw new NotFoundException({
                message: 'User not found',
                error: 'USER_NOT_FOUND'
              });
        }
        if (user.isVerified) {
            throw new ConflictException({
                message: 'Email already verifyed',
                error: 'EMAIL_ALREADY_VERIFYED'
              });;
        }

        const existingOtp = await prisma.otp.findFirst({
            where : {userId : user.id}
        })
        if(existingOtp){
            await prisma.otp.deleteMany({
                where:{userId : user.id}
            })
        }
        const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
        await prisma.otp.create({
            data:{
                userId: user.id,
                otp:newOtp,
                type: 'verify',
                expiresAt: new Date(Date.now() + 5 * 60 * 1000)
            }
        })
        await this.emailService.sendOtp(email, newOtp)
        return{
            message: "otp resent"
        }
    }

    //Login
    async login(dto: LoginDto) {
        const { username, password } = dto;

        const user = await prisma.user.findUnique({
            where: { username: username }
        });

        if (!user) {
            throw new UnauthorizedException({
                message: 'Invalid username or password',
                error: 'INVALID_USERNAME_OR_PASSWORD'
              });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            throw new UnauthorizedException({
                message: 'Invalid username or password',
                error: 'INVALID_USERNAME_OR_PASSWORD'
              });
               }

        const payload = {
            sub: user?.id, 
            username:user?.username,
            type:user?.type
        }
        const token = this.jwtService.sign(payload)

        if (user.type === 'parent' && !user.isVerified) {
            throw new ForbiddenException({
                message: 'Verify your email first',
                error: 'EMAIL_NOT_VERIFIED'
              });
        }

        return {
            message: 'Login successful',
            accessToken: token,
            user: UserMapper.toResponse(user)
        }
    }

    //Forgot password
    async forgotPassword(dto:ForgotPasswordDto){
        const {email} = dto
        const user = await prisma.user.findUnique({
            where : {email : email.toLowerCase()}
        })
        if(!user){
            throw new NotFoundException({
                message: 'User not found',
                error: 'USER_NOT_FOUND'
              });
        }

        //delete old otp if exists
        await prisma.otp.deleteMany({
            where: { userId: user.id, type: 'reset' }
        });

        //generate new otp 
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
        await prisma.otp.create({
            data:{
                userId: user?.id,
                otp:otpCode,
                type: 'reset',
                expiresAt : new Date(Date.now() + 5 * 60 *1000)
            }
        })
        await this.emailService.sendOtp(email, otpCode)
        return {
            message: 'Reset otp sent'
        }
    }

    async resetPassword(dto : ResetPasswordDto) {
        const { email, otp , newPassword} = dto
        const user = await prisma.user.findUnique({
            where: {email: email.toLowerCase()}
        })
        if(!user){
            throw new NotFoundException({
                message: 'User not found',
                error: 'USER_NOT_FOUND'
              });        }
        const otpRecord = await prisma.otp.findFirst({
            where:{userId: user.id, type: 'reset'}
        })
        if(!otpRecord){
            throw new NotFoundException({
                message: 'OTP not found',
                error: 'OTP_NOT_FOUND'
              });        }
        if(otpRecord.otp !== otp){
            throw new BadRequestException({
                message: 'Invalid otp',
                error: 'INVALID_OTP'
              });        }
        if (otpRecord.expiresAt.getTime() < Date.now()) {
            throw new BadRequestException({
                message: 'OTP expired',
                error: 'OTP_expired'
              });        }

        //hash new password
        const hashedPassword = await bcrypt.hash(newPassword , 10)
        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword }
        });

        await prisma.otp.deleteMany({
            where:{userId : user.id, type: 'reset'}
        })

        return{
            message: 'Password reset successful'
        }
    }

    async logout(req: any) {
        const authHeader = req.headers.authorization;
        const token = authHeader.split(' ')[1];
      
        const decoded = this.jwtService.decode(token);
      
        await prisma.blacklistedToken.create({
          data: {
            token,
            expiresAt: new Date(decoded.exp * 1000),
          },
        });
      
        return {
          message: 'Logged out successfully',
        };
    }

    async SaveFcmToken(userId : number , fcmToken:string){
        await prisma.user.update({
            where:{id:userId},
            data:{fcmToken}
        })
        return{message:'fcm token saved'}
    }
}
