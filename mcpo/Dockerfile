FROM ghcr.io/open-webui/mcpo:main
COPY --from=dogkeeper886/testlink-mcp:1.6.0 /app /opt/testlink-mcp
COPY config.json /etc/mcpo/config.json
EXPOSE 8000
ENTRYPOINT ["sh", "-c", "exec mcpo --host 0.0.0.0 --port 8000 --api-key \"$MCPO_API_KEY\" --config /etc/mcpo/config.json"]
