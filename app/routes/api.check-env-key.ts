import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { providerBaseUrlEnvKeys } from '~/utils/constants';

interface Env {
  [key: string]: string | undefined;
}

interface CloudflareContext {
  cloudflare?: {
    env: Env;
  };
}

export const loader = async ({ context, request }: LoaderFunctionArgs & { context: CloudflareContext }) => {
  const url = new URL(request.url);
  const provider = url.searchParams.get('provider');

  if (!provider || !providerBaseUrlEnvKeys[provider].apiTokenKey) {
    return Response.json({ isSet: false });
  }

  const envVarName = providerBaseUrlEnvKeys[provider].apiTokenKey;
  const isSet = !!(process.env[envVarName] || context?.cloudflare?.env?.[envVarName]);

  return Response.json({ isSet });
};
