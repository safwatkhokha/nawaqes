#!/bin/bash
cd /home/z/my-project/nawaqes-project
export NODE_ENV=production
export PORT=7860
exec node dist/server.mjs
