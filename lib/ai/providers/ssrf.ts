// Custom Base URL 的 SSRF 防护。
// 内置 Provider 的固定域名不走此校验；仅对 custom（及用户自定义地址）生效。
// 仅在 Route Handler（Node.js 运行时）被调用。

import { promises as dnsPromises } from "node:dns";
import type { LookupAddress } from "node:dns";

/** 校验自定义 Base URL：协议合法、主机不是内网 / 回环 / 链路本地 / metadata。
 *  主机为域名时再做一次 DNS 解析，解析结果落在私网也拒绝。 */
export async function assertSafeBaseUrl(rawUrl: string): Promise<void> {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new SsrfError("请填写 API 地址。");
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new SsrfError("API 地址格式不正确，请输入完整的 http(s) 地址。");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new SsrfError("API 地址仅允许使用 http 或 https 协议。");
  }
  if (url.username || url.password) {
    throw new SsrfError("API 地址中不允许包含用户名或密码。");
  }

  const hostname = url.hostname.toLowerCase();
  assertSafeHostname(hostname);

  // 域名：DNS 解析后再次校验所有解析地址，防止解析指向内网
  if (!isIpLiteral(hostname)) {
    await assertDnsResolvesPublic(hostname);
  }
}

/** 仅基于主机名的同步检查（IP / 特殊域名），供轻量场景复用 */
export function assertSafeHostname(hostname: string): void {
  if (hostname === "") {
    throw new SsrfError("API 地址缺少主机名。");
  }

  if (hostname.endsWith(".local")) {
    throw new SsrfError("不允许使用 .local 等本地主机名。");
  }
  if (hostname === "localhost") {
    throw new SsrfError("不允许访问本机回环地址。");
  }

  // 显式内网主机名特征
  if (isObviousInternalHostname(hostname)) {
    throw new SsrfError("不允许访问内部网络主机。");
  }

  // 云厂商 metadata 地址（域名与 IP 形式）
  if (hostname === "metadata.google.internal" || isMetadataIp(hostname)) {
    throw new SsrfError("不允许访问云实例元数据地址。");
  }

  if (isIpLiteral(hostname)) {
    const ip = normalizeIp(hostname);
    if (ip !== null && !isPublicIp(ip)) {
      throw new SsrfError("API 地址不能指向回环、内网或链路本地地址。");
    }
  }
}

async function assertDnsResolvesPublic(hostname: string): Promise<void> {
  let records: LookupAddress[];
  try {
    records = await dnsPromises.lookup(hostname, { all: true });
  } catch {
    throw new SsrfError("无法解析该 API 地址的域名，请检查后重试。");
  }
  if (records.length === 0) {
    throw new SsrfError("该 API 地址的域名没有可用的解析结果。");
  }
  for (const record of records) {
    if (!isPublicIp(record.address)) {
      throw new SsrfError("API 地址解析到了内网地址，已拒绝访问。");
    }
  }
}

function isObviousInternalHostname(hostname: string): boolean {
  return (
    hostname.endsWith(".internal") ||
    hostname.endsWith(".lan") ||
    hostname.endsWith(".home") ||
    hostname.endsWith(".corp") ||
    hostname.startsWith("intranet.") ||
    hostname.includes(".intranet.")
  );
}

function isMetadataIp(hostname: string): boolean {
  // AWS / 阿里云 / 华为云等常用 metadata: 169.254.169.254；Azure 走前缀
  const normalized = normalizeIp(hostname);
  if (normalized === null) return false;
  return (
    normalized === "169.254.169.254" || normalized.startsWith("169.254.")
  );
}

/** 判断主机名是否为 IPv4 / IPv6 字面量（含 [::1] 去括号后） */
export function isIpLiteral(hostname: string): boolean {
  const h = hostname.replace(/^\[|\]$/g, "");
  return isIPv4(h) || h.includes(":");
}

