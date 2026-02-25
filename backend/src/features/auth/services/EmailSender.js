import nodemailer from 'nodemailer';
import { Resend } from 'resend';

// MailHog / SMTP Transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'mailhog',
    port: parseInt(process.env.SMTP_PORT || '1025'),
    secure: false, // true for 465, false for other ports
    auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    } : undefined
});

// Resend Client
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export const EmailSender = {
    async sendResetPassword(email, token) {
        const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
        const isDev = process.env.NODE_ENV === 'development';

        // Dev/MailHog Priority in Development
        if (isDev) {
            try {
                await transporter.sendMail({
                    from: process.env.EMAIL_FROM || '"Auth Starter Kit" <noreply@example.com>',
                    to: email,
                    subject: 'Password Reset Request',
                    html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
                <h2 style="color: #0f172a;">Recuperar cuenta</h2>
                <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente botón para continuar:</p>
                <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #0f172a; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0;">Restablecer Contraseña</a>
                <p>O copia y pega el siguiente enlace en tu navegador:</p>
                <p style="color: #64748b; font-size: 14px;">${resetLink}</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="font-size: 12px; color: #94a3b8;">Si no has solicitado este cambio, puedes ignorar este correo.</p>
              </div>
            `
                });
                return;
            } catch (error) {
                console.error('Error sending email via MailHog:', error);
                return;
            }
        }

        // Production/Resend Priority
        if (resend) {
            try {
                await resend.emails.send({
                    from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
                    to: email,
                    subject: 'Password Reset Request',
                    html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
              <h2 style="color: #0f172a;">Recuperar cuenta</h2>
              <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente botón para continuar:</p>
              <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #0f172a; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0;">Restablecer Contraseña</a>
              <p>O copia y pega el siguiente enlace en tu navegador:</p>
              <p style="color: #64748b; font-size: 14px;">${resetLink}</p>
            </div>
          `
                });
                console.log(`✅ Email sent via Resend to: ${email}`);
            } catch (error) {
                console.error('Error sending email via Resend:', error);
            }
        }
    },

    async sendWelcome(email) {
        console.log(`📧 WELCOME EMAIL TO: ${email}`);
    }
};
