import { useState } from "react";

// Icons as simple SVG components
const Shield = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ width: "1.25rem", height: "1.25rem" }}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const CreditCard = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ width: "1.25rem", height: "1.25rem" }}>
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
);

const Info = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ width: "0.875rem", height: "0.875rem" }}>
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
);

const CheckCircle = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ width: "2rem", height: "2rem" }}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

const MapPin = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ width: "1.25rem", height: "1.25rem" }}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);

const Calendar = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ width: "1.25rem", height: "1.25rem" }}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const Clock = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ width: "1.25rem", height: "1.25rem" }}>
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);

// =============================================
// PAGE 1: Interface de réservation (REDESIGN)
// =============================================
function BookingInterface() {
  const [paymentType, setPaymentType] = useState("full");

  // Données simulées
  const publicPrice = 14000;
  const operatorFee = 420;
  const totalFull = 14420;
  const depositPublic = 3000;
  const depositFee = 90;
  const totalDeposit = 3090;
  const balanceCash = 10800;

  return (
    <div style={{
      background: "white",
      borderRadius: "12px",
      border: "1px solid #e5e7eb",
      overflow: "hidden",
      maxWidth: "400px"
    }}>
      {/* Header */}
      <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #f3f4f6" }}>
        <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#111827", margin: 0 }}>
          Sélectionner les heures - jeudi 26 février 2026
        </h3>
      </div>

      <div style={{ padding: "16px 20px" }}>
        {/* Créneaux réservés */}
        <div style={{
          background: "#eff6ff",
          border: "1px solid #bfdbfe",
          borderRadius: "8px",
          padding: "10px 14px",
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <span style={{ fontSize: "13px", color: "#1e40af", fontWeight: "500" }}>Créneaux réservés</span>
          <span style={{ background: "#fee2e2", color: "#dc2626", fontSize: "12px", padding: "2px 8px", borderRadius: "4px", fontWeight: "500" }}>03:00-04:00</span>
          <span style={{ background: "#fee2e2", color: "#dc2626", fontSize: "12px", padding: "2px 8px", borderRadius: "4px", fontWeight: "500" }}>04:00-05:00</span>
        </div>

        {/* Sélecteurs d'heure */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: "13px", color: "#6b7280", display: "block", marginBottom: "4px" }}>Heure de début</label>
            <div style={{ border: "2px solid #3b82f6", borderRadius: "8px", padding: "10px 12px", fontSize: "14px", fontWeight: "500", color: "#111827" }}>05:00</div>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: "13px", color: "#6b7280", display: "block", marginBottom: "4px" }}>Heure de fin</label>
            <div style={{ border: "2px solid #3b82f6", borderRadius: "8px", padding: "10px 12px", fontSize: "14px", fontWeight: "500", color: "#111827" }}>06:00</div>
          </div>
        </div>

        {/* ===== NOUVEAU DESIGN : Sélecteur de mode de paiement ===== */}
        <p style={{ fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "10px" }}>
          Mode de paiement :
        </p>

        {/* Option 1: Paiement complet */}
        <div
          onClick={() => setPaymentType("full")}
          style={{
            border: paymentType === "full" ? "2px solid #22c55e" : "1px solid #e5e7eb",
            background: paymentType === "full" ? "#f0fdf4" : "white",
            borderRadius: "10px",
            padding: "14px 16px",
            marginBottom: "8px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            transition: "all 0.15s ease"
          }}
        >
          {/* Radio */}
          <div style={{
            width: "18px", height: "18px", borderRadius: "50%",
            border: `2px solid ${paymentType === "full" ? "#22c55e" : "#d1d5db"}`,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
          }}>
            {paymentType === "full" && <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#22c55e" }} />}
          </div>
          <CreditCard className="" style={{ color: paymentType === "full" ? "#16a34a" : "#9ca3af" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>Paiement complet</div>
            <div style={{ fontSize: "12px", color: "#6b7280" }}>Tout régler en ligne</div>
          </div>
          <span style={{ fontSize: "14px", fontWeight: "700", color: "#111827" }}>14 420 XOF</span>
        </div>

        {/* Option 2: Garantie Terrain Bloqué */}
        <div
          onClick={() => setPaymentType("deposit")}
          style={{
            border: paymentType === "deposit" ? "2px solid #22c55e" : "1px solid #e5e7eb",
            background: paymentType === "deposit" ? "#f0fdf4" : "white",
            borderRadius: "10px",
            padding: "14px 16px",
            marginBottom: "16px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            transition: "all 0.15s ease"
          }}
        >
          {/* Radio */}
          <div style={{
            width: "18px", height: "18px", borderRadius: "50%",
            border: `2px solid ${paymentType === "deposit" ? "#22c55e" : "#d1d5db"}`,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
          }}>
            {paymentType === "deposit" && <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#22c55e" }} />}
          </div>
          <Shield style={{ color: paymentType === "deposit" ? "#16a34a" : "#9ca3af" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>Garantie Terrain Bloqué</div>
            <div style={{ fontSize: "12px", color: "#6b7280" }}>Avance 20% + solde cash sur place</div>
          </div>
          <span style={{ fontSize: "14px", fontWeight: "700", color: "#111827" }}>3 090 XOF</span>
        </div>

        {/* ===== RÉCAPITULATIF UNIQUE (s'adapte au mode) ===== */}
        <div style={{
          background: "#f9fafb",
          borderRadius: "10px",
          padding: "16px",
          marginBottom: "16px"
        }}>
          {paymentType === "full" ? (
            // MODE PAIEMENT COMPLET
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <span style={{ color: "#6b7280" }}>Sous-total :</span>
                <span style={{ color: "#111827" }}>14 000 XOF</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <span style={{ color: "#6b7280" }}>Frais opérateurs (3%) :</span>
                <span style={{ color: "#6b7280" }}>420 XOF</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #e5e7eb", paddingTop: "8px" }}>
                <span style={{ fontSize: "14px", fontWeight: "600", color: "#374151" }}>Prix total :</span>
                <span style={{ fontSize: "18px", fontWeight: "700", color: "#16a34a" }}>14 420 XOF</span>
              </div>
            </div>
          ) : (
            // MODE GARANTIE
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <span style={{ color: "#6b7280" }}>Avance en ligne :</span>
                <span style={{ color: "#111827", fontWeight: "500" }}>3 000 XOF</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <span style={{ color: "#6b7280" }}>Frais opérateurs (3%) :</span>
                <span style={{ color: "#6b7280" }}>90 XOF</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #e5e7eb", paddingTop: "8px" }}>
                <span style={{ fontSize: "14px", fontWeight: "600", color: "#374151" }}>Total à payer maintenant :</span>
                <span style={{ fontSize: "18px", fontWeight: "700", color: "#059669" }}>3 090 XOF</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                <span style={{ fontSize: "13px", fontWeight: "600", color: "#ea580c" }}>Solde à régler sur place :</span>
                <span style={{ fontSize: "14px", fontWeight: "700", color: "#ea580c" }}>10 800 XOF</span>
              </div>
              {/* Info-box unique */}
              <div style={{
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: "6px",
                padding: "8px 10px",
                marginTop: "4px",
                display: "flex",
                alignItems: "flex-start",
                gap: "6px"
              }}>
                <Info style={{ color: "#2563eb", marginTop: "1px", flexShrink: 0 }} />
                <span style={{ fontSize: "12px", color: "#1d4ed8", lineHeight: "1.4" }}>
                  Présentez-vous au terrain et réglez le solde directement au propriétaire.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Bouton d'action */}
        {paymentType === "full" ? (
          <button style={{
            width: "100%",
            background: "#22c55e",
            color: "white",
            border: "none",
            borderRadius: "10px",
            padding: "14px",
            fontSize: "15px",
            fontWeight: "700",
            cursor: "pointer"
          }}>
            Réserver (14 420 XOF)
          </button>
        ) : (
          <button style={{
            width: "100%",
            background: "#059669",
            color: "white",
            border: "none",
            borderRadius: "10px",
            padding: "14px",
            fontSize: "15px",
            fontWeight: "700",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px"
          }}>
            <Shield style={{ color: "white" }} />
            Bloquer le terrain (3 090 XOF)
          </button>
        )}

        {/* Bouton cagnotte */}
        <button style={{
          width: "100%",
          background: "white",
          color: "#6b7280",
          border: "1px solid #e5e7eb",
          borderRadius: "10px",
          padding: "12px",
          fontSize: "14px",
          fontWeight: "500",
          cursor: "pointer",
          marginTop: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px"
        }}>
          <span>👥</span> Créer une cagnotte équipe
        </button>
      </div>
    </div>
  );
}

// =============================================
// PAGE 2: BookingSuccess (REDESIGN)
// =============================================
function BookingSuccessRedesign() {
  return (
    <div style={{ maxWidth: "560px", margin: "0 auto" }}>
      {/* Carte de succès */}
      <div style={{
        background: "white",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        padding: "32px",
        textAlign: "center",
        marginBottom: "16px"
      }}>
        <div style={{
          width: "64px", height: "64px",
          background: "#d1fae5",
          borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 16px"
        }}>
          <Shield style={{ color: "#059669", width: "32px", height: "32px" }} />
        </div>
        <h1 style={{ fontSize: "24px", fontWeight: "800", color: "#111827", margin: "0 0 8px" }}>
          Terrain bloqué !
        </h1>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          background: "#d1fae5", color: "#047857",
          fontSize: "13px", fontWeight: "600",
          padding: "4px 12px", borderRadius: "20px",
          marginBottom: "12px"
        }}>
          <Shield style={{ width: "14px", height: "14px" }} />
          Garantie Terrain Bloqué
        </span>
        <p style={{ fontSize: "14px", color: "#6b7280", margin: "8px 0 0" }}>
          Votre avance a été payée avec succès. Le terrain est bloqué pour vous.
        </p>
      </div>

      {/* Détails de la réservation (SIMPLIFIÉ) */}
      <div style={{
        background: "white",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        padding: "24px",
        marginBottom: "16px"
      }}>
        <h2 style={{ fontSize: "17px", fontWeight: "700", color: "#111827", margin: "0 0 16px" }}>
          Détails de votre réservation
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <MapPin style={{ color: "#9ca3af", flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>MySport</div>
              <div style={{ fontSize: "13px", color: "#6b7280" }}>Cocody, Abidjan</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Calendar style={{ color: "#9ca3af", flexShrink: 0 }} />
            <span style={{ fontSize: "14px", color: "#111827" }}>jeudi 26 février 2026</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Clock style={{ color: "#9ca3af", flexShrink: 0 }} />
            <span style={{ fontSize: "14px", color: "#111827" }}>05:00 - 06:00</span>
          </div>
        </div>

        {/* Séparateur + Prix */}
        <div style={{ borderTop: "1px solid #e5e7eb", marginTop: "16px", paddingTop: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <span style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>Avance payée en ligne</span>
            <span style={{ fontSize: "18px", fontWeight: "700", color: "#059669" }}>3 000 XOF</span>
          </div>

          {/* Solde cash - intégré dans la même carte */}
          <div style={{
            background: "#fff7ed",
            padding: "12px 14px",
            borderRadius: "8px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <span style={{ fontSize: "14px", fontWeight: "600", color: "#c2410c" }}>Solde à régler sur place</span>
            <span style={{ fontSize: "18px", fontWeight: "700", color: "#ea580c" }}>10 800 XOF</span>
          </div>

          {/* Info discrète */}
          <p style={{
            fontSize: "12px", color: "#9ca3af",
            margin: "10px 0 0",
            textAlign: "center",
            lineHeight: "1.4"
          }}>
            Présentez-vous au terrain et réglez le solde directement au propriétaire.
          </p>
        </div>
      </div>

      {/* Boutons d'action */}
      <div style={{ display: "flex", gap: "12px" }}>
        <button style={{
          flex: 1,
          background: "white",
          color: "#374151",
          border: "1px solid #d1d5db",
          borderRadius: "10px",
          padding: "12px",
          fontSize: "14px",
          fontWeight: "600",
          cursor: "pointer"
        }}>
          Voir mes réservations
        </button>
        <button style={{
          flex: 1,
          background: "#16a34a",
          color: "white",
          border: "none",
          borderRadius: "10px",
          padding: "12px",
          fontSize: "14px",
          fontWeight: "600",
          cursor: "pointer"
        }}>
          Découvrir d'autres terrains
        </button>
      </div>
    </div>
  );
}

// =============================================
// PAGE 3: Carte Mes Réservations (REDESIGN)
// =============================================
function BookingCardRedesign() {
  return (
    <div style={{
      background: "white",
      border: "1px solid #e5e7eb",
      borderRadius: "12px",
      padding: "16px",
      maxWidth: "400px"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
        <div>
          <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#111827", margin: "0 0 4px" }}>MySport</h3>
          <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>Cocody, Abidjan</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{
            background: "#d1fae5",
            color: "#047857",
            fontSize: "11px",
            fontWeight: "600",
            padding: "3px 8px",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            gap: "4px"
          }}>
            <Shield style={{ width: "12px", height: "12px" }} />
            Garantie
          </span>
          <span style={{
            background: "#dcfce7",
            color: "#15803d",
            fontSize: "11px",
            fontWeight: "600",
            padding: "3px 8px",
            borderRadius: "12px"
          }}>
            Confirmé
          </span>
        </div>
      </div>

      <div style={{ display: "flex", gap: "16px", fontSize: "13px", color: "#6b7280", marginBottom: "12px" }}>
        <span>📅 jeu. 26 fév. 2026</span>
        <span>🕐 05:00 - 06:00</span>
      </div>

      <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: "10px", display: "flex", flexDirection: "column", gap: "4px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
          <span style={{ color: "#6b7280" }}>Avance payée :</span>
          <span style={{ fontWeight: "600", color: "#059669" }}>3 000 XOF</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
          <span style={{ color: "#ea580c" }}>Solde restant (cash sur place) :</span>
          <span style={{ fontWeight: "600", color: "#ea580c" }}>10 800 XOF</span>
        </div>
      </div>
    </div>
  );
}

// =============================================
// MAIN: Affichage des 3 previews
// =============================================
export default function App() {
  const [activeTab, setActiveTab] = useState("booking");

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f8fafc",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      {/* Header */}
      <div style={{
        background: "white",
        borderBottom: "1px solid #e5e7eb",
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "24px"
      }}>
        <h1 style={{ fontSize: "16px", fontWeight: "700", color: "#111827", margin: 0 }}>
          Preview Redesign Garantie
        </h1>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        gap: "4px",
        padding: "12px 16px",
        background: "white",
        borderBottom: "1px solid #e5e7eb"
      }}>
        {[
          { id: "booking", label: "1. Réservation" },
          { id: "success", label: "2. Confirmation" },
          { id: "card", label: "3. Mes Réservations" }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              background: activeTab === tab.id ? "#059669" : "#f3f4f6",
              color: activeTab === tab.id ? "white" : "#6b7280",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.15s"
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "24px 16px", display: "flex", justifyContent: "center" }}>
        {activeTab === "booking" && (
          <div>
            <p style={{
              textAlign: "center",
              fontSize: "13px",
              color: "#9ca3af",
              marginBottom: "16px",
              maxWidth: "400px"
            }}>
              Clique sur les options de paiement pour voir le changement dynamique du récapitulatif. Plus de duplication !
            </p>
            <BookingInterface />
          </div>
        )}
        {activeTab === "success" && (
          <div>
            <p style={{
              textAlign: "center",
              fontSize: "13px",
              color: "#9ca3af",
              marginBottom: "16px",
              maxWidth: "560px"
            }}>
              Page simplifiée : plus de section "Informations importantes", horaires sans secondes, info solde intégrée.
            </p>
            <BookingSuccessRedesign />
          </div>
        )}
        {activeTab === "card" && (
          <div>
            <p style={{
              textAlign: "center",
              fontSize: "13px",
              color: "#9ca3af",
              marginBottom: "16px",
              maxWidth: "400px"
            }}>
              Carte de réservation avec badge "Garantie", avance payée et solde restant clairement indiqués.
            </p>
            <BookingCardRedesign />
          </div>
        )}
      </div>
    </div>
  );
}
