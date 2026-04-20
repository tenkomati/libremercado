#!/bin/sh
set -eu

PORTS="${PORTS:-3000 3001 3002}"

for port in $PORTS; do
  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"

  if [ -z "$pids" ]; then
    echo "port $port: free"
    continue
  fi

  echo "port $port: stopping $pids"
  kill $pids 2>/dev/null || true
done

sleep 1

for port in $PORTS; do
  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"

  if [ -n "$pids" ]; then
    echo "port $port: force stopping $pids"
    kill -9 $pids 2>/dev/null || true
  fi
done
