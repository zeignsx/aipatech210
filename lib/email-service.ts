import { supabase } from "@/integrations/supabase/client";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  fromName?: string;
  replyTo?: string;
}

interface BookingEmailData {
  bookingId: string;
  customerName: string;
  equipment: string;
  startDate?: string;
  endDate?: string;
  amount?: number;
}

export class EmailService {
  private static instance: EmailService;
  
  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  async sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
    try {
      // Using Brevo SMTP via Edge Function
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          ...options,
          smtpConfig: {
            host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
            port: parseInt(process.env.BREVO_SMTP_PORT || '587'),
            user: process.env.BREVO_SMTP_USER || 'a89a1c001@smtp-brevo.com',
            password: process.env.BREVO_SMTP_PASSWORD,
          }
        }
      });

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Email send failed:', error);
      return { success: false, error: error.message };
    }
  }

  async sendBookingConfirmation(data: BookingEmailData): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1e3a5f, #0d2b4a); color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 10px 20px; background: #2d6a4f; color: white; text-decoration: none; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>AIPATECH Energy Limited</h2>
            <p>Booking Confirmation</p>
          </div>
          <div class="content">
            <h3>Dear ${data.customerName},</h3>
            <p>Thank you for your booking request. Here are your details:</p>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Booking ID:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">AEL-${data.bookingId.slice(0, 8).toUpperCase()}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Equipment:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${data.equipment}</td>
              </tr>
              ${data.startDate ? `
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Start Date:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${data.startDate}</td>
              </tr>
              ` : ''}
              ${data.endDate ? `
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>End Date:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${data.endDate}</td>
              </tr>
              ` : ''}
              ${data.amount ? `
              <tr>
                <td style="padding: 8px;"><strong>Amount:</strong></td>
                <td style="padding: 8px;">$${data.amount.toLocaleString()}</td>
              </tr>
              ` : ''}
            </table>
            
            <p style="margin-top: 20px;">Our team will review your request and get back to you within 24 hours.</p>
            
            <p style="margin-top: 20px;">
              <a href="https://yourdomain.com/portal" class="button">Track Your Booking</a>
            </p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} AIPATECH Energy Limited. All rights reserved.</p>
            <p>Abuja & Port Harcourt, Nigeria | info@aipatechenergy.com</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: data.customerName.includes('@') ? data.customerName : 'customer@email.com',
      subject: `Booking Confirmation - AEL-${data.bookingId.slice(0, 8).toUpperCase()}`,
      html,
    });
  }

  async sendInvoiceEmail(to: string, invoiceNumber: string, amount: number, invoiceUrl: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1e3a5f, #0d2b4a); color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .invoice-details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #2d6a4f; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>AIPATECH Energy Limited</h2>
            <p>Invoice ${invoiceNumber}</p>
          </div>
          <div class="content">
            <h3>Invoice Ready</h3>
            <p>Your invoice is now available for viewing.</p>
            
            <div class="invoice-details">
              <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
              <p><strong>Amount Due:</strong> $${amount.toLocaleString()}</p>
              <p><strong>Status:</strong> Pending Payment</p>
            </div>
            
            <p style="text-align: center;">
              <a href="${invoiceUrl}" class="button">View Invoice</a>
            </p>
            
            <p>If you have any questions, please don't hesitate to contact us.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} AIPATECH Energy Limited</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to,
      subject: `Invoice ${invoiceNumber} from AIPATECH Energy`,
      html,
    });
  }
}

export const emailService = EmailService.getInstance();