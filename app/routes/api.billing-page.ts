import { json } from '@remix-run/node';
import { stripe } from '~/lib/services/stripe.server'; // Adjust the import path as needed
import type { ClientActionFunctionArgs } from '@remix-run/react';
import { getCustomerByUserId, saveStripeCustomerId } from "../actions/user"
export const action = async ({ request }: ClientActionFunctionArgs) => {
  const { userId }: { userId: string } = await request.json();

  if (!userId) {
    return json({ error: 'User not authenticated' }, { status: 401 });
  }

  // Retrieve the customer's Stripe ID from your database
  let customer = await getCustomerByUserId(userId); // Replace with your logic to fetch the Stripe customer

  if (!customer?.customerIs) {
    try {
      // Create a new Stripe customer if none exists
      const newCustomer = await stripe.customers.create({
        metadata: {
          user_id: userId, // Attach your user ID for tracking
        },
      });

      // Save the new customer ID in your database
      customer = await saveStripeCustomerId(userId, newCustomer.id);

      if (!customer) {
        throw new Error('Failed to save Stripe customer ID');
      }
    } catch (err: any) {
      console.error(`Error creating Stripe customer: ${err.message}`);
      return json({ error: 'Unable to create Stripe customer' }, { status: 500 });
    }
  }

  try {
    // Create a billing portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customer.customerIs as string,

      return_url: process.env.BILLING_RETURN_URL || "http://localhost:5173", // Replace with your desired return URL
    });

    // Respond with the portal URL
    return json({ url: portalSession.url });
  } catch (err: any) {
    console.error(`Error creating Billing Portal session: ${err.message}`);
    return json({ error: 'Unable to create Billing Portal session' }, { status: 500 });
  }
};