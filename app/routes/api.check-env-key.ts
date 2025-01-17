import type { LoaderFunction } from '@remix-run/server-runtime';
import { providerBaseUrlEnvKeys } from '~/utils/constants';

export const loader: LoaderFunction = async ({ context, request }) => {
  const url = new URL(request.url);
  const provider = url.searchParams.get('provider');

  if (!provider || !providerBaseUrlEnvKeys[provider].apiTokenKey) {
    return Response.json({ isSet: false });
  }

  const envVarName = providerBaseUrlEnvKeys[provider].apiTokenKey;
  const isSet = !!(process.env[envVarName] || (context?.cloudflare?.env as Record<string, any>)?.[envVarName]);

  return Response.json({ isSet });
};
