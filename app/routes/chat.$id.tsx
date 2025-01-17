import { json, type LoaderFunctionArgs } from '@remix-run/server-runtime';
import { default as IndexRoute } from './_index';

export async function loader(args: LoaderFunctionArgs) {
  return json({ id: args.params.id });
}

export default IndexRoute;
