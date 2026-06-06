import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend;
  private readonly logger = new Logger(EmailService.name);
  private readonly fromEmail = 'HMS <noreply@grandissyone.com>';

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  // ── Booking Confirmation ────────────────────────────────────────
  async sendBookingConfirmation(data: {
    guestName:    string;
    guestEmail:   string;
    bookingRef:   string;
    roomNumber:   string;
    roomType:     string;
    checkIn:      string;
    checkOut:     string;
    nights:       number;
    totalAmount:  number;
    hotelName:    string;
  }) {
    try {
      await this.resend.emails.send({
        from:    this.fromEmail,
        to:      data.guestEmail,
        subject: `Booking Confirmed — ${data.bookingRef} | ${data.hotelName}`,
        html:    this.bookingConfirmationTemplate(data),
      });
      this.logger.log(`Booking confirmation sent to ${data.guestEmail}`);
    } catch (err) {
      this.logger.error(`Failed to send booking confirmation: ${err}`);
    }
  }

  // ── Check-In Notification ───────────────────────────────────────
  async sendCheckInNotification(data: {
    guestName:  string;
    guestEmail: string;
    roomNumber: string;
    checkOut:   string;
    hotelName:  string;
  }) {
    try {
      await this.resend.emails.send({
        from:    this.fromEmail,
        to:      data.guestEmail,
        subject: `Welcome to ${data.hotelName} — You Are Checked In!`,
        html:    this.checkInTemplate(data),
      });
      this.logger.log(`Check-in email sent to ${data.guestEmail}`);
    } catch (err) {
      this.logger.error(`Failed to send check-in email: ${err}`);
    }
  }

  // ── Check-Out / Receipt ─────────────────────────────────────────
  async sendReceipt(data: {
    guestName:   string;
    guestEmail:  string;
    bookingRef:  string;
    roomNumber:  string;
    checkIn:     string;
    checkOut:    string;
    nights:      number;
    amount:      number;
    method:      string;
    hotelName:   string;
  }) {
    try {
      await this.resend.emails.send({
        from:    this.fromEmail,
        to:      data.guestEmail,
        subject: `Payment Receipt — ${data.bookingRef} | ${data.hotelName}`,
        html:    this.receiptTemplate(data),
      });
      this.logger.log(`Receipt sent to ${data.guestEmail}`);
    } catch (err) {
      this.logger.error(`Failed to send receipt: ${err}`);
    }
  }

  // ── Quick Booking (No Account) ──────────────────────────────────
  async sendQuickBookingConfirmation(data: {
    guestName:   string;
    guestEmail:  string;
    guestPhone:  string;
    bookingRef:  string;
    roomNumber:  string;
    roomType:    string;
    checkIn:     string;
    checkOut:    string;
    nights:      number;
    totalAmount: number;
    hotelName:   string;
  }) {
    try {
      await this.resend.emails.send({
        from:    this.fromEmail,
        to:      data.guestEmail,
        subject: `Booking Request Received — ${data.bookingRef} | ${data.hotelName}`,
        html:    this.quickBookingTemplate(data),
      });
      this.logger.log(`Quick booking email sent to ${data.guestEmail}`);
    } catch (err) {
      this.logger.error(`Failed to send quick booking email: ${err}`);
    }
  }

  // ── Password Reset ──────────────────────────────────────────────
  async sendPasswordResetEmail(data: {
    guestName:  string;
    guestEmail: string;
    resetToken: string;
    hotelName:  string;
  }) {
    try {
      await this.resend.emails.send({
        from:    this.fromEmail,
        to:      data.guestEmail,
        subject: `Your Password Reset Code — ${data.hotelName}`,
        html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="520" cellpadding="0" cellspacing="0"
             style="background:#0B1120;border-radius:16px;overflow:hidden;border:1px solid #1e3050;">

        <!-- Header -->
        <tr>
          <td style="background:#152035;padding:28px 32px;border-bottom:3px solid #C9A84C;">
            <div style="font-size:32px;margin-bottom:8px;">🏨</div>
            <div style="color:#C9A84C;font-size:20px;font-weight:800;letter-spacing:0.5px;">
              ${data.hotelName}
            </div>
            <div style="color:#8899BB;font-size:13px;margin-top:4px;">
              Password Reset Request
            </div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="color:#F0F4FF;font-size:16px;margin:0 0 8px;">
              Hi <strong>${data.guestName}</strong>,
            </p>
            <p style="color:#8899BB;font-size:14px;line-height:22px;margin:0 0 28px;">
              We received a request to reset your password for your HMS account.
              Enter the code below in the app to set a new password.
            </p>

            <!-- Reset Code Box -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center"
                    style="background:#152035;border:2px solid #C9A84C;border-radius:12px;padding:28px;">
                  <div style="color:#8899BB;font-size:12px;font-weight:700;
                              letter-spacing:2px;margin-bottom:12px;">
                    YOUR RESET CODE
                  </div>
                  <div style="color:#C9A84C;font-size:36px;font-weight:800;
                              letter-spacing:8px;font-family:Courier New,monospace;">
                    ${data.resetToken}
                  </div>
                  <div style="color:#506070;font-size:12px;margin-top:12px;">
                    ⏱ This code expires in <strong style="color:#F0F4FF;">1 hour</strong>
                  </div>
                </td>
              </tr>
            </table>

            <!-- Instructions -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
              <tr>
                <td style="background:#0d1a2e;border-radius:10px;padding:20px;
                           border-left:3px solid #008080;">
                  <div style="color:#8899BB;font-size:13px;line-height:22px;">
                    <strong style="color:#F0F4FF;">How to reset your password:</strong><br>
                    1. Open the HMS app on your phone<br>
                    2. Tap <em>"Forgot Password"</em> on the login screen<br>
                    3. Enter your email address<br>
                    4. Enter the code above when prompted<br>
                    5. Set your new password
                  </div>
                </td>
              </tr>
            </table>

            <p style="color:#506070;font-size:12px;line-height:20px;margin-top:28px;">
              If you did not request a password reset, please ignore this email.
              Your password will remain unchanged and this code will expire automatically.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#152035;padding:20px 32px;border-top:1px solid #1e3050;">
            <div style="color:#506070;font-size:11px;text-align:center;">
              ${data.hotelName} &nbsp;•&nbsp; Victoria Island, Lagos, Nigeria<br>
              This is an automated message, please do not reply.
            </div>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
      });
      this.logger.log(`Password reset email sent to ${data.guestEmail}`);
    } catch (err) {
      this.logger.error(`Failed to send password reset email to ${data.guestEmail}: ${err}`);
      throw err; // Re-throw so auth service can log it
    }
  }

  // ══════════════════════════════════════════════════════════════
  // EMAIL TEMPLATES
  // ══════════════════════════════════════════════════════════════

  private baseTemplate(content: string) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { margin: 0; padding: 0; background: #0B1120;
               font-family: 'Helvetica Neue', Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #0D1B2E, #152035);
                  border-radius: 16px 16px 0 0; padding: 40px 32px;
                  text-align: center; border-bottom: 3px solid #C9A84C; }
        .hotel-name { color: #C9A84C; font-size: 28px; font-weight: 800;
                      margin: 12px 0 4px; letter-spacing: 1px; }
        .hotel-sub { color: #8899BB; font-size: 14px; }
        .body { background: #152035; padding: 32px;
                border-radius: 0 0 16px 16px; }
        .greeting { color: #F0F4FF; font-size: 20px; font-weight: 700;
                    margin-bottom: 8px; }
        .text { color: #8899BB; font-size: 15px; line-height: 1.6;
                margin-bottom: 20px; }
        .card { background: rgba(255,255,255,0.04);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 12px; padding: 20px; margin: 20px 0; }
        .card-title { color: #C9A84C; font-size: 12px; font-weight: 700;
                      letter-spacing: 1px; text-transform: uppercase;
                      margin-bottom: 16px; }
        .row { display: flex; justify-content: space-between;
               padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .row:last-child { border-bottom: none; }
        .row-label { color: #8899BB; font-size: 14px; }
        .row-value { color: #F0F4FF; font-size: 14px; font-weight: 600; }
        .ref-box { background: rgba(201,168,76,0.1);
                   border: 2px solid #C9A84C; border-radius: 12px;
                   padding: 20px; text-align: center; margin: 20px 0; }
        .ref-label { color: #8899BB; font-size: 12px; margin-bottom: 6px; }
        .ref-code { color: #C9A84C; font-size: 28px; font-weight: 800;
                    letter-spacing: 4px; font-family: monospace; }
        .amount { color: #22C55E; font-size: 24px; font-weight: 800; }
        .btn { display: inline-block; background: #C9A84C; color: #0B1120;
               text-decoration: none; padding: 14px 32px; border-radius: 10px;
               font-weight: 800; font-size: 15px; margin: 16px 0; }
        .footer { text-align: center; padding: 24px 0;
                  color: #506070; font-size: 12px; }
        .divider { height: 1px; background: rgba(255,255,255,0.06);
                   margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div style="font-size: 48px;">🏨</div>
          <div class="hotel-name">Grand Issyone Hotel</div>
          <div class="hotel-sub">Victoria Island, Lagos • Nigeria</div>
        </div>
        <div class="body">
          ${content}
        </div>
        <div class="footer">
          <p>Grand Issyone Hotel • Victoria Island, Lagos</p>
          <p>📞 +234 800 HMS 0001 • 🌐 info@grandissyone.com</p>
          <p style="margin-top: 8px; color: #2A3A4A;">
            This email was sent by HMS — Issyone Automation & Software
          </p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  private bookingConfirmationTemplate(data: any) {
    return this.baseTemplate(`
      <div class="greeting">Dear ${data.guestName},</div>
      <p class="text">
        Your booking at <strong style="color:#C9A84C">${data.hotelName}</strong>
        has been <strong style="color:#22C55E">confirmed</strong>.
        We look forward to welcoming you!
      </p>

      <div class="ref-box">
        <div class="ref-label">BOOKING REFERENCE</div>
        <div class="ref-code">${data.bookingRef}</div>
        <div style="color:#8899BB; font-size:12px; margin-top:8px;">
          Please keep this reference for check-in
        </div>
      </div>

      <div class="card">
        <div class="card-title">📋 Booking Details</div>
        <div class="row">
          <span class="row-label">Room</span>
          <span class="row-value">Room ${data.roomNumber} — ${data.roomType}</span>
        </div>
        <div class="row">
          <span class="row-label">Check-In</span>
          <span class="row-value">${data.checkIn}</span>
        </div>
        <div class="row">
          <span class="row-label">Check-Out</span>
          <span class="row-value">${data.checkOut}</span>
        </div>
        <div class="row">
          <span class="row-label">Duration</span>
          <span class="row-value">${data.nights} Night(s)</span>
        </div>
        <div class="row">
          <span class="row-label">Total Amount</span>
          <span class="row-value amount">₦${data.totalAmount.toLocaleString()}</span>
        </div>
      </div>

      <div class="card">
        <div class="card-title">ℹ️ Important Information</div>
        <div class="row">
          <span class="row-label">Check-In Time</span>
          <span class="row-value">2:00 PM</span>
        </div>
        <div class="row">
          <span class="row-label">Check-Out Time</span>
          <span class="row-value">12:00 PM</span>
        </div>
        <div class="row">
          <span class="row-label">Address</span>
          <span class="row-value">Victoria Island, Lagos</span>
        </div>
        <div class="row">
          <span class="row-label">Front Desk</span>
          <span class="row-value">+234 800 HMS 0001</span>
        </div>
      </div>

      <p class="text">
        Payment is due at check-in. We accept Cash, Credit Card and Cheque.
      </p>
    `);
  }

  private checkInTemplate(data: any) {
    return this.baseTemplate(`
      <div class="greeting">Welcome, ${data.guestName}! 🎉</div>
      <p class="text">
        You have successfully checked in to
        <strong style="color:#C9A84C">${data.hotelName}</strong>.
        We hope you enjoy your stay!
      </p>

      <div class="card">
        <div class="card-title">🏠 Your Room</div>
        <div class="row">
          <span class="row-label">Room Number</span>
          <span class="row-value" style="color:#C9A84C; font-size:20px; font-weight:800;">
            Room ${data.roomNumber}
          </span>
        </div>
        <div class="row">
          <span class="row-label">Check-Out Date</span>
          <span class="row-value">${data.checkOut}</span>
        </div>
        <div class="row">
          <span class="row-label">Check-Out Time</span>
          <span class="row-value">12:00 PM</span>
        </div>
      </div>

      <div class="card">
        <div class="card-title">📞 Need Help?</div>
        <div class="row">
          <span class="row-label">Front Desk</span>
          <span class="row-value">+234 800 HMS 0001</span>
        </div>
        <div class="row">
          <span class="row-label">Room Service</span>
          <span class="row-value">Dial 0 from your room</span>
        </div>
        <div class="row">
          <span class="row-label">Emergency</span>
          <span class="row-value">Dial 9 from your room</span>
        </div>
      </div>

      <p class="text" style="text-align:center; margin-top:24px;">
        Thank you for choosing ${data.hotelName}. Enjoy your stay! 🌟
      </p>
    `);
  }

  private receiptTemplate(data: any) {
    return this.baseTemplate(`
      <div class="greeting">Payment Receipt</div>
      <p class="text">
        Thank you for staying at
        <strong style="color:#C9A84C">${data.hotelName}</strong>.
        Here is your payment receipt.
      </p>

      <div class="ref-box">
        <div class="ref-label">BOOKING REFERENCE</div>
        <div class="ref-code">${data.bookingRef}</div>
      </div>

      <div class="card">
        <div class="card-title">🧾 Receipt Details</div>
        <div class="row">
          <span class="row-label">Room</span>
          <span class="row-value">Room ${data.roomNumber}</span>
        </div>
        <div class="row">
          <span class="row-label">Check-In</span>
          <span class="row-value">${data.checkIn}</span>
        </div>
        <div class="row">
          <span class="row-label">Check-Out</span>
          <span class="row-value">${data.checkOut}</span>
        </div>
        <div class="row">
          <span class="row-label">Duration</span>
          <span class="row-value">${data.nights} Night(s)</span>
        </div>
        <div class="row">
          <span class="row-label">Payment Method</span>
          <span class="row-value">${data.method}</span>
        </div>
        <div class="divider"></div>
        <div class="row">
          <span class="row-label" style="font-weight:800; color:#F0F4FF;">
            Total Paid
          </span>
          <span class="row-value amount">₦${data.amount.toLocaleString()}</span>
        </div>
      </div>

      <p class="text" style="text-align:center;">
        We hope to see you again at ${data.hotelName}! 🏨
      </p>
    `);
  }

  private quickBookingTemplate(data: any) {
    return this.baseTemplate(`
      <div class="greeting">Hello ${data.guestName},</div>
      <p class="text">
        Your booking request at
        <strong style="color:#C9A84C">${data.hotelName}</strong>
        has been received and is <strong style="color:#F59E0B">pending confirmation</strong>.
        Our team will confirm shortly.
      </p>

      <div class="ref-box">
        <div class="ref-label">YOUR BOOKING REFERENCE</div>
        <div class="ref-code">${data.bookingRef}</div>
        <div style="color:#8899BB; font-size:12px; margin-top:8px;">
          Use this reference to track your booking
        </div>
      </div>

      <div class="card">
        <div class="card-title">📋 Booking Summary</div>
        <div class="row">
          <span class="row-label">Room</span>
          <span class="row-value">Room ${data.roomNumber} — ${data.roomType}</span>
        </div>
        <div class="row">
          <span class="row-label">Check-In</span>
          <span class="row-value">${data.checkIn}</span>
        </div>
        <div class="row">
          <span class="row-label">Check-Out</span>
          <span class="row-value">${data.checkOut}</span>
        </div>
        <div class="row">
          <span class="row-label">Duration</span>
          <span class="row-value">${data.nights} Night(s)</span>
        </div>
        <div class="row">
          <span class="row-label">Estimated Total</span>
          <span class="row-value amount">₦${data.totalAmount.toLocaleString()}</span>
        </div>
        <div class="row">
          <span class="row-label">Phone</span>
          <span class="row-value">${data.guestPhone}</span>
        </div>
      </div>

      <div class="card" style="border-color: #F59E0B;">
        <div class="card-title" style="color:#F59E0B;">⚠️ Next Steps</div>
        <p style="color:#8899BB; font-size:14px; margin:0; line-height:1.6;">
          1. Our front desk will call you on <strong style="color:#F0F4FF">${data.guestPhone}</strong>
             to confirm your booking.<br><br>
          2. Please arrive by <strong style="color:#F0F4FF">2:00 PM</strong> on your check-in date.<br><br>
          3. Bring a valid ID and this booking reference.
        </p>
      </div>

      <p class="text" style="text-align:center;">
        Questions? Call us at
        <strong style="color:#C9A84C">+234 800 HMS 0001</strong>
      </p>
    `);
  }
}