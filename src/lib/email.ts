import { Resend } from "resend";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(apiKey);
}

function getFromAddress() {
  const from = process.env.RESEND_FROM;
  if (!from) {
    throw new Error("RESEND_FROM is not configured");
  }
  return from;
}

export async function sendEmail({ to, subject, html }: SendEmailInput) {
  const resend = getResendClient();
  const from = getFromAddress();
  return resend.emails.send({
    from,
    to,
    subject,
    html,
  });
}
