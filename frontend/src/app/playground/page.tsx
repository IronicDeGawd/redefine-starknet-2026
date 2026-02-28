"use client";

import { useState, useCallback } from "react";

/* -------------------------------------------------- */
/*  Types                                              */
/* -------------------------------------------------- */

type EndpointKey = "health" | "getCredential" | "verifyCredential" | "batchVerify";
type HttpMethod = "GET" | "POST";
type CodeTab = "curl" | "javascript";

interface EndpointDef {
  key: EndpointKey;
  label: string;
  method: HttpMethod;
  pathTemplate: string;
  description: string;
  requiresAuth: boolean;
  requiresId: boolean;
  requiresBody: boolean;
  requiresMinTier: boolean;
  requiresBatch: boolean;
}

interface ApiResponse {
  status: number;
  data: unknown;
  duration: number;
}

/* -------------------------------------------------- */
/*  Endpoint definitions                               */
/* -------------------------------------------------- */

const ENDPOINTS: EndpointDef[] = [
  {
    key: "health",
    label: "Health Check",
    method: "GET",
    pathTemplate: "/api/v1/health",
    description: "Check API and service health status. No authentication required.",
    requiresAuth: false,
    requiresId: false,
    requiresBody: false,
    requiresMinTier: false,
    requiresBatch: false,
  },
  {
    key: "getCredential",
    label: "Get Credential",
    method: "GET",
    pathTemplate: "/api/v1/credentials/{id}",
    description: "Retrieve details for a specific credential by its on-chain ID.",
    requiresAuth: true,
    requiresId: true,
    requiresBody: false,
    requiresMinTier: false,
    requiresBatch: false,
  },
  {
    key: "verifyCredential",
    label: "Verify Credential",
    method: "POST",
    pathTemplate: "/api/v1/credentials/{id}/verify",
    description: "Verify a credential is valid and optionally meets a minimum tier.",
    requiresAuth: true,
    requiresId: true,
    requiresBody: true,
    requiresMinTier: true,
    requiresBatch: false,
  },
  {
    key: "batchVerify",
    label: "Batch Verify",
    method: "POST",
    pathTemplate: "/api/v1/credentials/batch-verify",
    description: "Verify multiple credentials in a single request (up to 100).",
    requiresAuth: true,
    requiresId: false,
    requiresBody: true,
    requiresMinTier: true,
    requiresBatch: true,
  },
];

const DEMO_API_KEY = "zkcred_demo_playground_key";
const SAMPLE_CREDENTIAL_ID = "0x1234abcd5678ef901234abcd5678ef901234abcd5678ef901234abcd5678ef90";
const TIER_OPTIONS = [
  { value: "", label: "None (optional)" },
  { value: "0", label: "Tier 0 — Entry" },
  { value: "1", label: "Tier 1 — Intermediate" },
  { value: "2", label: "Tier 2 — Advanced" },
  { value: "3", label: "Tier 3 — Elite" },
];

/* -------------------------------------------------- */
/*  Helpers                                            */
/* -------------------------------------------------- */

function statusColor(status: number): string {
  if (status >= 200 && status < 300) return "var(--success)";
  if (status >= 400 && status < 500) return "var(--warning)";
  return "var(--error)";
}

function statusBg(status: number): string {
  if (status >= 200 && status < 300) return "var(--success-light)";
  if (status >= 400 && status < 500) return "var(--warning-light)";
  return "var(--error-light)";
}

function methodColor(method: HttpMethod): { bg: string; text: string } {
  if (method === "GET") return { bg: "var(--success-light)", text: "var(--success-dark)" };
  return { bg: "var(--info-light)", text: "var(--info)" };
}

function buildUrl(endpoint: EndpointDef, credentialId: string): string {
  if (endpoint.requiresId) {
    return endpoint.pathTemplate.replace("{id}", credentialId);
  }
  return endpoint.pathTemplate;
}

