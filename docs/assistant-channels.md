# Assistant channel configuration

ABE TechLab Operations is the source of truth for Assistant conversations. Communication providers are adapters around the Operations conversation model.

## Website chat

Set `ASSISTANT_WEBSITE_SECRET` to the same value used by the website as `OPERATIONS_ASSISTANT_SECRET`. The website proxy calls `/api/assistant/chat` in this application.

Set `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for the Operations application as usual. AI responses use the existing provider router and whichever provider keys are configured in the Operations deployment.

## Email

Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` for outbound assistant email. Configure Resend inbound email with the public webhook URL `/api/webhooks/email`. Set `RESEND_INBOUND_WEBHOOK_SECRET` to the value used by the inbound webhook configuration if a webhook secret is enabled.

Replies are matched to the sender email stored on the lead's contact record and continue the same `assistant_conversation`.

## WhatsApp

Set `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, and `WHATSAPP_GRAPH_VERSION`.

Register `/api/webhooks/whatsapp` as the WhatsApp webhook. The website uses `NEXT_PUBLIC_WHATSAPP_ASSISTANT_NUMBER` for the user-facing click-through link.

The selected phone number from the project enquiry is stored on the Operations contact record so an incoming WhatsApp message can be matched back to the lead.

## Voice with Vapi

Set `VAPI_API_KEY`, `VAPI_PHONE_NUMBER_ID`, and `VAPI_ASSISTANT_ID` for outbound assistant calls. Set `VAPI_WEBHOOK_SECRET` when validating incoming Vapi events and configure `/api/webhooks/vapi` as the server webhook.

International outbound calling requires an appropriate imported/custom phone number. Vapi's documentation notes that free Vapi numbers are US-only and cannot be used for outbound calls.

## Human control

The Assistant conversation supports `ai_enabled` and human takeover. The Operations UI can move a conversation to human handling without deleting the conversation history.
