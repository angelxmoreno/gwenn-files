import nodemailer from 'nodemailer'
import type { Bindings } from '../index'

function createTransporter(env: Bindings) {
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: parseInt(env.SMTP_PORT, 10),
    secure: parseInt(env.SMTP_PORT, 10) === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  })
}

export async function sendInviteEmail(
  env: Bindings,
  to: string,
  projectName: string,
  inviteToken: string,
  appUrl: string,
): Promise<void> {
  const transporter = createTransporter(env)
  const inviteUrl = `${appUrl}/invites/${inviteToken}`

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: `You've been invited to join "${projectName}" on Gwenn`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You've been invited to collaborate</h2>
        <p>You've been invited to join the project <strong>${projectName}</strong> on Gwenn Files.</p>
        <p>
          <a href="${inviteUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">
            Accept Invitation
          </a>
        </p>
        <p style="color: #888; font-size: 14px;">This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.</p>
      </div>
    `,
  })
}

export async function sendNotificationEmail(
  env: Bindings,
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const transporter = createTransporter(env)

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject,
    html,
  })
}
