import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Quote } from '../entities/quote.entity';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST', 'smtp.gmail.com'),
      port: this.configService.get<number>('SMTP_PORT', 587),
      secure: false,
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });
  }

  async sendQuoteEmail(
    recipientEmail: string,
    quote: Quote,
    pdfBuffer: Buffer,
    personalNote?: string,
  ): Promise<void> {
    const orgName = quote.organization?.name || 'RouteCraft DMC';
    const quoteName = quote.name;
    const clientTotal = Number(quote.clientTotal) || 0;
    const filename = quoteName.replace(/\s+/g, '-').replace(/[—–]/g, '-').replace(/[^\w-]/g, '') + '.pdf';

    const highlights = (quote.itinerary || [])
      .flatMap((day: any) => (day.services || []).map((s: any) => s.serviceName))
      .slice(0, 4);

    const htmlBody = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #6C5CE7; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">${orgName}</h1>
          <p style="margin: 5px 0 0; opacity: 0.8;">Travel Quote</p>
        </div>
        <div style="padding: 25px; background: #fff; border: 1px solid #E8E6F0; border-top: none;">
          <h2 style="color: #1A1A2E; margin-top: 0;">${quoteName}</h2>
          <p style="color: #6B7280;">
            ${(quote.destinations || []).join(', ')} |
            ${quote.adultsCount || 0} adults${quote.childrenCount ? ', ' + quote.childrenCount + ' children' : ''}
          </p>
          ${highlights.length > 0 ? `
            <h3 style="color: #6C5CE7; font-size: 14px; margin-bottom: 8px;">Highlights</h3>
            <ul style="color: #6B7280; padding-left: 20px;">
              ${highlights.map((h: string) => `<li>${h}</li>`).join('')}
            </ul>
          ` : ''}
          <div style="background: #F0EDFF; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <p style="margin: 0; color: #6B7280; font-size: 13px;">${quote.pricingFormat === 'full_package' ? 'Package Price' : 'Total'}</p>
            <p style="margin: 5px 0 0; color: #6C5CE7; font-size: 28px; font-weight: bold;">$${clientTotal.toFixed(2)}</p>
          </div>
          ${personalNote ? `
            <div style="background: #F5F5F7; padding: 12px; border-radius: 6px; margin-top: 15px;">
              <p style="margin: 0; color: #6B7280; font-size: 13px; font-style: italic;">"${personalNote}"</p>
            </div>
          ` : ''}
          <p style="color: #9CA3AF; font-size: 12px; margin-top: 20px;">
            Please find the detailed quote attached as a PDF.
            ${quote.validUntil ? `This quote is valid until ${new Date(quote.validUntil).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.` : ''}
          </p>
        </div>
        <div style="padding: 15px; text-align: center; color: #9CA3AF; font-size: 11px;">
          ${orgName} | Powered by RouteCraft
        </div>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: this.configService.get('SMTP_FROM', 'RouteCraft <noreply@routecraft.com>'),
        to: recipientEmail,
        subject: `${orgName} — ${quoteName}`,
        html: htmlBody,
        attachments: [
          {
            filename,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });
      this.logger.log(`Quote email sent to ${recipientEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send quote email: ${error.message}`);
      // Don't throw — email failure shouldn't block the API response
    }
  }

  async sendInviteEmail(
    recipientEmail: string,
    name: string,
    role: string,
    orgName: string,
    tempPassword: string,
  ): Promise<void> {
    const roleLabel = role === 'ORG_ADMIN' ? 'Org Admin' : 'Agent';
    const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3000');

    const htmlBody = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <div style="background: #6C5CE7; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">RouteCraft</h1>
        </div>
        <div style="padding: 25px; background: #fff; border: 1px solid #E8E6F0; border-top: none;">
          <h2 style="color: #1A1A2E; margin-top: 0;">Welcome, ${name}!</h2>
          <p style="color: #6B7280;">
            You've been invited to join <strong>${orgName}</strong> on RouteCraft as a <strong>${roleLabel}</strong>.
          </p>
          <div style="background: #F5F5F7; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0 0 8px; color: #6B7280; font-size: 13px;">Your login credentials:</p>
            <p style="margin: 0; font-family: monospace;"><strong>Email:</strong> ${recipientEmail}</p>
            <p style="margin: 5px 0 0; font-family: monospace;"><strong>Password:</strong> ${tempPassword}</p>
          </div>
          <a href="${frontendUrl}/login" style="display: inline-block; background: #6C5CE7; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Get Started
          </a>
          <p style="color: #9CA3AF; font-size: 12px; margin-top: 20px;">
            You'll be asked to set a new password on your first login.
          </p>
        </div>
        <div style="padding: 15px; text-align: center; color: #9CA3AF; font-size: 11px;">
          RouteCraft — Where AI Meets Travel
        </div>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: this.configService.get('SMTP_FROM', 'RouteCraft <noreply@routecraft.com>'),
        to: recipientEmail,
        subject: "You've been invited to RouteCraft",
        html: htmlBody,
      });
      this.logger.log(`Invite email sent to ${recipientEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send invite email: ${error.message}`);
    }
  }

  async sendReminderEmail(
    recipientEmail: string,
    name: string,
    orgName: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3000');

    const htmlBody = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <div style="background: #6C5CE7; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">RouteCraft</h1>
        </div>
        <div style="padding: 25px; background: #fff; border: 1px solid #E8E6F0; border-top: none;">
          <h2 style="color: #1A1A2E; margin-top: 0;">Reminder: Set Up Your Account</h2>
          <p style="color: #6B7280;">
            Hi ${name}, this is a reminder that your account for <strong>${orgName}</strong> on RouteCraft is waiting for you to set up.
          </p>
          <a href="${frontendUrl}/login" style="display: inline-block; background: #6C5CE7; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Log In Now
          </a>
        </div>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: this.configService.get('SMTP_FROM', 'RouteCraft <noreply@routecraft.com>'),
        to: recipientEmail,
        subject: `Reminder: Set up your RouteCraft account for ${orgName}`,
        html: htmlBody,
      });
      this.logger.log(`Reminder email sent to ${recipientEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send reminder email: ${error.message}`);
    }
  }
}
