import {Hono} from 'hono';
import {serveRequest} from './utils';
import {HonoEnv} from "./types";

const app = new Hono<HonoEnv>();

app
  .get('*', (c) => {
    return serveRequest({
      request: c.req.raw,
      ctx: c.executionCtx,
      revalidate: false,
      cacheDuration: 600,
      env: c.env
    });
  })

export default app
