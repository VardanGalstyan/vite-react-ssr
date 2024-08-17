import ReactDOMServer from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { App } from "./App";
import router from "./router";
import { SSRProvider } from "./context";

async function loadData(url, context) {
  const routes = router.match(url.replace(/\?.*$/, ""));
  const paths = [];
  const promises = routes.map((e) => {
    paths.push(e.route.path);
    return e.route.component.loadData
      ? e.route.component.loadData({ ...context, params: e.match.params })
      : null;
  });

  const arr = await Promise.all(promises);
  const dict = {};

  for (const i in arr) {
    dict[paths[i]] = {
      url: url,
      data: arr[i],
    };
  }

  return dict;
}

export default async function render(url, context) {
  let data = null;

  try {
    data = await loadData(url, context);
  } catch (err) {
    data = { $ssrErrorMsg: import.meta.env.DEV ? err.stack : err.message };
  }

  for (const i in data) {
    if (data[i].data && data[i].data.redirect) {
      return { redirect: data[i].data.redirect };
    }
  }

  const html = ReactDOMServer.renderToString(
    <SSRProvider value={data}>
      <StaticRouter location={url} context={context}>
        <App></App>
      </StaticRouter>
    </SSRProvider>
  );

  return { appHtml: html, propsData: data };
}
