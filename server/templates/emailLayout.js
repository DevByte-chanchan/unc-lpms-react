/**
 * The shared shell of every LPMS email: a white card with the UNC logo, the
 * message, one button, a small print paragraph, the signature lines and an
 * optional note under the card.
 *
 * The logo is embedded as a CID attachment (LOGO_ATTACHMENT), so nothing loads
 * from the web and there's no tracking.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_CID = 'unclogo@lpms';

export const LOGO_ATTACHMENT = Object.freeze({
  filename: 'unclogo.png',
  path: path.join(__dirname, '..', '..', 'src', 'assets', 'unclogo.png'),
  cid: LOGO_CID,
});

export const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/**
 * Every argument except `introHtml` is plain text and escaped here; introHtml
 * is trusted markup the caller has escaped itself.
 */
export function renderEmail({ title, greeting, introHtml, buttonLabel, link, smallPrint = [], signature = [], note }) {
  const small = smallPrint.map((p) => `<p style="margin:0 0 6px;">${esc(p)}</p>`).join('');
  const sig = signature
    .map((line, i) => `<div style="${i === 0 ? 'font-weight:600;color:#18191A;' : 'color:#6B7280;font-size:13px;'}">${esc(line)}</div>`)
    .join('');

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#F3F4F6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border-radius:12px;border:1px solid #E5E7EB;font-family:Poppins,Segoe UI,Helvetica,Arial,sans-serif;color:#374151;">
        <tr><td style="padding:28px 32px 8px;">
          <img src="cid:${LOGO_CID}" width="56" height="56" alt="University of Nueva Caceres" style="display:block;border:0;">
          <div style="margin-top:12px;font-size:13px;font-weight:600;color:#6B7280;letter-spacing:0.3px;">Learning Plan Management System</div>
        </td></tr>
        <tr><td style="padding:16px 32px 0;font-size:15px;line-height:1.6;">
          <p style="margin:0 0 14px;">${esc(greeting)}</p>
          <p style="margin:0 0 22px;">${introHtml}</p>
        </td></tr>
        <tr><td style="padding:0 32px;">
          <a href="${esc(link)}" style="display:inline-block;background:#18191A;color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:600;padding:12px 24px;border-radius:8px;">${esc(buttonLabel)}</a>
        </td></tr>
        <tr><td style="padding:22px 32px 0;font-size:13px;line-height:1.6;color:#6B7280;">
          ${small}
          <p style="margin:0;word-break:break-all;">If the button doesn't work, copy this link into your browser:<br><a href="${esc(link)}" style="color:#374151;">${esc(link)}</a></p>
        </td></tr>
        <tr><td style="padding:22px 32px 28px;font-size:14px;line-height:1.5;">${sig}</td></tr>
      </table>
      ${note ? `<p style="max-width:520px;margin:16px auto 0;font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:12px;color:#9CA3AF;">${esc(note)}</p>` : ''}
    </td></tr>
  </table>
</body>
</html>`;
}

export const SYSTEM_SIGNATURE = '— UNC Learning Plan Management System';