/** 归一化为可比较的 IP；非法返回 null */
function normalizeIp(hostname: string): string | null {
  const h = hostname.replace(/^\[|\]$/g, "");
  if (isIPv4(h)) return h;
  if (h.includes(":")) return expandIPv6(h);
  return null;
}

function isIPv4(value: string): boolean {
  const parts = value.split(".");
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    if (!/^\d{1,3}$/.test(part)) return false;
    const n = Number(part);
    return n >= 0 && n <= 255;
  });
}

/** 判断 IP 是否为公网（拒绝 loopback / private / link-local / 保留 / 组播 / ULA） */
export function isPublicIp(address: string): boolean {
  if (isIPv4(address)) {
    const [a, b] = address.split(".").map(Number);
    if (a === 10) return false; // 10.0.0.0/8
    if (a === 127) return false; // loopback 127.0.0.0/8
    if (a === 0) return false; // 0.0.0.0/8
    if (a === 169 && b === 254) return false; // link-local
    if (a === 172 && b >= 16 && b <= 31) return false; // 172.16.0.0/12
    if (a === 192 && b === 168) return false; // 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return false; // CGNAT 100.64/10
    if (a >= 224) return false; // multicast / reserved 224-255
    if (a === 192 && b === 0) return false; // 192.0.0.0/24 保留
    if (a === 198 && (b === 18 || b === 19)) return false; // benchmark
    return true;
  }

  // IPv6
  const expanded = expandIPv6(address);
  if (expanded === "") return false;
  const groups = expanded.split(":");
  const first16 = parseInt(groups[0] ?? "0", 16);

  if (expanded === "0000:0000:0000:0000:0000:0000:0000:0001") return false; // ::1
  if (expanded === "0000:0000:0000:0000:0000:0000:0000:0000") return false; // ::
  if ((first16 & 0xfe00) === 0xfc00) return false; // fc00::/7 ULA
  if ((first16 & 0xffc0) === 0xfe80) return false; // fe80::/10 link-local
  if ((first16 & 0xff00) === 0xff00) return false; // multicast ff00::/8
  if ((first16 & 0xe000) === 0xe000) return false; // 2001::/3 段外的保留粗判
  // IPv4-mapped（::ffff:a.b.c.d）/ 已废弃 compatible（::a.b.c.d），按内嵌 IPv4 再判。
  // WHATWG URL 会规范化为展开形式（如 ::ffff:127.0.0.1 → ...0000:ffff:7f00:0001）。
  const hasEmbeddedV4 =
    groups.slice(0, 5).every((g) => g === "0000") &&
    (groups[5] === "0000" || groups[5] === "ffff");
  const v4Mapped = hasEmbeddedV4 ? embeddedIpv4(groups) : null;
  if (v4Mapped !== null) return isPublicIp(v4Mapped);
  return true;
}

function embeddedIpv4(groups: string[]): string | null {
  const last = groups.slice(6).join("");
  if (last.length !== 8) return null;
  return `${parseInt(last.slice(0, 2), 16)}.${parseInt(
    last.slice(2, 4),
    16
  )}.${parseInt(last.slice(4, 6), 16)}.${parseInt(last.slice(6, 8), 16)}`;
}

/** 将 IPv6 展开为 8 组 4 位十六进制；非法返回空串 */
function expandIPv6(address: string): string {
  let ip = address.toLowerCase();
  if (ip.startsWith("::")) ip = `0${ip}`;

  const sides = ip.split("::");
  if (sides.length > 2) return "";

  let groups: string[];
  if (sides.length === 2) {
    const left = sides[0] ? sides[0].split(":") : [];
    const right = sides[1] ? sides[1].split(":") : [];
    const missing = 8 - left.length - right.length;
    if (missing < 0) return "";
    groups = [...left, ...Array(missing).fill("0"), ...right];
  } else {
    groups = ip.split(":");
  }

  if (groups.length !== 8) return "";
  if (!groups.every((g) => /^[0-9a-f]{1,4}$/.test(g))) return "";
  return groups.map((g) => g.padStart(4, "0")).join(":");
}

export class SsrfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SsrfError";
  }
}
