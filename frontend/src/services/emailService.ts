export interface EmailPayload {
  to_email: string;
  to_name: string;
  subject: string;
  message: string;
}

import { API_BASE } from '@/lib/utils';

const EMAIL_API = API_BASE || '';

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  try {
    const res = await fetch(`${EMAIL_API}/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      console.log(`[EMAIL] Sent -> ${payload.to_email}`);
      return true;
    }
    const data = await res.json();
    console.warn(`[EMAIL] Backend returned error: ${data.error}`);
    return false;
  } catch (err) {
    console.warn(`[EMAIL] Backend unreachable (${EMAIL_API}) — is the email server running?`);
    console.log(`[EMAIL FALLBACK] To: ${payload.to_name} <${payload.to_email}>`);
    console.log(`[EMAIL FALLBACK] Subject: ${payload.subject}`);
    console.log(`[EMAIL FALLBACK] Body: ${payload.message}`);
    return false;
  }
}
