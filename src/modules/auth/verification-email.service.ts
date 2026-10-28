import fs from 'fs';
import path from 'path';
import { Resend } from 'resend';
import { env } from '../../config/env';
import { buildVerificationEmail } from './verification-email.template';

export interface VerificationEmailPayload {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
    contentId: string;
  }>;
}

export interface VerificationEmailTransport {
  send(payload: VerificationEmailPayload): Promise<void>;
}

class ResendEmailTransport implements VerificationEmailTransport {
  async send(payload: VerificationEmailPayload): Promise<void> {
    if (!env.resendApiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const resend = new Resend(env.resendApiKey);
    const result = await resend.emails.send(payload);

    if (result.error) {
      throw new Error(`Resend delivery failed: ${result.error.name}`);
    }
  }
}

const noOpTestTransport: VerificationEmailTransport = {
  async send(): Promise<void> {
    return Promise.resolve();
  },
};

let transport: VerificationEmailTransport =
  env.nodeEnv === 'test' ? noOpTestTransport : new ResendEmailTransport();
let logoContent: Buffer | undefined;

function getLogoContent(): Buffer {
  if (!logoContent) {
    const logoPath = path.resolve(
      __dirname,
      '../../../assets/butterfly.png',
    );
    logoContent = fs.readFileSync(logoPath);
  }

  return logoContent;
}

export async function sendVerificationEmail(
  email: string,
  code: string,
  firstName?: string,
): Promise<void> {
  const content = buildVerificationEmail(code, firstName);
  await transport.send({
    from: env.resendFromEmail,
    to: email,
    subject: `${code} · Votre code de vérification TaskFlow`,
    html: content.html,
    text: content.text,
    attachments: [
      {
        filename: 'taskflow-butterfly.png',
        content: getLogoContent(),
        contentType: 'image/png',
        contentId: 'taskflow-logo',
      },
    ],
  });
}

export function setVerificationEmailTransportForTests(
  testTransport?: VerificationEmailTransport,
): void {
  if (env.nodeEnv === 'test') {
    transport = testTransport ?? noOpTestTransport;
  }
}
