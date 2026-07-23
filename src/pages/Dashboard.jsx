import { useState, useEffect } from "react";
import { useCases, useAmbulances } from "../hooks/useFirebase";
import { dispatchAmbulance } from "../services/api";
import { sevColor, sevBg, relTime } from "../utils/helpers";
import { useToast, ToastContainer } from "../components/Toast";
import MapView from "../components/MapView";
import Spinner from "../components/Spinner";

export default function Dashboard({ user, onLogout }) {
  const {
    cases,
    updateCase,
    removeCase
  } = useCases();

  const {
    ambs,
    updateAmb
  } = useAmbulances();

  const {
    toasts,
    add: toast
  } = useToast();

  const [selId, setSelId] = useState(null);
  const [filter, setFilter] = useState("active");
  const [routePoly, setRoutePoly] = useState(null);
  const [dispatching, setDispatching] = useState(null);
  const [callModal, setCallModal] = useState(null);
  const [callPhase, setCallPhase] = useState(null);
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const displayName =
    user?.name ||
    user?.displayName ||
    user?.email ||
    "Dispatcher";
    const selectedCase =
  cases.find((c) => c.id === selId) || null;

  // Check whether a case is completed
const isResolvedCase = (c) => {
  return (
    c.status === "resolved" ||
    c.status === "closed" ||
    c.status === "completed"
  );
};

// Active cases
const activeCases = cases.filter(
  (c) => !isResolvedCase(c)
);
console.log("Total:", cases.length);

console.log(
  "Active:",
  activeCases.length,
  activeCases
);


// History cases
const historyCases = cases.filter(
  (c) => isResolvedCase(c)
);
console.log(
  "History:",
  historyCases.length,
  historyCases
);

// Queue filter
const filteredCases = (() => {
  switch (filter) {
    case "active":
      return activeCases;

    case "critical":
      return activeCases.filter(
        (c) => c.sev === "critical"
      );

    case "pending":
      return activeCases.filter(
        (c) => c.status === "pending"
      );

    case "history":
      return historyCases;

    default:
      return activeCases;
  }
})();

// Dashboard counters
const criticalCount = activeCases.filter(
  (c) => c.sev === "critical"
).length;

const routedCount = activeCases.filter(
  (c) => c.status === "routed"
).length;

const availableCount = ambs.filter(
  (a) => !a.busy
).length;

  async function handleDispatch(caseId) {
    const incident = cases.find(c => c.id === caseId);

    if (!incident) return;

    setDispatching(caseId);

    try {
      const result = await dispatchAmbulance({
        caseId,
        caseLat: incident.lat,
        caseLng: incident.lng,
        ambulances: ambs
      });

      if (!result.ok) {
        toast(
          "⚠️",
          "Dispatch failed",
          result.error,
          true
        );
        return;
      }

      await updateCase(caseId, {
        status: "routed",
        amb: result.amb_id,
        eta: result.eta_text
      });

      await updateAmb(result.amb_id, {
        busy: true,
        assignedCase: caseId
      });

      if (result.route?.polyline)
        setRoutePoly(result.route.polyline);

      toast(
        "🚑",
        "Ambulance Assigned",
        `${result.amb_id} • ETA ${result.eta_text}`,
        true
      );
    } finally {
      setDispatching(null);
    }
  }

  async function handleResolve(caseId) {
    const incident = cases.find(c => c.id === caseId);

    if (!incident) return;

    await updateCase(caseId, {
      status: "resolved"
    });

    if (incident.amb) {
      await updateAmb(incident.amb, {
        busy: false,
        assignedCase: null
      });
    }

    toast(
      "✅",
      "Incident Resolved",
      incident.title,
      false
    );

    if (selId === caseId) {
      setSelId(null);
    }

  }

  async function handleCall(incident) {
    setCallModal(incident);
    setCallPhase("connecting");

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true
        });

      stream.getTracks().forEach(track => track.stop());

      setCallPhase("mock");
    } catch {
      setCallPhase("mock");
    }
  }

  function closeCallModal() {
    setCallModal(null);
    setCallPhase(null);
  }

  return (
    <div
      style={{
        height: "calc(100vh - 58px)",
        display: "flex",
        overflow: "hidden",
        color: "#EFEFEF"
      }}
    >
      <ToastContainer toasts={toasts} />

      {/* ================= Sidebar ================= */}

      <aside
        style={{
          width: 220,
          background: "#111",
          borderRight: ".5px solid rgba(255,255,255,.1)",
          display: "flex",
          flexDirection: "column"
        }}
      >
        <div
          style={{
            padding: "14px 16px",
            borderBottom: ".5px solid rgba(255,255,255,.08)"
          }}
        >
          <div
            style={{
              fontFamily: "'Bebas Neue',sans-serif",
              fontSize: 20,
              letterSpacing: 2
            }}
          >
            CRISIS
            <span style={{ color: "#E8281A" }}>
              BRAIN
            </span>
          </div>

          <div
            style={{
              color: "#555",
              fontSize: 10,
              marginTop: 4
            }}
          >
            Firebase Live Dashboard
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            padding: 15,
            borderBottom:
              ".5px solid rgba(255,255,255,.08)"
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "#E8281A22",
              color: "#E8281A",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold"
            }}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>

          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600
              }}
            >
              {displayName}
            </div>

            <div
              style={{
                fontSize: 10,
                color: "#777"
              }}
            >
              {user?.role?.toUpperCase()}
            </div>
          </div>
        </div>

        <nav
          style={{
            flex: 1,
            padding: 12
          }}
        >
          {[
            ["🗺", "Live Map"],
            ["📋", "Incidents"],
            ["🚑", "Ambulances"],
            ["🧠", "AI Logs"],
            ["📊", "Analytics"]
          ].map(([icon, title]) => (
            <div
              key={title}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 8,
                color: "#777",
                cursor: "pointer"
              }}
            >
              <span>{icon}</span>
              {title}
            </div>
          ))}
        </nav>

        <button
          onClick={onLogout}
          style={{
            margin: 12,
            padding: 10,
            border: "none",
            borderRadius: 8,
            background: "#222",
            color: "#ddd",
            cursor: "pointer"
          }}
        >
          Sign Out
        </button>
      </aside>

      {/* ================= Main ================= */}

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column"
        }}
      >
        <div
          style={{
            height: 50,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0 20px",
            background: "#111",
            borderBottom:
              ".5px solid rgba(255,255,255,.08)"
          }}
        >
          <div
            style={{ 
              color: "#666",
              fontSize: 11
            }}
          >
            COMMAND CENTER •{" "}
            {clock.toLocaleTimeString()}
          </div>

          <div
            style={{
              display: "flex",
              gap: 25
            }}
          >
            <Stat
              label="ACTIVE"
              value={activeCases.length}
            />

            <Stat
              label="CRITICAL"
              value={criticalCount}
              color="#E8281A"
            />

            <Stat
              label="ROUTED"
              value={routedCount}
              color="#3B82F6"
            />

            <Stat
              label="FREE"
              value={availableCount}
              color="#22C55E"
            />
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "320px 1fr"
          }}
        >
          {/* ================= Incident Queue ================= */}

          <div
  style={{
    borderRight: ".5px solid rgba(255,255,255,.08)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    minHeight: 0,
    height: "100%"
  }}
