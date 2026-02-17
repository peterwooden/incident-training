interface Env {
  GAME_API: Fetcher;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const target = new URL(url.pathname + url.search, "https://game-api.internal");

  return context.env.GAME_API.fetch(target.toString(), {
    method: context.request.method,
    headers: context.request.headers,
    body: context.request.body,
  });
};
