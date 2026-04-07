import { siteConfig } from '../config';

/**
 * Generates a WhatsApp deep link with pre-filled message.
 * Encodes the message using encodeURIComponent for proper URL encoding.
 */
export function getWhatsAppUrl(message: string): string {
  return `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(message)}`;
}
