import { NextRequest } from "next/server";

export function jsonRequest(url: string, method: string, body?: unknown) {
  return new Request(url, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    method,
  });
}

export function nextJsonRequest(url: string, method: string, body?: unknown) {
  return new NextRequest(url, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    method,
  });
}