>
            <div
              style={{
                padding: "12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: ".5px solid rgba(255,255,255,.08)"
              }}
            >
              <span
                style={{
                  fontFamily: "'Bebas Neue',sans-serif",
                  fontSize: 16,
                  letterSpacing: 1
                }}
              >
                INCIDENT QUEUE
              </span>

              <div style={{ display: "flex", gap: 6 }}>
                {["active", "critical", "pending", "history"].map(type => (
                  <button
                    key={type}
                    onClick={() => setFilter(type)}
                    style={{
                      padding: "4px 8px",
                      borderRadius: 5,
                      border:
                        filter === type
                          ? "1px solid #E8281A"
                          : "1px solid #333",
                      background:
                        filter === type
                          ? "#E8281A22"
                          : "transparent",
                      color:
                        filter === type
                          ? "#E8281A"
                          : "#777",
                      cursor: "pointer",
                      fontSize: 10
                    }}
                  >
                    {type.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div
  style={{
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    overflowX: "hidden",
    WebkitOverflowScrolling: "touch"
  }}
>
              {filteredCases.length === 0 && (
                <div
                  style={{
                    height: 200,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    color: "#555"
                  }}
                >
                  No Incidents
                </div>
              )}

              {filteredCases.map(c => (
                <div
                  key={c.id}
                  onClick={() => setSelId(c.id)}
                  style={{
                    display: "flex",
                    gap: 10,
                    padding: 12,
                    cursor: "pointer",
                    borderBottom:
                      ".5px solid rgba(255,255,255,.05)",
                    background:
                      selId === c.id
                        ? "#1A1A1A"
                        : "transparent"
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: sevBg(c.sev),
                      color: sevColor(c.sev),
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      fontWeight: "bold"
                    }}
                  >
                    {c.score}
                  </div>

                  <div
                    style={{
                      flex: 1
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 13
                      }}
                    >
                      {c.title}
                    </div>

                    <div
                      style={{
                        fontSize: 11,
                        color: "#777",
                        marginTop: 2
                      }}
                    >
                      {c.loc}
                    </div>

                    <div
                      style={{
                        marginTop: 5,
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 10
                      }}
                    >
                      <span
                        style={{
                          color: sevColor(c.sev)
                        }}
                      >
                        {c.sev.toUpperCase()}
                      </span>

                      <span style={{ color: "#666" }}>
                        {relTime(c.time)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ================= Map Panel ================= */}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              overflow: "hidden"
            }}
          >
            <div
              style={{
                flex: 1,
                overflow: "hidden"
              }}
            >
              <MapView
                cases={filteredCases}
                ambs={ambs}
                selectedId={selId}
                onSelect={setSelId}
                routePolyline={routePoly}
              />
            </div>

            <div
              style={{
                height: 220,
                borderTop:
                  ".5px solid rgba(255,255,255,.08)",
                overflowY: "auto",
                padding: 15
              }}
            >
              {selectedCase ? (
                <div
                  style={{
                    display: "flex",
                    gap: 18,
                    height: "100%"
                  }}
                >
                  {/* ================= AI Assessment ================= */}

                  <div
                    style={{
                      flex: 1,
                      background: "#111",
                      borderRadius: 8,
                      padding: 14,
                      border: ".5px solid rgba(255,255,255,.08)"
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: "#666",
                        marginBottom: 10,
                        fontFamily: "'DM Mono', monospace"
                      }}
                    >
                      AI TRIAGE REPORT
                    </div>

                    <div
                      style={{
                        fontSize: 13,
                        color: "#DDD",
                        lineHeight: 1.7
                      }}
                    >
                      {selectedCase.ai}
                    </div>

                    <div
                      style={{
                        marginTop: 12,
                        display: "flex",
                        gap: 6,
                        flexWrap: "wrap"
                      }}
                    >
                      {(selectedCase.kw || []).map(keyword => (
                        <span
                          key={keyword}
                          style={{
                            padding: "3px 8px",
                            borderRadius: 20,
                            background: "#E8281A22",
                            color: "#E8281A",
                            fontSize: 10
                          }}
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* ================= Information ================= */}

                  <div
                    style={{
                      width: 180
                    }}
                  >
                    <InfoRow
                      label="Score"
                      value={selectedCase.score}
                      color={sevColor(selectedCase.sev)}
                    />

                    <InfoRow
                      label="Severity"
                      value={selectedCase.sev.toUpperCase()}
                    />

                    <InfoRow
                      label="Status"
                      value={selectedCase.status.toUpperCase()}
                    />

                    <InfoRow
                      label="Location"
                      value={selectedCase.loc}
                    />

                    {selectedCase.amb && (
                      <InfoRow
                        label="Ambulance"
                        value={selectedCase.amb}
                        color="#3B82F6"
                      />
                    )}

                    {selectedCase.eta && (
                      <InfoRow
                        label="ETA"
                        value={selectedCase.eta}
                        color="#22C55E"
                      />
                    )}
                  </div>

                  {/* ================= Actions ================= */}

                  <div
                    style={{
                      width: 170,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10
                    }}
                  >
                    {dispatching === selectedCase.id ? (
                      <div
                        style={{
                          padding: 12,
                          border: ".5px solid #333",
                          borderRadius: 8,
                          display: "flex",
                          alignItems: "center",
                          gap: 8
                        }}
                      >
                        <Spinner size={14} />
                        Dispatching...
                      </div>
                    ) : selectedCase.amb ? (
                      <Btn
                        col="#22C55E"
                        disabled
                      >
                        ✓ ASSIGNED
                      </Btn>
                    ) : (
                      <Btn
                        col="#E8281A"
                        onClick={() =>
                          handleDispatch(selectedCase.id)
                        }
                      >
                        🚑 DISPATCH
                      </Btn>
                    )}

                    <Btn
                      col="#3B82F6"
                      onClick={() =>
                        handleCall(selectedCase)
                      }
                    >
                      📞 CALL
                    </Btn>

                    <Btn
                      col="#22C55E"
                      onClick={() =>
                        handleResolve(selectedCase.id)
                      }
                    >
                      ✓ RESOLVE
                    </Btn>

                    {selectedCase.lat &&
                      selectedCase.lng && (
                        <Btn
                          col="#F59E0B"
                          onClick={() =>
                            window.open(
                              `https://maps.google.com/?daddr=${selectedCase.lat},${selectedCase.lng}`
                            )
                          }
                        >
                          🗺 OPEN MAP
                        </Btn>
                      )}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    height: "100%",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    color: "#666",
                    fontSize: 14
                  }}
                >
                  Select an incident from the queue.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ================= CALL MODAL ================= */}

      {callModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeCallModal();
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.8)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 999
          }}
        >
          <div
            style={{
              width: 360,
              background: "#141414",
              borderRadius: 12,
              padding: 30,
              border: ".5px solid rgba(255,255,255,.1)",
              textAlign: "center"
            }}
          >
            <div
              style={{
                fontSize: 48,
                marginBottom: 20
              }}
            >
              📞
            </div>

            <div
              style={{
                fontSize: 24,
                fontFamily: "'Bebas Neue',sans-serif",
                letterSpacing: 2,
                color: "#F59E0B"
              }}
            >
              {callPhase === "connecting"
                ? "CONNECTING..."
                : "VOICE CHANNEL"}
            </div>

            <div
              style={{
                marginTop: 12,
                color: "#777",
                lineHeight: 1.6,
                fontSize: 13
              }}
            >
              {callPhase === "connecting" ? (
                <>Requesting microphone access for {callModal.title}...</>
              ) : (
                <>
                  Mock voice channel open with{" "}
                  {callModal.title} ({callModal.loc}).
                  <br />
                  No live audio backend is connected yet.
                </>
              )}
            </div>

            {callPhase === "connecting" && (
              <div
                style={{
                  marginTop: 20,
                  display: "flex",
                  justifyContent: "center"
                }}
              >
                <Spinner size={20} />
              </div>
            )}

            <button
              onClick={closeCallModal}
              style={{
                marginTop: 24,
                padding: "10px 20px",
                border: "none",
                borderRadius: 8,
                background: "#222",
                color: "#ddd",
                cursor: "pointer",
                fontSize: 12
              }}
            >
              END CALL
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color = "#AAA" }) {
  return (
    <div style={{ textAlign: "right" }}>
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color
        }}
      >
        {value}
      </div>

      <div
        style={{
          fontSize: 9,
          color: "#555",
          letterSpacing: 1
        }}
      >
        {label}
      </div>
    </div>
  );
}

function InfoRow({ label, value, color = "#DDD" }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "8px 0",
        borderBottom: ".5px solid rgba(255,255,255,.06)",
        fontSize: 12
      }}
    >
      <span style={{ color: "#777" }}>{label}</span>
      <span style={{ color, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function Btn({ col, onClick, disabled, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: 12,
        border: `.5px solid ${col}55`,
        borderRadius: 8,
        background: disabled ? `${col}22` : `${col}15`,
        color: col,
        cursor: disabled ? "default" : "pointer",
        fontWeight: 600,
        fontSize: 12,
        opacity: disabled ? 0.8 : 1
      }}
    >
      {children}
    </button>
  );
}