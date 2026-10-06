import { createHash, createHmac } from "node:crypto";
import http from "node:http";
import https from "node:https";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

type RequestOptions = {
  method: string;
  bucket: string;
  objectKey?: string;
  body?: Buffer;
  headers?: Record<string, string>;
};

@Injectable()
export class MinioStorageService {
  private readonly endpoint: string;
  private readonly port: number;
  private readonly accessKey: string;
  private readonly secretKey: string;
  private readonly useSSL: boolean;
  private readonly publicEndpoint: string;
  private readonly publicPort: number;
  private readonly publicUseSSL: boolean;
  private readonly region = "us-east-1";

  constructor(config: ConfigService) {
    this.endpoint = config.get<string>("MINIO_ENDPOINT") ?? "localhost";
    this.port = Number(config.get<string>("MINIO_PORT") ?? 9000);
    this.accessKey = config.get<string>("MINIO_ACCESS_KEY") ?? "";
    this.secretKey = config.get<string>("MINIO_SECRET_KEY") ?? "";
    this.useSSL = config.get<string>("MINIO_USE_SSL") === "true";
    this.publicEndpoint = config.get<string>("MINIO_PUBLIC_ENDPOINT") ?? this.endpoint;
    this.publicPort = Number(config.get<string>("MINIO_PUBLIC_PORT") ?? this.port);
    this.publicUseSSL = config.get<string>("MINIO_PUBLIC_USE_SSL") === "true";
  }

  async ensureBucket(bucket: string) {
    const exists = await this.request({ method: "HEAD", bucket }).then(() => true).catch(() => false);
    if (!exists) {
      await this.request({ method: "PUT", bucket });
    }
  }

  async putObject(bucket: string, objectKey: string, body: Buffer, contentType: string, metadata: Record<string, string>) {
    await this.request({
      method: "PUT",
      bucket,
      objectKey,
      body,
      headers: {
        "content-type": contentType,
        ...Object.fromEntries(Object.entries(metadata).map(([key, value]) => [`x-amz-meta-${key.toLowerCase()}`, value]))
      }
    });
  }

  async removeObject(bucket: string, objectKey: string) {
    await this.request({ method: "DELETE", bucket, objectKey });
  }

  presignedGetObject(bucket: string, objectKey: string, expires = 300) {
    const now = new Date();
    const amzDate = toAmzDate(now);
    const dateStamp = amzDate.slice(0, 8);
    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const encodedKey = encodeObjectKey(objectKey);
    const credential = `${this.accessKey}/${credentialScope}`;
    const host = `${this.publicEndpoint}:${this.publicPort}`;
    const params = new URLSearchParams({
      "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
      "X-Amz-Credential": credential,
      "X-Amz-Date": amzDate,
      "X-Amz-Expires": String(expires),
      "X-Amz-SignedHeaders": "host"
    });

    const canonicalQuery = params.toString().replace(/\+/g, "%20");
    const canonicalRequest = ["GET", `/${bucket}/${encodedKey}`, canonicalQuery, `host:${host}\n`, "host", "UNSIGNED-PAYLOAD"].join("\n");
    const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, sha256(canonicalRequest)].join("\n");
    const signature = hmacHex(signingKey(this.secretKey, dateStamp, this.region), stringToSign);

    return `${this.publicUseSSL ? "https" : "http"}://${host}/${bucket}/${encodedKey}?${canonicalQuery}&X-Amz-Signature=${signature}`;
  }

  private request(options: RequestOptions) {
    const body = options.body ?? Buffer.alloc(0);
    const objectPath = options.objectKey ? `/${options.bucket}/${encodeObjectKey(options.objectKey)}` : `/${options.bucket}`;
    const now = new Date();
    const amzDate = toAmzDate(now);
    const dateStamp = amzDate.slice(0, 8);
    const host = `${this.endpoint}:${this.port}`;
    const payloadHash = sha256(body);
    const headers = {
      host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      ...(options.headers ?? {})
    };
    const signedHeaders = Object.keys(headers).map((key) => key.toLowerCase()).sort();
    const canonicalHeaders = signedHeaders.map((key) => `${key}:${headers[key as keyof typeof headers]}`).join("\n") + "\n";
    const canonicalRequest = [options.method, objectPath, "", canonicalHeaders, signedHeaders.join(";"), payloadHash].join("\n");
    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, sha256(canonicalRequest)].join("\n");
    const signature = hmacHex(signingKey(this.secretKey, dateStamp, this.region), stringToSign);
    const authorization = `AWS4-HMAC-SHA256 Credential=${this.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders.join(";")}, Signature=${signature}`;

    return new Promise<void>((resolve, reject) => {
      const transport = this.useSSL ? https : http;
      const request = transport.request(
        {
          hostname: this.endpoint,
          port: this.port,
          method: options.method,
          path: objectPath,
          headers: {
            ...headers,
            authorization,
            "content-length": body.length
          }
        },
        (response) => {
          response.resume();
          response.on("end", () => {
            if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
              resolve();
            } else {
              reject(new Error(`MinIO request failed with status ${response.statusCode}`));
            }
          });
        }
      );
      request.on("error", reject);
      request.end(body);
    });
  }
}

function toAmzDate(date: Date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function hmacBuffer(key: Buffer | string, value: string) {
  return createHmac("sha256", key).update(value).digest();
}

function hmacHex(key: Buffer | string, value: string) {
  return createHmac("sha256", key).update(value).digest("hex");
}

function signingKey(secret: string, dateStamp: string, region: string) {
  const dateKey = hmacBuffer(`AWS4${secret}`, dateStamp);
  const dateRegionKey = hmacBuffer(dateKey, region);
  const dateRegionServiceKey = hmacBuffer(dateRegionKey, "s3");
  return hmacBuffer(dateRegionServiceKey, "aws4_request");
}

function encodeObjectKey(objectKey: string) {
  return objectKey.split("/").map(encodeURIComponent).join("/");
}
