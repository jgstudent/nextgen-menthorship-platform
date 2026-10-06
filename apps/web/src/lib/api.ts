const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
const serverApiUrl = process.env.API_INTERNAL_URL?.replace(/\/$/, "") ?? configuredApiUrl ?? "http://localhost:4100/api";

export function getApiUrl() {
  if (typeof window === "undefined") {
    return serverApiUrl;
  }

  if (configuredApiUrl && !shouldUseSameOriginProxy(configuredApiUrl)) {
    return configuredApiUrl;
  }

  return "/api";
}

export type ApiOptions = RequestInit & { token?: string };

export function getAuthToken(token?: string) {
  return token ?? (typeof window !== "undefined" ? localStorage.getItem("nextgen_token") ?? undefined : undefined);
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const token = getAuthToken(options.token);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${getApiUrl()}${path}`, { ...options, headers });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json() as Promise<T>;
}

export function uploadFormData<T>(path: string, formData: FormData, onProgress?: (progress: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `${getApiUrl()}${path}`);

    const token = getAuthToken();
    if (token) {
      request.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    request.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve(JSON.parse(request.responseText) as T);
      } else {
        reject(new Error(request.responseText || "Upload failed."));
      }
    };

    request.onerror = () => reject(new Error("Upload failed."));
    request.send(formData);
  });
}

function isLocalBrowser() {
  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

function isLocalhostApi(value: string) {
  try {
    const url = new URL(value);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}

function shouldUseSameOriginProxy(value: string) {
  try {
    const url = new URL(value);
    if (isLocalhostApi(value) && !isLocalBrowser()) {
      return true;
    }
    return url.hostname === window.location.hostname && url.port !== window.location.port;
  } catch {
    return false;
  }
}

