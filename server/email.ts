// server/email.ts
import nodemailer from "nodemailer";
import { env } from "./env";

const transporter = nodemailer.createTransport({
  host: env.SMTP.host,
  port: env.SMTP.port,
  secure: env.SMTP.secure,
  auth: { user: env.SMTP.user, pass: env.SMTP.pass },
});

type SendArgs = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
};

export async function sendEmail({ to, subject, html, text }: SendArgs) {
  return transporter.sendMail({
    from: env.SMTP.from,
    to,
    subject,
    text,
    html,
  });
}
