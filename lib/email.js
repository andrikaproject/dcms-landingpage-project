import nodemailer from "nodemailer";

function getSmtpConfig() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) return null;

    return {
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
    };
}

export async function sendEmail({ to, subject, text, html }) {
    const config = getSmtpConfig();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@dcms.local";

    if (!config) {
        if (process.env.NODE_ENV !== "production") {
            console.info("[email:dev]", { to, subject, text });
            return { skipped: true };
        }

        throw new Error("SMTP is not configured");
    }

    const transporter = nodemailer.createTransport(config);

    return transporter.sendMail({
        from,
        to,
        subject,
        text,
        html,
    });
}

export async function sendPasswordResetEmail({ to, resetUrl, expiresInMinutes = 60 }) {
    const subject = "Reset Password DCMS";
    const text = [
        "Halo,",
        "",
        "Kami menerima permintaan reset password untuk akun DCMS kamu.",
        `Klik link berikut untuk membuat password baru. Link berlaku ${expiresInMinutes} menit:`,
        resetUrl,
        "",
        "Jika kamu tidak meminta reset password, abaikan email ini.",
        "",
        "DCMS",
    ].join("\n");

    const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #181d27;">
            <h2>Reset Password DCMS</h2>
            <p>Kami menerima permintaan reset password untuk akun DCMS kamu.</p>
            <p>Link ini berlaku <strong>${expiresInMinutes} menit</strong>.</p>
            <p>
                <a href="${resetUrl}" style="display: inline-block; background: #B7FB5B; color: #111315; padding: 12px 18px; border-radius: 8px; font-weight: 700; text-decoration: none;">
                    Buat Password Baru
                </a>
            </p>
            <p>Jika tombol tidak bisa dibuka, salin link ini:</p>
            <p style="word-break: break-all;">${resetUrl}</p>
            <p>Jika kamu tidak meminta reset password, abaikan email ini.</p>
        </div>
    `;

    return sendEmail({ to, subject, text, html });
}
