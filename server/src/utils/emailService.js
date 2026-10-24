import nodemailer from 'nodemailer';

/**
 * Creates and caches the Nodemailer transporter if SMTP environment variables are present.
 */
let transporter = null;

function getTransporter() {
  if (process.env.NODE_ENV === 'test') return null;
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
  const port = process.env.SMTP_PORT || process.env.EMAIL_PORT || 587;
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASSWORD;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port: Number(port),
      secure: Number(port) === 465,
      auth: {
        user,
        pass,
      },
    });
  }

  return transporter;
}

/**
 * Send trip invitation email
 */
export async function sendTripInvitationEmail({
  to,
  inviterName,
  tripTitle,
  destination,
  inviteUrl,
  role = 'editor',
  expiresAt,
}) {
  const mailTransporter = getTransporter();
  const from = process.env.EMAIL_FROM || '"TripTally" <invites@triptally.app>';

  const subject = `${inviterName} invited you to join "${tripTitle}" on TripTally`;
  const formattedExpiry = expiresAt ? new Date(expiresAt).toLocaleDateString() : '7 days';

  const textContent = `
Hello,

${inviterName} has invited you to collaborate on the upcoming trip to ${destination}: "${tripTitle}" as an ${role}.

Accept your invitation here:
${inviteUrl}

This invitation link expires on ${formattedExpiry}.

Happy Travels,
The TripTally Team
  `.trim();

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF8F5; color: #1E293B; margin: 0; padding: 20px; }
    .card { max-width: 540px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: #1B4332; padding: 32px 24px; text-align: center; color: #FFFFFF; }
    .header h1 { margin: 0; font-size: 24px; letter-spacing: -0.5px; }
    .content { padding: 32px 24px; }
    .btn { display: inline-block; background-color: #1B4332; color: #FFFFFF !important; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 10px; text-decoration: none; margin: 20px 0; }
    .footer { padding: 16px 24px; background: #F8FAFC; text-align: center; font-size: 12px; color: #64748B; border-top: 1px solid #E2E8F0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>TripTally</h1>
    </div>
    <div class="content">
      <h2>You're Invited to Travel!</h2>
      <p><strong>${inviterName}</strong> has invited you to collaborate on <strong>${tripTitle}</strong> (${destination}) as a <strong>${role}</strong>.</p>
      <p>Join the board to organize daily itineraries, vote on stays, and tally shared expenses effortlessly.</p>
      <div style="text-align: center;">
        <a href="${inviteUrl}" class="btn">Accept Invitation</a>
      </div>
      <p style="font-size: 12px; color: #64748B;">This invitation expires on ${formattedExpiry}. If you did not expect this invitation, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      Sent with ❤️ by TripTally • Collaborative Group Travel Planning
    </div>
  </div>
</body>
</html>
  `.trim();

  if (mailTransporter) {
    try {
      const info = await mailTransporter.sendMail({
        from,
        to,
        subject,
        text: textContent,
        html: htmlContent,
      });
      return { success: true, messageId: info.messageId, provider: 'smtp' };
    } catch (err) {
      console.error('[EmailService] Failed to send email via SMTP:', err.message);
      // Fallback to local log
    }
  }

  // Local development fallback
  console.log(`\n================== [TripTally Dev Email Dispatch] ==================`);
  console.log(`📬 To: ${to}`);
  console.log(`📋 Subject: ${subject}`);
  console.log(`🔗 Invite Link: ${inviteUrl}`);
  console.log(`⏳ Expiration: ${formattedExpiry}`);
  console.log(`====================================================================\n`);

  return { success: true, provider: 'development', inviteUrl };
}

/**
 * Send upcoming trip reminder email
 */
export async function sendUpcomingTripReminderEmail({
  to,
  userName = 'Traveler',
  tripTitle,
  destination,
  startDate,
  daysUntil = 1,
  tripUrl,
}) {
  const mailTransporter = getTransporter();
  const from = process.env.EMAIL_FROM || '"TripTally" <reminders@triptally.app>';

  const subject = `Upcoming Trip Reminder: "${tripTitle}" is in ${daysUntil === 1 ? '1 day' : `${daysUntil} days`}!`;
  const formattedDate = startDate ? new Date(startDate).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }) : 'Soon';

  const textContent = `
Hello ${userName},

Get your bags ready! Your upcoming adventure to ${destination} ("${tripTitle}") is scheduled for ${formattedDate} (${daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`}).

Review your daily schedule and pack your essentials on TripTally:
${tripUrl}

Have a wonderful journey!
The TripTally Team
  `.trim();

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF8F5; color: #1E293B; margin: 0; padding: 20px; }
    .card { max-width: 540px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: #1B4332; padding: 28px 24px; text-align: center; color: #FFFFFF; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 32px 24px; }
    .btn { display: inline-block; background-color: #1B4332; color: #FFFFFF !important; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 10px; text-decoration: none; margin: 20px 0; }
    .footer { padding: 16px 24px; background: #F8FAFC; text-align: center; font-size: 12px; color: #64748B; border-top: 1px solid #E2E8F0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>TripTally</h1>
    </div>
    <div class="content">
      <h2>Pack Your Bags! 🎒</h2>
      <p>Hi <strong>${userName}</strong>,</p>
      <p>Your upcoming trip to <strong>${destination}</strong> (<em>${tripTitle}</em>) starts on <strong>${formattedDate}</strong> (${daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`})!</p>
      <p>Make sure to check off your shared packing list and review the group's daily schedule before you leave.</p>
      <div style="text-align: center;">
        <a href="${tripUrl}" class="btn">View Trip Workspace</a>
      </div>
    </div>
    <div class="footer">
      Sent with ❤️ by TripTally • Collaborative Group Travel Planning
    </div>
  </div>
</body>
</html>
  `.trim();

  if (mailTransporter) {
    try {
      const info = await mailTransporter.sendMail({
        from,
        to,
        subject,
        text: textContent,
        html: htmlContent,
      });
      return { success: true, messageId: info.messageId, provider: 'smtp' };
    } catch (err) {
      console.error('[EmailService] Failed to send trip reminder via SMTP:', err.message);
    }
  }

  // Development Fallback
  console.log(`\n================== [TripTally Dev Trip Reminder] ==================`);
  console.log(`📬 To: ${to}`);
  console.log(`📋 Subject: ${subject}`);
  console.log(`✈️ Trip: ${tripTitle} (${destination})`);
  console.log(`📅 Start Date: ${formattedDate}`);
  console.log(`🔗 Workspace: ${tripUrl}`);
  console.log(`===================================================================\n`);

  return { success: true, provider: 'development', tripUrl };
}

/**
 * Send unsettled expense reminder email
 */
export async function sendUnsettledExpenseReminderEmail({
  to,
  userName = 'Traveler',
  tripTitle,
  destination,
  amountDue,
  currency = 'INR',
  tripUrl,
}) {
  const mailTransporter = getTransporter();
  const from = process.env.EMAIL_FROM || '"TripTally" <billing@triptally.app>';

  const subject = `Pending Balance Reminder for "${tripTitle}" (${amountDue} ${currency})`;

  const textContent = `
Hello ${userName},

You have an outstanding expense balance of ${amountDue} ${currency} on your trip to ${destination} ("${tripTitle}").

Please review your group's tally and settle up with your travel companions:
${tripUrl}

Thanks,
The TripTally Team
  `.trim();

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF8F5; color: #1E293B; margin: 0; padding: 20px; }
    .card { max-width: 540px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: #E07A5F; padding: 28px 24px; text-align: center; color: #FFFFFF; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 32px 24px; }
    .amount-box { background: #FEF3C7; border: 1px solid #FCD34D; border-radius: 12px; padding: 16px; text-align: center; margin: 20px 0; }
    .amount { font-size: 24px; font-weight: bold; color: #B45309; }
    .btn { display: inline-block; background-color: #1B4332; color: #FFFFFF !important; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 10px; text-decoration: none; margin: 20px 0; }
    .footer { padding: 16px 24px; background: #F8FAFC; text-align: center; font-size: 12px; color: #64748B; border-top: 1px solid #E2E8F0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>TripTally</h1>
    </div>
    <div class="content">
      <h2>Pending Settlement Reminder 💸</h2>
      <p>Hi <strong>${userName}</strong>,</p>
      <p>This is a quick reminder regarding your shared expenses for <strong>${tripTitle}</strong>.</p>
      <div class="amount-box">
        <div style="font-size: 12px; color: #78350F; font-weight: 600;">Outstanding Balance Due:</div>
        <div class="amount">${amountDue} ${currency}</div>
      </div>
      <p>You can view who you owe and record payments directly on TripTally.</p>
      <div style="text-align: center;">
        <a href="${tripUrl}" class="btn">View & Settle Expenses</a>
      </div>
    </div>
    <div class="footer">
      Sent with ❤️ by TripTally • Collaborative Group Travel Planning
    </div>
  </div>
</body>
</html>
  `.trim();

  if (mailTransporter) {
    try {
      const info = await mailTransporter.sendMail({
        from,
        to,
        subject,
        text: textContent,
        html: htmlContent,
      });
      return { success: true, messageId: info.messageId, provider: 'smtp' };
    } catch (err) {
      console.error('[EmailService] Failed to send settlement reminder via SMTP:', err.message);
    }
  }

  // Development Fallback
  console.log(`\n================== [TripTally Dev Settlement Reminder] ==================`);
  console.log(`📬 To: ${to}`);
  console.log(`📋 Subject: ${subject}`);
  console.log(`💰 Amount Due: ${amountDue} ${currency}`);
  console.log(`✈️ Trip: ${tripTitle} (${destination})`);
  console.log(`🔗 Workspace: ${tripUrl}`);
  console.log(`========================================================================\n`);

  return { success: true, provider: 'development', tripUrl };
}

export default {
  sendTripInvitationEmail,
  sendUpcomingTripReminderEmail,
  sendUnsettledExpenseReminderEmail,
};

