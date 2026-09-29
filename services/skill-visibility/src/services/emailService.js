import nodemailer from "nodemailer";
export async function sendOtpEmail({ to, otp }) {
  if (!process.env.SMTP_HOST) throw new Error("SMTP_HOST is required; OTPs are never logged");
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    ...(process.env.SMTP_USER ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } } : {}),
  });
  await transporter.sendMail({ from: process.env.SMTP_FROM || "no-reply@example.test", to,
    subject: "Your One Community verification code",
    text: `Your registration code is: ${otp}\nIt expires in 15 minutes.` });
}
