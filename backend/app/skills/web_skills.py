"""Web & API skills — HTTP requests, web search, scraping."""
import httpx


def register(registry):
    @registry.register("http_get", "Make an HTTP GET request to any URL. Input JSON: {url, headers?, params?}")
    def http_get(params: dict) -> dict:
        with httpx.Client(timeout=30, follow_redirects=True) as client:
            resp = client.get(params["url"], headers=params.get("headers", {}), params=params.get("params", {}))
        return {"status_code": resp.status_code, "body": resp.text[:3000], "url": str(resp.url)}

    @registry.register("http_post", "Make an HTTP POST request. Input JSON: {url, body, headers?}")
    def http_post(params: dict) -> dict:
        with httpx.Client(timeout=30) as client:
            resp = client.post(params["url"], json=params.get("body", {}), headers=params.get("headers", {}))
        return {"status_code": resp.status_code, "body": resp.text[:3000]}

    @registry.register("http_put", "Make an HTTP PUT request. Input JSON: {url, body, headers?}")
    def http_put(params: dict) -> dict:
        with httpx.Client(timeout=30) as client:
            resp = client.put(params["url"], json=params.get("body", {}), headers=params.get("headers", {}))
        return {"status_code": resp.status_code, "body": resp.text[:2000]}

    @registry.register("http_delete", "Make an HTTP DELETE request. Input JSON: {url, headers?}")
    def http_delete(params: dict) -> dict:
        with httpx.Client(timeout=30) as client:
            resp = client.delete(params["url"], headers=params.get("headers", {}))
        return {"status_code": resp.status_code}

    @registry.register("web_search", "Search the web using DuckDuckGo. Input JSON: {query, numResults?}")
    def web_search(params: dict) -> dict:
        with httpx.Client(timeout=15) as client:
            resp = client.get("https://api.duckduckgo.com/", params={
                "q": params["query"], "format": "json", "no_html": 1, "skip_disambig": 1
            })
        data = resp.json()
        return {
            "abstract": data.get("Abstract", ""),
            "source": data.get("AbstractSource", ""),
            "url": data.get("AbstractURL", ""),
            "related_topics": [r.get("Text", "") for r in data.get("RelatedTopics", [])[:5]],
        }

    @registry.register("scrape_url", "Scrape text content from a web page. Input JSON: {url}")
    def scrape_url(params: dict) -> dict:
        with httpx.Client(timeout=20, follow_redirects=True) as client:
            resp = client.get(params["url"], headers={"User-Agent": "Mozilla/5.0 (compatible; AI Studio bot)"})
        return {"status_code": resp.status_code, "content": resp.text[:4000], "final_url": str(resp.url)}

    @registry.register("rss_feed", "Fetch and parse an RSS/Atom feed. Input JSON: {feedUrl, limit?}")
    def rss_feed(params: dict) -> dict:
        with httpx.Client(timeout=15) as client:
            resp = client.get(params["feedUrl"])
        # Return raw XML, agents can parse it
        return {"content": resp.text[:3000], "status_code": resp.status_code}
