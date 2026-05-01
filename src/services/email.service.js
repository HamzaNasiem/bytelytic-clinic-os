const { Resend } = require('resend');
const env = require('../config/env');

const resend = new Resend(env.resendApiKey);

class EmailService {
  /**
   * Sends the welcome email after successful onboarding.
   * 
   * @param {Object} clinic - The clinic record
   * @param {string} temporaryPassword - The password generated for the user
   */
  async sendWelcomeEmail(clinic, temporaryPassword) {
    if (!env.resendApiKey) {
      console.warn('[EmailService] RESEND_API_KEY is not set. Skipping welcome email.');
      return;
    }

    try {
      const dashboardUrl = env.frontendUrl || 'http://localhost:5173';
      
      const { data, error } = await resend.emails.send({
        from: 'Bytelytic Clinic OS <onboarding@bytelytic.com>', // MUST BE verified domain in Resend
        to: [clinic.owner_email],
        subject: `Welcome to Bytelytic Clinic OS - Your AI Receptionist is Live!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h1 style="color: #1a3a2e;">Welcome to Bytelytic, ${clinic.name}!</h1>
            <p>Your AI receptionist is fully configured and ready to take calls right now.</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0; color: #396a00;">Your Dedicated Phone Number:</h2>
              <p style="font-size: 24px; font-weight: bold; margin: 0;">${clinic.phone_number}</p>
            </div>
            
            <h3>Dashboard Login Details</h3>
            <p><strong>URL:</strong> <a href="${dashboardUrl}">${dashboardUrl}</a></p>
            <p><strong>Email:</strong> ${clinic.owner_email}</p>
            <p><strong>Password:</strong> You can log in using the password you just created.</p>
            
            <h3>Next Steps</h3>
            <ol>
              <li>Log in to your dashboard.</li>
              <li>Call your new phone number above and test your AI receptionist.</li>
              <li>Connect your Google Calendar in the Settings page.</li>
            </ol>
            
            <p>If you have any questions, reply directly to this email!</p>
            <br/>
            <p>Cheers,<br/>The Bytelytic Team</p>
          </div>
        `
      });

      if (error) {
        throw error;
      }

      console.log(`[EmailService] Welcome email sent to ${clinic.owner_email}`);
      return data;
    } catch (error) {
      console.error('[EmailService] Failed to send welcome email:', error);
      // We don't throw here to prevent the whole onboarding flow from failing just because of an email.
    }
  }
}

module.exports = new EmailService();
