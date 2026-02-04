import { config } from '../config/env';
import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  body: string;
  link?: string;
}

/**
 * Email service that sends emails via SMTP when credentials are provided,
 * otherwise logs to console.
 */
export class EmailService {
  private transporter?: nodemailer.Transporter;
  private useSmtp: boolean;

  constructor() {
    // Check if SMTP credentials are configured
    this.useSmtp = !!(config.smtp.host && config.smtp.user && config.smtp.pass);

    if (this.useSmtp) {
      this.transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: config.smtp.user,
          pass: config.smtp.pass,
        },
      });
      console.log('✓ Email service initialized with SMTP credentials');
    } else {
      console.log('⚠ Email service running in console-only mode (no SMTP credentials)');
    }
  }

  /**
   * Send email via SMTP or log to console
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    const emailLog = {
      To: options.to,
      Subject: options.subject,
      Body: options.body,
      Link: options.link || 'N/A',
      Timestamp: new Date().toISOString(),
    };

    if (this.useSmtp && this.transporter) {
      try {
        await this.transporter.sendMail({
          from: config.smtp.user,
          to: options.to,
          subject: options.subject,
          html: options.body,
        });
        console.log(`✓ Email sent to ${options.to}: ${options.subject}`);
        // Also log the link for development convenience
        if (options.link) {
          console.log(`   Link: ${options.link}`);
        }
      } catch (error) {
        console.error('✗ Failed to send email:', error);
        // Fall back to console logging
        console.log('\n========== EMAIL LOG (FALLBACK) ==========');
        console.log(JSON.stringify(emailLog, null, 2));
        console.log('==========================================\n');
      }
    } else {
      // Console-only mode
      console.log('\n========== EMAIL LOG ==========');
      console.log(JSON.stringify(emailLog, null, 2));
      console.log('================================\n');
    }
  }

  /**
   * Send email confirmation
   */
  async sendEmailConfirmation(to: string, token: string): Promise<void> {
    const confirmLink = `http://localhost:5173/confirm-email?token=${token}`;
    const body = `
      <h2>Welcome to Schedula!</h2>
      <p>Please confirm your email address by clicking the link below:</p>
      <p><a href="${confirmLink}">${confirmLink}</a></p>
      <p>This link will expire in 24 hours.</p>
    `;

    await this.sendEmail({
      to,
      subject: 'Confirm your Schedula account',
      body,
      link: confirmLink,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(to: string, token: string): Promise<void> {
    const resetLink = `http://localhost:5173/reset-password?token=${token}`;
    const body = `
      <h2>Password Reset Request</h2>
      <p>You requested to reset your password. Click the link below to proceed:</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;

    await this.sendEmail({
      to,
      subject: 'Reset your Schedula password',
      body,
      link: resetLink,
    });
  }
}

export const emailService = new EmailService();
