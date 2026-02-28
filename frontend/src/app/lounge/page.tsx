"use client";

import { useState, useCallback } from "react";

type TierLevel = 0 | 1 | 2 | 3;

interface TierConfig {
  level: TierLevel;
  name: string;
  title: string;
  emoji: string;
  description: string;
  colorVar: string;
  bgVar: string;
  borderColor: string;
  glowColor: string;
  badgeClass: string;
}

const TIERS: TierConfig[] = [
  {
    level: 0,
    name: "Tier 0",
    title: "Open Access",
    emoji: "\uD83C\uDF31",
    description:
      "Welcome to ZKCred! Access community announcements, public API playground, credential verification tools, and basic platform documentation.",
    colorVar: "var(--tier-shrimp)",
    bgVar: "var(--tier-shrimp-bg)",
    borderColor: "#9CA3AF",
    glowColor: "rgba(156, 163, 175, 0.25)",
    badgeClass: "tier-shrimp",
  },
  {
    level: 1,
    name: "Tier 1",
    title: "Insider Access",
    emoji: "\u2B50",
    description:
      "Early feature previews, detailed API usage stats, batch verification at 100 req/call, and connector-specific credential guides.",
    colorVar: "var(--tier-crab)",
    bgVar: "var(--tier-crab-bg)",
    borderColor: "#F59E0B",
    glowColor: "rgba(245, 158, 11, 0.25)",
    badgeClass: "tier-crab",
  },
  {
    level: 2,
    name: "Tier 2",
    title: "Builder Access",
    emoji: "\uD83D\uDC8E",
    description:
      "Webhook integrations for credential events, developer API with elevated rate limits, custom credential type proposals, and priority support.",
    colorVar: "var(--tier-fish)",
    bgVar: "var(--tier-fish-bg)",
    borderColor: "#3B82F6",
    glowColor: "rgba(59, 130, 246, 0.25)",
    badgeClass: "tier-fish",
  },
  {
    level: 3,
    name: "Tier 3",
    title: "Elite Access",
    emoji: "\uD83D\uDC51",
    description:
      "Direct protocol team access, governance participation in new connector proposals, unlimited API, white-label credential issuance, and dedicated SLA.",
    colorVar: "var(--tier-whale)",
    bgVar: "var(--tier-whale-bg)",
    borderColor: "#8B5CF6",
    glowColor: "rgba(139, 92, 246, 0.25)",
    badgeClass: "tier-whale",
  },
];

function LockIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ animation: "spin 1s linear infinite" }}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export default function LoungePage() {
  const [credentialId, setCredentialId] = useState("");
  const [userTier, setUserTier] = useState<TierLevel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [animateCards, setAnimateCards] = useState(false);

  const handleCheckAccess = useCallback(async () => {
    const trimmedId = credentialId.trim();
    if (!trimmedId) {
      setError("Please enter a credential ID");
      return;
    }

    setLoading(true);
    setError(null);
    setChecked(false);
    setAnimateCards(false);
    setUserTier(null);

    try {
      const res = await fetch(`/api/v1/credentials/${encodeURIComponent(trimmedId)}`, {
        headers: {
          "X-API-Key": "zkcred_demo_playground_key",
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (res.status === 404) {
          setError("Credential not found. Check your credential ID and try again.");
        } else if (res.status === 401) {
          setError("Authentication failed. Invalid API key.");
        } else {
          setError(data?.error?.message || `Request failed (${res.status})`);
        }
        setChecked(true);
        return;
      }

      const data = await res.json();

      if (data.status === "revoked") {
        setError("This credential has been revoked and is no longer valid.");
        setChecked(true);
        return;
      }

      const tier = data.tier as TierLevel;
      setUserTier(tier);
      setChecked(true);

      // Trigger card unlock animation after a brief delay
      requestAnimationFrame(() => {
        setTimeout(() => setAnimateCards(true), 50);
      });
    } catch {
      setError("Network error. Please check your connection and try again.");
      setChecked(true);
    } finally {
      setLoading(false);
    }
  }, [credentialId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) {
      handleCheckAccess();
    }
  };

  const isUnlocked = (tierLevel: TierLevel): boolean => {
    if (userTier === null) return false;
    return userTier >= tierLevel;
  };

  const isCurrentTier = (tierLevel: TierLevel): boolean => {
    return userTier === tierLevel;
  };

  return (
    <div className="flex-1 p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Hero Section */}
        <div
          style={{
            position: "relative",
            textAlign: "center",
            padding: "48px 24px 40px",
            marginBottom: "32px",
            borderRadius: "var(--radius-xl)",
            overflow: "hidden",
            background: "var(--surface)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          {/* Gradient accent background */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(135deg, rgba(91,127,255,0.06) 0%, rgba(139,92,246,0.06) 50%, rgba(59,130,246,0.04) 100%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "-60px",
              right: "-40px",
              width: "200px",
              height: "200px",
              background: "radial-gradient(circle, rgba(91,127,255,0.08) 0%, transparent 70%)",
              borderRadius: "50%",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "-40px",
              left: "-20px",
              width: "160px",
              height: "160px",
              background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)",
              borderRadius: "50%",
              pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative", zIndex: 1 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "64px",
                height: "64px",
                borderRadius: "var(--radius-xl)",
                background: "linear-gradient(135deg, var(--primary) 0%, #8B5CF6 100%)",
                color: "white",
                marginBottom: "20px",
                boxShadow: "0 8px 24px rgba(91,127,255,0.3)",
              }}
            >
              <ShieldIcon />
            </div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "2.5rem",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                marginBottom: "12px",
                background: "linear-gradient(135deg, var(--primary) 0%, #8B5CF6 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              ZKCred Lounge
            </h1>
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "1rem",
                maxWidth: "480px",
                margin: "0 auto",
                lineHeight: 1.6,
              }}
            >
              Exclusive content unlocked by your ZKCred credential tier
            </p>
          </div>
        </div>

        {/* Credential Check Section */}
        <div
          style={{
            background: "var(--surface)",
            borderRadius: "var(--radius-xl)",
            padding: "28px",
            marginBottom: "32px",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "36px",
                height: "36px",
                borderRadius: "var(--radius-lg)",
                background: "var(--primary-light)",
                color: "var(--primary)",
                flexShrink: 0,
              }}
            >
              <SearchIcon />
            </div>
            <div>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.125rem",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  margin: 0,
                }}
              >
                Verify Your Access
              </h2>
              <p
                style={{
                  fontSize: "0.8125rem",
                  color: "var(--text-muted)",
                  margin: 0,
                }}
              >
                Enter your credential ID to unlock gated content
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "12px",
              alignItems: "stretch",
            }}
          >
            <div style={{ flex: 1, position: "relative" }}>
              <input
                className="input"
                type="text"
                placeholder="Enter credential ID (e.g., 0x1a2b3c...)"
                value={credentialId}
                onChange={(e) => {
                  setCredentialId(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={handleKeyDown}
                disabled={loading}
                style={{
                  height: "48px",
                  fontSize: "0.9375rem",
                }}
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={handleCheckAccess}
              disabled={loading || !credentialId.trim()}
              style={{
                height: "48px",
                minWidth: "140px",
                whiteSpace: "nowrap",
                fontSize: "0.9375rem",
                fontWeight: 600,
              }}
            >
              {loading ? (
                <>
                  <SpinnerIcon />
                  Checking...
                </>
              ) : (
                "Check Access"
              )}
            </button>
          </div>

          {/* Status Messages */}
          {error && (
            <div
              style={{
                marginTop: "16px",
                padding: "12px 16px",
                borderRadius: "var(--radius-lg)",
                background: "var(--error-light)",
                color: "var(--error)",
                fontSize: "0.875rem",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                animation: "fadeSlideIn 0.25s ease-out",
              }}
            >
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
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {error}
            </div>
          )}

          {checked && userTier !== null && (
            <div
              style={{
                marginTop: "16px",
                padding: "14px 16px",
                borderRadius: "var(--radius-lg)",
                background: "var(--success-light)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                animation: "fadeSlideIn 0.25s ease-out",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background: "var(--success)",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CheckIcon />
                </div>
                <span
                  style={{
                    color: "var(--text-primary)",
                    fontWeight: 600,
                    fontSize: "0.9375rem",
                  }}
                >
                  Credential verified successfully
                </span>
              </div>
              <span className={`tier-badge ${TIERS[userTier].badgeClass}`}>
                {TIERS[userTier].emoji} {TIERS[userTier].name} (Tier {userTier})
              </span>
            </div>
          )}
        </div>

        {/* Tier Content Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "20px",
          }}
        >
          {TIERS.map((tier) => {
            const unlocked = isUnlocked(tier.level);
            const current = isCurrentTier(tier.level);
            const shouldAnimate = animateCards && unlocked;

            return (
              <div
                key={tier.level}
                style={{
                  position: "relative",
                  borderRadius: "var(--radius-xl)",
                  background: "var(--surface)",
                  border: `1.5px solid ${unlocked ? tier.borderColor : "var(--border)"}`,
                  boxShadow: unlocked
                    ? `var(--shadow-card), 0 0 20px ${tier.glowColor}`
                    : "var(--shadow-card)",
                  overflow: "hidden",
                  transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                  transform: shouldAnimate ? "scale(1)" : unlocked ? "scale(0.95)" : "scale(1)",
                  opacity: shouldAnimate ? 1 : unlocked && !animateCards ? 0.8 : 1,
                }}
              >
                {/* Tier accent strip */}
                <div
                  style={{
                    height: "4px",
                    background: unlocked
                      ? `linear-gradient(90deg, ${tier.borderColor}, ${tier.borderColor}88)`
                      : "var(--grey-300)",
                    transition: "background 0.4s ease",
                  }}
                />

                {/* Card header */}
                <div style={{ padding: "24px 24px 0" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "16px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "var(--radius-lg)",
                          background: tier.bgVar,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1.5rem",
                          transition: "transform 0.3s ease",
                          transform: shouldAnimate ? "scale(1.1)" : "scale(1)",
                        }}
                      >
                        {tier.emoji}
                      </div>
                      <div>
                        <p
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            color: unlocked ? tier.colorVar : "var(--text-muted)",
                            margin: 0,
                            transition: "color 0.3s ease",
                          }}
                        >
                          Tier {tier.level} &mdash; {tier.name}
                        </p>
                        <h3
                          style={{
                            fontFamily: "var(--font-display)",
                            fontSize: "1.125rem",
                            fontWeight: 600,
                            color: "var(--text-primary)",
                            margin: "2px 0 0",
                          }}
                        >
                          {tier.title}
                        </h3>
                      </div>
                    </div>

                    {/* Status badges */}
                    {checked && (
                      <div style={{ animation: "fadeSlideIn 0.3s ease-out" }}>
                        {current ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "4px 10px",
                              borderRadius: "var(--radius-full)",
                              background: `linear-gradient(135deg, ${tier.borderColor}, ${tier.borderColor}dd)`,
                              color: "white",
                              fontSize: "0.6875rem",
                              fontWeight: 600,
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                            }}
                          >
                            Your Tier
                          </span>
                        ) : unlocked ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "4px 10px",
                              borderRadius: "var(--radius-full)",
                              background: "var(--success-light)",
                              color: "var(--success)",
                              fontSize: "0.6875rem",
                              fontWeight: 600,
                            }}
                          >
                            <CheckIcon /> Access Granted
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card content area */}
                <div style={{ position: "relative", padding: "0 24px 24px" }}>
                  {/* Content text — blurred when locked */}
                  <p
                    style={{
                      fontSize: "0.875rem",
                      lineHeight: 1.65,
                      color: "var(--text-secondary)",
                      margin: 0,
                      filter: unlocked ? "none" : "blur(4px)",
                      transition: "filter 0.5s ease",
                      userSelect: unlocked ? "auto" : "none",
                    }}
                  >
                    {tier.description}
                  </p>

                  {/* Lock overlay */}
                  {!unlocked && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        background: "rgba(255,255,255,0.3)",
                        borderRadius: "0 0 var(--radius-xl) var(--radius-xl)",
                      }}
                    >
                      <div
                        style={{
                          color: "var(--text-muted)",
                          opacity: 0.7,
                        }}
                      >
                        <LockIcon />
                      </div>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: "var(--text-muted)",
                          background: "var(--grey-100)",
                          padding: "4px 12px",
                          borderRadius: "var(--radius-full)",
                        }}
                      >
                        Requires Tier {tier.level}+
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <div
          style={{
            textAlign: "center",
            marginTop: "32px",
            paddingBottom: "16px",
          }}
        >
          <p
            style={{
              fontSize: "0.8125rem",
              color: "var(--text-muted)",
              lineHeight: 1.6,
            }}
          >
            Content access is verified on-chain via the ZKCred credential registry on Starknet.
            <br />
            Higher tiers unlock all content from lower tiers.
          </p>
        </div>
      </div>

      {/* Inline keyframes */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (max-width: 768px) {
          div[style*="grid-template-columns: repeat(2"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
