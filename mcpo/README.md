# mcpo: testlink-mcp as a REST API

Dify calls TestLink tools over HTTP, but testlink-mcp speaks MCP over stdio only. This image runs testlink-mcp inside the official [mcpo](https://github.com/open-webui/mcpo) image (`ghcr.io/open-webui/mcpo:main`), which serves each tool as a REST endpoint with an OpenAPI schema.

testlink-mcp is not on npm yet (testlink-mcp issue #129), so the Dockerfile copies the built server from `dogkeeper886/testlink-mcp:1.6.0`. `config.json` tells mcpo how to start it.

## Run

```bash
cp .env.example .env    # fill in the three values
docker compose up -d --build
```

| Variable | Meaning |
|---|---|
| `TESTLINK_URL` | TestLink base URL, such as `http://<testlink-host>:8090`. testlink-mcp adds `/lib/api/xmlrpc/v1/xmlrpc.php` |
| `TESTLINK_API_KEY` | Your personal API access key, from **My settings** in TestLink |
| `MCPO_API_KEY` | Any secret; clients send it as `Authorization: Bearer`. Generate one with `openssl rand -hex 16` |

## Check

```bash
K=$(grep MCPO_API_KEY .env | cut -d= -f2)
curl -s -H "Authorization: Bearer $K" localhost:8000/testlink/openapi.json | head -c 300
curl -s -X POST -H "Authorization: Bearer $K" -H 'Content-Type: application/json' \
     -d '{}' localhost:8000/testlink/list_projects
```

The interactive docs are at `http://<host>:8000/testlink/docs`.

## Use in Dify

See [../dify/README.md](../dify/README.md).