function buildCurl(
  endpoint: EndpointDef,
  credentialId: string,
  minTier: string,
  batchIds: string
): string {
  const url = `https://your-domain.com${buildUrl(endpoint, credentialId)}`;
  let cmd = `curl -X ${endpoint.method} "${url}"`;

  if (endpoint.requiresAuth) {
    cmd += ` \\\n  -H "X-API-Key: your_api_key"`;
  }

  if (endpoint.requiresBody) {
    cmd += ` \\\n  -H "Content-Type: application/json"`;
    if (endpoint.requiresBatch) {
      const ids = batchIds
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const body: Record<string, unknown> = { credentialIds: ids };
      if (minTier !== "") body.minTier = Number(minTier);
      cmd += ` \\\n  -d '${JSON.stringify(body)}'`;
    } else if (minTier !== "") {
      cmd += ` \\\n  -d '{"minTier": ${minTier}}'`;
    }
  }

  return cmd;
}

function buildJavaScript(
  endpoint: EndpointDef,
  credentialId: string,
  minTier: string,
  batchIds: string
): string {
  const url = buildUrl(endpoint, credentialId);
  const headers: Record<string, string> = {};
  if (endpoint.requiresAuth) headers["X-API-Key"] = "your_api_key";

  let bodyStr = "";
  if (endpoint.requiresBody) {
    headers["Content-Type"] = "application/json";
    if (endpoint.requiresBatch) {
      const ids = batchIds
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const body: Record<string, unknown> = { credentialIds: ids };
      if (minTier !== "") body.minTier = Number(minTier);
      bodyStr = JSON.stringify(body, null, 2);
    } else if (minTier !== "") {
      bodyStr = JSON.stringify({ minTier: Number(minTier) }, null, 2);
    }
  }

  const headersStr = JSON.stringify(headers, null, 2);
  const indent = "  ";

  let code = `const res = await fetch("${url}", {\n`;
  code += `${indent}method: "${endpoint.method}",\n`;
  code += `${indent}headers: ${headersStr.split("\n").join("\n" + indent)},\n`;
  if (bodyStr) {
    code += `${indent}body: JSON.stringify(${bodyStr.split("\n").join("\n" + indent)}),\n`;
  }
  code += `});\n\nconst data = await res.json();\nconsole.log(data);`;

  return code;
}

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function PlaygroundPage() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointKey>("health");
  const [credentialId, setCredentialId] = useState(SAMPLE_CREDENTIAL_ID);
  const [minTier, setMinTier] = useState("");
  const [batchIds, setBatchIds] = useState(
    `${SAMPLE_CREDENTIAL_ID}\n0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890`
  );
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeCodeTab, setActiveCodeTab] = useState<CodeTab>("curl");
  const [copied, setCopied] = useState(false);

  const endpoint = ENDPOINTS.find((e) => e.key === selectedEndpoint)!;

  const runRequest = useCallback(async () => {
    setLoading(true);
    setResponse(null);
    const start = performance.now();

    try {
      const url = buildUrl(endpoint, credentialId);
      const headers: Record<string, string> = {};
      if (endpoint.requiresAuth) {
        headers["X-API-Key"] = DEMO_API_KEY;
      }

      let body: string | undefined;
      if (endpoint.requiresBody) {
        headers["Content-Type"] = "application/json";
        if (endpoint.requiresBatch) {
          const ids = batchIds
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean);
          const payload: Record<string, unknown> = { credentialIds: ids };
          if (minTier !== "") payload.minTier = Number(minTier);
          body = JSON.stringify(payload);
        } else if (minTier !== "") {
          body = JSON.stringify({ minTier: Number(minTier) });
        }
      }

      const res = await fetch(url, {
        method: endpoint.method,
        headers,
        body,
      });

      const data = await res.json();
      const duration = Math.round(performance.now() - start);
      setResponse({ status: res.status, data, duration });
    } catch (err) {
      const duration = Math.round(performance.now() - start);
      setResponse({
        status: 0,
        data: { error: "Network error", message: err instanceof Error ? err.message : "Request failed" },
        duration,
      });
    } finally {
      setLoading(false);
    }
  }, [endpoint, credentialId, minTier, batchIds]);

  const codeSnippet =
    activeCodeTab === "curl"
      ? buildCurl(endpoint, credentialId, minTier, batchIds)
      : buildJavaScript(endpoint, credentialId, minTier, batchIds);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(codeSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [codeSnippet]);

  return (
    <div className="flex-1 p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1
            className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] font-[var(--font-display)] mb-2"
          >
            API Playground
          </h1>
          <p className="text-[var(--text-secondary)]">
            Test ZKCred&apos;s public API endpoints interactively
          </p>
        </div>

        {/* Endpoint Selector */}
        <div
          className="card p-6 mb-6"
          style={{ border: "1px solid var(--border-light)" }}
        >
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Endpoint
          </label>
          <div className="flex flex-wrap gap-2">
            {ENDPOINTS.map((ep) => {
              const mc = methodColor(ep.method);
              const isActive = ep.key === selectedEndpoint;
              return (
                <button
                  key={ep.key}
                  onClick={() => {
                    setSelectedEndpoint(ep.key);
                    setResponse(null);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: isActive ? "var(--primary-light)" : "var(--grey-100)",
                    color: isActive ? "var(--primary)" : "var(--text-secondary)",
                    border: isActive ? "1px solid var(--primary)" : "1px solid transparent",
                  }}
                >
                  <span
                    className="px-1.5 py-0.5 rounded text-xs font-semibold"
                    style={{
                      background: mc.bg,
                      color: mc.text,
                      fontFamily: "'SF Mono', 'Fira Code', monospace",
                    }}
                  >
                    {ep.method}
                  </span>
                  {ep.label}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            {endpoint.description}
          </p>
        </div>

        {/* Request Panel */}
        <div
          className="card p-6 mb-6"
          style={{ border: "1px solid var(--border-light)" }}
        >
          <h2 className="text-lg font-semibold text-[var(--text-primary)] font-[var(--font-display)] mb-4">
            Request
          </h2>

          {/* URL Bar */}
          <div
            className="flex items-center gap-3 p-3 rounded-lg mb-4"
            style={{ background: "var(--grey-100)", border: "1px solid var(--border)" }}
          >
            <span
              className="px-2 py-1 rounded text-xs font-bold shrink-0"
              style={{
                background: methodColor(endpoint.method).bg,
                color: methodColor(endpoint.method).text,
                fontFamily: "'SF Mono', 'Fira Code', monospace",
              }}
            >
              {endpoint.method}
            </span>
            <span
              className="text-sm truncate"
              style={{
                fontFamily: "'SF Mono', 'Fira Code', monospace",
                color: "var(--text-primary)",
              }}
            >
              {buildUrl(endpoint, endpoint.requiresId ? credentialId || "{id}" : "")}
            </span>
          </div>

          {/* Headers */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
              Headers
            </label>
            <div
              className="p-3 rounded-lg text-sm"
              style={{
                background: "var(--grey-100)",
                border: "1px solid var(--border)",
                fontFamily: "'SF Mono', 'Fira Code', monospace",
              }}
            >
              {endpoint.requiresAuth ? (
                <div className="flex flex-wrap gap-x-1">
                  <span style={{ color: "var(--info)" }}>X-API-Key:</span>{" "}
                  <span style={{ color: "var(--text-muted)" }}>
                    {DEMO_API_KEY.slice(0, 16)}...
                  </span>
                </div>
              ) : (
                <span style={{ color: "var(--text-muted)" }}>No authentication required</span>
              )}
            </div>
          </div>

          {/* Input Fields */}
          <div className="space-y-4">
            {/* Credential ID */}
            {endpoint.requiresId && (
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                  Credential ID
                </label>
                <input
                  type="text"
                  value={credentialId}
                  onChange={(e) => setCredentialId(e.target.value)}
                  placeholder="0x..."
                  className="input"
                  style={{ fontFamily: "'SF Mono', 'Fira Code', monospace", fontSize: "13px" }}
                />
              </div>
            )}

            {/* Batch IDs */}
            {endpoint.requiresBatch && (
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                  Credential IDs
                  <span className="text-[var(--text-muted)] font-normal ml-1">(one per line)</span>
                </label>
                <textarea
                  value={batchIds}
                  onChange={(e) => setBatchIds(e.target.value)}
                  rows={4}
                  className="input"
                  style={{
                    fontFamily: "'SF Mono', 'Fira Code', monospace",
                    fontSize: "13px",
                    resize: "vertical",
                  }}
                />
              </div>
            )}

            {/* Min Tier */}
            {endpoint.requiresMinTier && (
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                  Minimum Tier
                  <span className="text-[var(--text-muted)] font-normal ml-1">(optional)</span>
                </label>
                <select
                  value={minTier}
                  onChange={(e) => setMinTier(e.target.value)}
                  className="input"
                  style={{ cursor: "pointer" }}
                >
                  {TIER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Run Button */}
          <div className="mt-6">
            <button
              onClick={runRequest}
              disabled={loading}
              className="btn btn-primary"
              style={{ minWidth: "120px" }}
            >
              {loading ? (
                <>
                  <span
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                    style={{ display: "inline-block" }}
                  />
                  Running...
                </>
              ) : (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Send Request
                </>
              )}
            </button>
          </div>
        </div>

        {/* Response Panel */}
        {response && (
          <div
            className="card p-6 mb-6 animate-fade-in"
            style={{ border: "1px solid var(--border-light)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] font-[var(--font-display)]">
                Response
              </h2>
              <div className="flex items-center gap-3">
                <span
                  className="text-xs font-medium px-2.5 py-1 rounded-full"
                  style={{
                    background: statusBg(response.status),
                    color: statusColor(response.status),
                  }}
                >
                  {response.status === 0 ? "ERR" : response.status}
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                  {response.duration}ms
                </span>
              </div>
            </div>
            <pre
              className="p-4 rounded-lg overflow-auto text-sm leading-relaxed"
              style={{
                background: "#1e1e2e",
                color: "#cdd6f4",
                fontFamily: "'SF Mono', 'Fira Code', monospace",
                maxHeight: "400px",
                border: "1px solid var(--grey-300)",
              }}
            >
              {JSON.stringify(response.data, null, 2)}
            </pre>
          </div>
        )}

        {/* Code Snippets */}
        <div
          className="card p-6"
          style={{ border: "1px solid var(--border-light)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] font-[var(--font-display)]">
              Code Snippet
            </h2>
            <div className="flex items-center gap-2">
              {/* Tab buttons */}
              <div
                className="flex gap-1 p-1 rounded-lg"
                style={{ background: "var(--grey-100)" }}
              >
                {(["curl", "javascript"] as CodeTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveCodeTab(tab)}
                    className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
                    style={{
                      background: activeCodeTab === tab ? "var(--surface)" : "transparent",
                      color:
                        activeCodeTab === tab
                          ? "var(--text-primary)"
                          : "var(--text-muted)",
                      boxShadow: activeCodeTab === tab ? "var(--shadow-xs)" : "none",
                    }}
                  >
                    {tab === "curl" ? "cURL" : "JavaScript"}
                  </button>
                ))}
              </div>

              {/* Copy button */}
              <button
                onClick={handleCopy}
                className="btn btn-ghost px-3 py-1.5 text-xs"
                style={{ borderRadius: "var(--radius-md)" }}
              >
                {copied ? (
                  <>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--success)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Copied
                  </>
                ) : (
                  <>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          <pre
            className="p-4 rounded-lg overflow-auto text-sm leading-relaxed"
            style={{
              background: "#1e1e2e",
              color: "#cdd6f4",
              fontFamily: "'SF Mono', 'Fira Code', monospace",
              maxHeight: "300px",
              border: "1px solid var(--grey-300)",
            }}
          >
            {codeSnippet}
          </pre>
        </div>
      </div>
    </div>
  );
}
