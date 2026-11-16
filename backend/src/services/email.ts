import { Resend } from 'resend';
import { config } from '../config.js';
import type { Alert } from './alerts.js';

const resend = new Resend(config.RESEND_API_KEY);

const usd = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD' });

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export async function sendAlertEmail(to: string, alert: Alert): Promise<void> {
  const price = alert.triggeredPrice ?? alert.targetPrice;
  const direction = alert.condition === 'above' ? 'above' : 'below';
  const link = `${config.APP_URL}/stock/${encodeURIComponent(alert.symbol)}`;
  const subject = `${alert.symbol} is ${direction} ${usd.format(alert.targetPrice)}`;
  const text = [
    `${alert.symbol} went ${direction} your target of ${usd.format(alert.targetPrice)}.`,
    `Price when triggered: ${usd.format(price)}.`,
    `See it in ITOS: ${link}`,
    '',
    'Prices may be delayed and are not real-time. Not financial advice.',
  ].join('\n');
  const symbol = escapeHtml(alert.symbol);
  const html = `
    <p><strong>${symbol}</strong> went ${direction} your target of <strong>${usd.format(alert.targetPrice)}</strong>.</p>
    <p>Price when triggered: <strong>${usd.format(price)}</strong></p>
    <p><a href="${escapeHtml(link)}">See ${symbol} in ITOS</a></p>
    <p style="color:#666;font-size:12px">Prices may be delayed and are not real-time. Not financial advice.</p>
  `;

  const { error } = await resend.emails.send({ from: config.EMAIL_FROM, to, subject, text, html });
  if (error) throw new Error(`Resend error: ${error.message}`);
}
