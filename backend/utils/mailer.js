const nodemailer = require("nodemailer");

let transporter;

function parseSecureValue() {
  return String(process.env.SMTP_SECURE || "").toLowerCase() === "true";
}

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: parseSecureValue(),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  return transporter;
}

function buildFromAddress() {
  const fromEmail = process.env.MAIL_FROM || process.env.SMTP_USER;
  const fromName = process.env.MAIL_FROM_NAME || "Tiem Do Trang Tri Noi That";

  return `"${fromName}" <${fromEmail}>`;
}

async function sendMail({ to, subject, html, text }) {
  return getTransporter().sendMail({
    from: buildFromAddress(),
    to,
    subject,
    html,
    text
  });
}

module.exports = {
  sendMail
};
