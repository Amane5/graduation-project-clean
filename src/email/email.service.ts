import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'amany.tan2004@gmail.com',
        pass: 'opjflvrjnxawgtno',
      },
    });
  }

  async sendOtp(email: string, otp: string) {
    await this.transporter.sendMail({
      to: email,
      subject: 'Your OTP Code',
      text: `Your OTP is: ${otp}`,
    });
  }
}