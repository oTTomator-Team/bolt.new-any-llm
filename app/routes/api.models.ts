import { json } from '@remix-run/server-runtime';
import { MODEL_LIST } from '~/utils/constants';

export async function loader() {
  return json(MODEL_LIST);
}
