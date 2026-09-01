# Temporary Assistant Channel Routing

While the dedicated WhatsApp Cloud API number and Vapi phone number are being provisioned, both website continuation actions use the temporary ABE TechLab number `08140479738`.

- WhatsApp opens `https://wa.me/2348140479738`
- Call opens `tel:+2348140479738`

Remove this fallback from `lib/assistant/channels.ts` once the real provider numbers are configured in Vercel environment variables.
