import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      logger: true,
      debug: true,
    });
    console.log('MailService initialized with:', {
      host: 'smtp.gmail.com',
      port: 587,
      user: process.env.EMAIL_USER ? 'set' : 'NOT SET',
    });
  }

  async sendOTPEmail(email: string, otp: string) {
    console.log('Sending OTP email to:', email);
    console.log('Email user configured:', !!process.env.EMAIL_USER);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your OTP for Email Verification',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Email Verification</h2>
          <p>Your OTP is: <strong style="font-size: 24px;">${otp}</strong></p>
          <p>This OTP will expire in 10 minutes.</p>
          <p>If you did not request this, please ignore this email.</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  async sendResetPasswordEmail(email: string, resetToken: string) {
    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Password Reset</h2>
          <p>You requested to reset your password.</p>
          <p>Click the button below to create a new password:</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0;">Reset Password</a>
          <p>This link will expire in 1 hour.</p>
          <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Password reset email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  }
}
