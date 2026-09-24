import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';

export function GET() {
  return json(
    { status: 'ok', revision: env.APP_REVISION ?? 'local' },
    { headers: { 'cache-control': 'no-store' } }
  );
}
