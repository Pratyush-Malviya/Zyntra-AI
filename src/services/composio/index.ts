import { Composio } from '@composio/client';

let composioClient: Composio | null = null;

export function getComposioClient(apiKey?: string): Composio {
  if (!composioClient) {
    const key = apiKey || process.env.COMPOSIO_API_KEY;
    if (!key) {
      console.warn('Composio: No API key found. Set COMPOSIO_API_KEY env var or pass it to getComposioClient().');
      return null as unknown as Composio;
    }
    composioClient = new Composio({ apiKey: key });
  }
  return composioClient;
}

export async function executeTool(
  toolSlug: string,
  args: Record<string, unknown>,
  connectedAccountId?: string,
) {
  const client = getComposioClient();
  if (!client) throw new Error('Composio not configured');
  return client.tools.execute(toolSlug, {
    arguments: args,
    ...(connectedAccountId ? { connected_account_id: connectedAccountId } : {}),
  });
}

export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  connectedAccountId?: string,
) {
  return executeTool('gmail_send_email', { to, subject, body }, connectedAccountId);
}

export async function createSlackMessage(
  channel: string,
  text: string,
  connectedAccountId?: string,
) {
  return executeTool('slack_post_message', { channel, text }, connectedAccountId);
}

export async function createHubSpotContact(
  email: string,
  properties: Record<string, string>,
  connectedAccountId?: string,
) {
  return executeTool('hubspot_create_contact', { email, properties }, connectedAccountId);
}

export async function listTools() {
  const client = getComposioClient();
  if (!client) throw new Error('Composio not configured');
  return client.tools.list();
}
