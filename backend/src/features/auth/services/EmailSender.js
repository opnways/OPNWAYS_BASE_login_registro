export const EmailSender = {
    async sendResetPassword(email, token) {
        // ConsoleEmailSender implementation as requested
        console.log('--------------------------------------------');
        console.log(`📧 EMAIL SENT TO: ${email}`);
        console.log('Subject: Password Reset Request');
        console.log(`Body: Use the following token to reset your password: ${token}`);
        console.log(`Link: http://localhost:5173/reset-password?token=${token}`);
        console.log('--------------------------------------------');
    },

    async sendWelcome(email) {
        console.log(`📧 WELCOME EMAIL TO: ${email}`);
    }
};
