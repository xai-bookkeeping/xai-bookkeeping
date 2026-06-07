import { client as apiClient } from "@/api/client.gen";

export const API_BASE_PATH = "/api";
export const API_BASE_URL =
  typeof window === "undefined"
    ? API_BASE_PATH
    : new URL(API_BASE_PATH, window.location.origin).toString();

apiClient.setConfig({
  baseUrl: API_BASE_URL,
});

export { apiClient };
