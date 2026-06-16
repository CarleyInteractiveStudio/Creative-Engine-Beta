---
title: Carl General Assistant
emoji: 🤖
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
---

# Carl General - Hugging Face Space

Este es el servidor para el asistente general **Carl** de Creative Engine.

## Cómo usar
1. Crea un nuevo Space en Hugging Face (Docker).
2. Sube estos archivos.
3. El Space se ejecutará en una CPU gratuita de Hugging Face.
4. Una vez activo, copia la URL y pégala en la configuración de Carl en el motor.

## Características
- Modelo: Qwen 2.5 1.5B Instruct.
- Soporte para cola: Si el servidor está procesando una solicitud, responderá indicando que el usuario debe esperar.
