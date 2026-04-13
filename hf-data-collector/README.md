---
title: CE Data Collector
emoji: 📊
colorFrom: green
colorTo: lime
sdk: docker
pinned: false
app_port: 7860
---

# Creative Engine Data Collector

This API receives anonymous CES code snippets and metadata from the Creative Engine editor for training purposes.

## API Endpoint

- `POST /collect`: Accepts a JSON object with `scripts` and `metadata`.
