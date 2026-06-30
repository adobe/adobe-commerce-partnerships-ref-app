import { ApiError } from './apiError';

let cachedToken: string | null = null;
let tokenExpiry = 0;

export async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const imsBase = process.env.IMS_TOKEN;
  if (!imsBase) {
    throw new ApiError('Missing IMS_TOKEN', 500);
  }
  const tokenUrl = `${imsBase}/ims/token/v2`;
  const clientId = process.env.PARTNER_CLIENT_ID;
  const clientSecret = process.env.PARTNER_CLIENT_SECRET;
  const scopes = process.env.IMS_SCOPES || 'openid,AdobeID,read_organizations';

  if (!clientId || !clientSecret) {
    throw new ApiError('Missing PARTNER_CLIENT_ID or PARTNER_CLIENT_SECRET', 500);
  }

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: scopes,
  });

  const response = await fetch(`${tokenUrl}?${params.toString()}`, { method: 'POST' });

  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(`Failed to fetch IMS access token: ${text}`, response.status);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  // expires_in is in ms; subtract 5 min buffer
  tokenExpiry = Date.now() + (data.expires_in || 86400000) - 5 * 60 * 1000;

  return cachedToken!;
}
