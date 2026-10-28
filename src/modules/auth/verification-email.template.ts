import { env } from '../../config/env';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export interface VerificationEmailContent {
  html: string;
  text: string;
}

export function buildVerificationEmail(
  code: string,
  firstName?: string,
): VerificationEmailContent {
  const safeName = firstName ? escapeHtml(firstName) : '';
  const greeting = safeName ? `Bonjour ${safeName},` : 'Bonjour,';
  const textGreeting = firstName ? `Bonjour ${firstName},` : 'Bonjour,';
  const digits = [...code]
    .map(
      (digit) => `
        <td width="25%" align="center" style="padding:0 4px;">
          <div style="background:#ffffff;border:1.5px solid #e58bbd;border-radius:12px;color:#30253f;font-family:Manrope,'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:30px;font-weight:800;line-height:56px;height:56px;letter-spacing:2px;">${digit}</div>
        </td>`,
    )
    .join('');

  return {
    html: `<!doctype html>
<html lang="fr">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#fffaff;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#fffaff;">
      <tr><td align="center" style="padding:32px 12px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;background:#ffffff;border:1px solid #f0e6f5;border-radius:24px;box-shadow:0 15px 45px rgba(111,71,112,.08);">
          <tr><td style="padding:36px 40px;font-family:Manrope,'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td width="54" valign="middle"><img src="cid:taskflow-logo" alt="TaskFlow" width="42" height="42" style="display:block;width:42px;height:42px;border:0;border-radius:8px;object-fit:cover;"></td>
                <td valign="middle" style="font-size:24px;font-weight:800;color:#30253f;">Task<span style="color:#e58bbd;">Flow</span></td>
              </tr>
            </table>
            <div style="height:1px;background:#f1e8f5;margin:24px 0 28px;"></div>
            <div style="width:48px;height:48px;line-height:48px;text-align:center;border-radius:16px;background:#fbecf6;color:#c16eaa;font-size:23px;margin-bottom:18px;">✿</div>
            <div style="color:#c16eaa;font-size:11px;font-weight:800;letter-spacing:2px;margin-bottom:12px;">BIENVENUE SUR TASKFLOW</div>
            <h1 style="margin:0 0 18px;color:#30253f;font-size:26px;line-height:1.25;font-weight:800;letter-spacing:-.8px;">Confirmez votre adresse e-mail</h1>
            <p style="margin:0 0 22px;color:#81758e;font-size:15px;line-height:1.7;">${greeting}<br>Une dernière petite étape avant de rejoindre TaskFlow : saisissez ce code dans l'écran d'inscription.</p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:linear-gradient(110deg,#fff0f7 0%,#f7f0ff 60%,#eeeaff 100%);border:1px solid #eee1f4;border-radius:18px;">
              <tr><td style="padding:24px 20px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>${digits}</tr></table>
              </td></tr>
            </table>
            <p style="margin:20px 0 0;color:#81758e;font-size:13px;line-height:1.7;">Ce code est valable pendant ${env.emailVerificationTtlMinutes} minutes. Si vous n'êtes pas à l'origine de cette inscription, vous pouvez ignorer cet e-mail en toute sécurité.</p>
            <div style="height:1px;background:#f1e8f5;margin:28px 0 20px;"></div>
            <p style="margin:0;text-align:center;color:#81758e;font-size:12px;line-height:1.6;">🦋 TaskFlow · Organisez, collaborez, réussissez.<br>© 2026 TaskFlow.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`,
    text: `${textGreeting}\n\nBienvenue sur TaskFlow.\n\nVotre code de vérification est : ${code}\n\nCe code est valable pendant ${env.emailVerificationTtlMinutes} minutes. Si vous n'êtes pas à l'origine de cette inscription, vous pouvez ignorer cet e-mail en toute sécurité.\n\nTaskFlow · Organisez, collaborez, réussissez.\n© 2026 TaskFlow.`,
  };
}
