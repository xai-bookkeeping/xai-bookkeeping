import { client as apiClient } from "@/api/client.gen";

export const API_BASE_PATH = "";
export const API_BASE_URL =
  typeof window === "undefined" ? API_BASE_PATH : window.location.origin;

apiClient.setConfig({
  baseUrl: API_BASE_URL,
});

export { apiClient };
