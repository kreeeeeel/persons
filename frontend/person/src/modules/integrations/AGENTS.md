# Game integration flow

- Implement GameIntegration<Event> and register it in model/gameIntegrations.ts. Keep provider API mapping inside the implementation; use generated clients and the shared BFF.
- The common GameHistory owns loading, retry, pagination, selection and empty layout. Each provider supplies its own illustration, title, description, Card and Details.
- Reuse the same match card/dialog in profile history and the feed. Feed wrappers stay transparent and show the page identity above the event.
- Keep preview fixtures in tools/preview-api.ts and model/previewMatches.ts; never import them into production components.
- Keep shared SegmentedTabs, 16px minimum text, both themes, ru/en, keyboard focus restoration and reduced-motion support. Test empty, failure, pagination and details states.
