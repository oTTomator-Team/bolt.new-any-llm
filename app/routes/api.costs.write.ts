import type { ActionFunction } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { openDatabase, setPricing } from '~/lib/persistence/db';

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const data = (await request.json()) as { provider: string; pricing: any };

    // Validate the provider name
    if (!/^[a-z]+$/.test(data.provider)) {
      return json({ error: 'Invalid provider name' }, { status: 400 });
    }

    try {
      const db = await openDatabase();

      if (!db) {
        return json({ error: 'Database not available' }, { status: 500 });
      }

      await setPricing(db, data.provider, data.pricing);

      return json({ success: true });
    } catch (dbError) {
      console.error('Error saving to database:', dbError);
      return json(
        {
          error: 'Failed to save pricing data',
          details: dbError instanceof Error ? dbError.message : 'Unknown error',
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error('Error handling request:', error);
    return json({ error: 'Failed to process request' }, { status: 500 });
  }
};
