import { useState, useEffect } from "react";

const STEPS = [
  { label: "Le terrain", icon: "MapPin" },
  { label: "Tarifs & dispo", icon: "Banknote" },
  { label: "Photos & équipements", icon: "Camera" },
];

const SPORTS = ["Football", "Basketball", "Tennis", "Handball", "Volleyball"];
const SURFACES = ["Gazon naturel", "Gazon synthétique", "Terre battue", "Béton", "Sable"];
const FORMATS = ["5v5", "7v7", "8v8", "11v11"];
const AMENITIES = [
  { id: "vestiaires", label: "Vestiaires", icon: "🚿" },
  { id: "parking", label: "Parking", icon: "🅿️" },
  { id: "eclairage", label: "Éclairage", icon: "💡" },
  { id: "tribunes", label: "Tribunes", icon: "🏟️" },
  { id: "buvette", label: "Buvette", icon: "🥤" },
  { id: "toilettes", label: "Toilettes", icon: "🚻" },
  { id: "wifi", label: "Wi-Fi", icon: "📶" },
  { id: "gardien", label: "Gardien", icon: "👮" },
  { id: "premier_secours", label: "1ers secours", icon: "🩹" },
  { id: "sono", label: "Sonorisation", icon: "🔊" },
  { id: "camera", label: "Caméra", icon: "📹" },
];

// Colors matching PISport green theme
const colors = {
  primary: "#16a34a",
  primaryLight: "#22c55e",
  primaryDark: "#15803d",
  primaryBg: "#f0fdf4",
  primaryBorder: "#bbf7d0",
  muted: "#94a3b8",
  mutedBg: "#f1f5f9",
  mutedBorder: "#e2e8f0",
  text: "#0f172a",
  textMuted: "#64748b",
  white: "#ffffff",
  border: "#e2e8f0",
  destructive: "#ef4444",
  bg: "#f8fafc",
};

function FormStepper({ steps, currentStep }) {
  const progress = ((currentStep + 1) / steps.length) * 100;
  return (
    <div style={{ padding: "20px 0 8px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 16 }}>
        {steps.map((step, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 80 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  fontWeight: 600,
                  color: i <= currentStep ? colors.white : colors.muted,
                  background: i < currentStep ? colors.primaryLight : i === currentStep ? colors.primary : colors.mutedBg,
                  border: `2px solid ${i <= currentStep ? colors.primary : colors.mutedBorder}`,
                  transition: "all 0.3s ease",
                  boxShadow: i === currentStep ? `0 0 0 4px ${colors.primaryBg}` : "none",
                }}
              >
                {i < currentStep ? "✓" : i + 1}
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: i === currentStep ? 600 : 400,
                  color: i === currentStep ? colors.primary : colors.textMuted,
                  marginTop: 6,
                  whiteSpace: "nowrap",
                }}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                style={{
                  width: 64,
                  height: 2,
                  background: i < currentStep ? colors.primaryLight : colors.mutedBorder,
                  marginBottom: 22,
                  transition: "background 0.3s ease",
                }}
              />
            )}
          </div>
        ))}
      </div>
      <div style={{ height: 4, background: colors.mutedBg, borderRadius: 4, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${colors.primary}, ${colors.primaryLight})`,
            borderRadius: 4,
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}

function Input({ label, placeholder, value, onChange, type = "text", required, helpText, fullWidth }) {
  return (
    <div style={{ flex: fullWidth ? "1 1 100%" : "1 1 calc(50% - 8px)", minWidth: fullWidth ? "100%" : 200 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: colors.text, marginBottom: 4 }}>
        {label} {required && <span style={{ color: colors.destructive }}>*</span>}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "8px 12px",
          borderRadius: 8,
          border: `1px solid ${colors.border}`,
          fontSize: 14,
          outline: "none",
          transition: "border-color 0.2s",
          boxSizing: "border-box",
          background: colors.white,
        }}
        onFocus={(e) => (e.target.style.borderColor = colors.primary)}
        onBlur={(e) => (e.target.style.borderColor = colors.border)}
      />
      {helpText && <p style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{helpText}</p>}
    </div>
  );
}

function Select({ label, options, value, onChange, required }) {
  return (
    <div style={{ flex: "1 1 calc(50% - 8px)", minWidth: 200 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: colors.text, marginBottom: 4 }}>
        {label} {required && <span style={{ color: colors.destructive }}>*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "8px 12px",
          borderRadius: 8,
          border: `1px solid ${colors.border}`,
          fontSize: 14,
          background: colors.white,
          outline: "none",
          cursor: "pointer",
          appearance: "auto",
        }}
      >
        <option value="">Sélectionner...</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

// ── STEP 1: Le terrain ──
function StepTerrain({ data, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        <Select label="Sport" options={SPORTS} value={data.sport} onChange={(v) => onChange("sport", v)} required />
        <Input label="Nom du terrain" placeholder="ex: Terrain Omnisport Adjamé" value={data.name} onChange={(v) => onChange("name", v)} required />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        <Select label="Type de surface" options={SURFACES} value={data.surface} onChange={(v) => onChange("surface", v)} required />
        <Select label="Format / Capacité" options={FORMATS} value={data.format} onChange={(v) => onChange("format", v)} required />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        <Input label="Quartier / Commune" placeholder="ex: Cocody" value={data.quartier} onChange={(v) => onChange("quartier", v)} required />
        <Input label="Ville" placeholder="ex: Abidjan" value={data.ville} onChange={(v) => onChange("ville", v)} required />
      </div>
      <Input
        label="Adresse complète"
        placeholder="ex: Boulevard Latrille, Cocody, Abidjan"
        value={data.adresse}
        onChange={(v) => onChange("adresse", v)}
        required
        fullWidth
        helpText="L'adresse sera utilisée pour localiser votre terrain sur la carte"
      />

      {/* Geocoding status */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button
          style={{
            padding: "6px 14px",
            borderRadius: 8,
            border: `1px solid ${colors.primaryBorder}`,
            background: colors.primaryBg,
            color: colors.primaryDark,
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          📍 Localiser l'adresse
        </button>
        <button
          style={{
            padding: "6px 14px",
            borderRadius: 8,
            border: `1px solid ${colors.mutedBorder}`,
            background: colors.white,
            color: colors.textMuted,
            fontSize: 13,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          🎯 Utiliser ma position
        </button>
        {data.adresse && data.ville && (
          <span style={{ fontSize: 12, color: colors.primaryDark, background: colors.primaryBg, padding: "4px 10px", borderRadius: 12 }}>
            ✓ Adresse localisée
          </span>
        )}
      </div>

      <div>
        <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: colors.text, marginBottom: 4 }}>Description</label>
        <textarea
          rows={3}
          placeholder="Décrivez votre terrain (surface, dimensions, particularités...)"
          value={data.description}
          onChange={(e) => onChange("description", e.target.value)}
          style={{
            width: "100%",
            padding: "8px 12px",
            borderRadius: 8,
            border: `1px solid ${colors.border}`,
            fontSize: 14,
            resize: "vertical",
            fontFamily: "inherit",
            boxSizing: "border-box",
            outline: "none",
          }}
          onFocus={(e) => (e.target.style.borderColor = colors.primary)}
          onBlur={(e) => (e.target.style.borderColor = colors.border)}
        />
      </div>
    </div>
  );
}

// ── STEP 2: Tarifs & disponibilité ──
function PricingRow({ label, netPrice, publicPrice, onNetChange, onPublicChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: colors.text, minWidth: 40 }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 240 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <input
            type="number"
            placeholder="Prix net"
            value={netPrice}
            onChange={(e) => onNetChange(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 50px 8px 12px",
              borderRadius: 8,
              border: `1px solid ${colors.primaryBorder}`,
              fontSize: 14,
              outline: "none",
              background: colors.primaryBg,
              boxSizing: "border-box",
            }}
          />
          <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: colors.textMuted }}>FCFA</span>
        </div>
        <span style={{ fontSize: 18, color: colors.muted }}>→</span>
        <div style={{ flex: 1, position: "relative" }}>
          <input
            type="number"
            placeholder="Prix public"
            value={publicPrice}
            onChange={(e) => onPublicChange(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 50px 8px 12px",
              borderRadius: 8,
              border: `1px solid ${colors.border}`,
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: colors.textMuted }}>FCFA</span>
        </div>
      </div>
    </div>
  );
}

function StepTarifs({ data, onChange }) {
  const [prices, setPrices] = useState({
    net1h: "5000", public1h: "5150",
    net1h30: "7000", public1h30: "7210",
    net2h: "9000", public2h: "9270",
  });

  const updateNet = (key, val) => {
    const pub = val ? Math.round(Number(val) * 1.03) : "";
    setPrices((p) => ({ ...p, [key]: val, [key.replace("net", "public")]: pub.toString() }));
  };

  const updatePublic = (key, val) => {
    const net = val ? Math.round(Number(val) / 1.03) : "";
    setPrices((p) => ({ ...p, [key]: val, [key.replace("public", "net")]: net.toString() }));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Pricing section */}
      <div>
        <div style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: colors.text, margin: 0 }}>
            Tarification <span style={{ fontSize: 12, fontWeight: 400, color: colors.textMuted }}>(commission 3%)</span>
          </h3>
          <p style={{ fontSize: 12, color: colors.textMuted, margin: "2px 0 0" }}>
            Net = ce que vous touchez &nbsp;|&nbsp; Public = prix affiché au client
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <PricingRow label="1h" netPrice={prices.net1h} publicPrice={prices.public1h} onNetChange={(v) => updateNet("net1h", v)} onPublicChange={(v) => updatePublic("public1h", v)} />
          <PricingRow label="1h30" netPrice={prices.net1h30} publicPrice={prices.public1h30} onNetChange={(v) => updateNet("net1h30", v)} onPublicChange={(v) => updatePublic("public1h30", v)} />
          <PricingRow label="2h" netPrice={prices.net2h} publicPrice={prices.public2h} onNetChange={(v) => updateNet("net2h", v)} onPublicChange={(v) => updatePublic("public2h", v)} />
        </div>
        <p style={{ fontSize: 11, color: colors.textMuted, marginTop: 6 }}>
          Modifiez un prix net ou public — l'autre se recalcule automatiquement
        </p>
      </div>

      {/* Separator */}
      <div style={{ height: 1, background: colors.border }} />

      {/* Schedule section */}
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: colors.text, margin: "0 0 12px" }}>Horaires d'ouverture</h3>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 calc(50% - 8px)", minWidth: 160 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: colors.text, marginBottom: 4 }}>Ouverture</label>
            <input
              type="time"
              value={data.openTime || "07:00"}
              onChange={(e) => onChange("openTime", e.target.value)}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${colors.border}`, fontSize: 14, boxSizing: "border-box" }}
            />
          </div>
          <div style={{ flex: "1 1 calc(50% - 8px)", minWidth: 160 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: colors.text, marginBottom: 4 }}>Fermeture</label>
            <input
              type="time"
              value={data.closeTime || "22:00"}
              onChange={(e) => onChange("closeTime", e.target.value)}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${colors.border}`, fontSize: 14, boxSizing: "border-box" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── STEP 3: Photos & équipements ──
function StepPhotos({ data, onChange }) {
  const [selectedAmenities, setSelectedAmenities] = useState(["eclairage", "parking", "vestiaires"]);

  const toggleAmenity = (id) => {
    setSelectedAmenities((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Photos */}
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: colors.text, margin: "0 0 12px" }}>Photos du terrain</h3>
        <div
          style={{
            border: `2px dashed ${colors.primaryBorder}`,
            borderRadius: 12,
            padding: 32,
            textAlign: "center",
            background: colors.primaryBg,
            cursor: "pointer",
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 8 }}>📸</div>
          <p style={{ fontSize: 14, fontWeight: 500, color: colors.primaryDark, margin: 0 }}>
            Cliquez ou glissez vos photos ici
          </p>
          <p style={{ fontSize: 12, color: colors.textMuted, margin: "4px 0 0" }}>PNG, JPG jusqu'à 5 Mo • 5 photos max</p>
        </div>
        {/* Preview thumbnails */}
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: 72,
                height: 54,
                borderRadius: 8,
                background: `linear-gradient(135deg, ${colors.primaryBg}, ${colors.mutedBg})`,
                border: `1px solid ${colors.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                color: colors.textMuted,
              }}
            >
              photo {i}
            </div>
          ))}
        </div>
      </div>

      {/* Separator */}
      <div style={{ height: 1, background: colors.border }} />

      {/* Amenities */}
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: colors.text, margin: "0 0 12px" }}>Équipements disponibles</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {AMENITIES.map((amenity) => {
            const selected = selectedAmenities.includes(amenity.id);
            return (
              <button
                key={amenity.id}
                onClick={() => toggleAmenity(amenity.id)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: `1.5px solid ${selected ? colors.primary : colors.mutedBorder}`,
                  background: selected ? colors.primaryBg : colors.white,
                  color: selected ? colors.primaryDark : colors.textMuted,
                  fontSize: 13,
                  fontWeight: selected ? 500 : 400,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.15s ease",
                }}
              >
                <span>{amenity.icon}</span>
                {amenity.label}
                {selected && <span style={{ fontSize: 14 }}>✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Separator */}
      <div style={{ height: 1, background: colors.border }} />

      {/* Payout account */}
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: colors.text, margin: "0 0 12px" }}>Compte de paiement</h3>
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            border: `1px solid ${colors.primaryBorder}`,
            background: colors.primaryBg,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: colors.primary, display: "flex", alignItems: "center", justifyContent: "center", color: colors.white, fontSize: 18 }}>
            💰
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, color: colors.text, margin: 0 }}>Orange Money • +225 07 XX XX XX XX</p>
            <p style={{ fontSize: 12, color: colors.textMuted, margin: "2px 0 0" }}>Compte par défaut • Vérifié ✓</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MAIN WIZARD ──
export default function FieldWizardPreview() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    sport: "", name: "", surface: "", format: "",
    quartier: "", ville: "", adresse: "", description: "",
    openTime: "07:00", closeTime: "22:00",
  });

  const onChange = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  const canProceed = () => {
    if (currentStep === 0) {
      return formData.sport && formData.name && formData.surface && formData.format && formData.quartier && formData.ville && formData.adresse;
    }
    return true;
  };

  return (
    <div style={{ minHeight: "100vh", background: colors.bg, padding: "24px 16px", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        {/* Card */}
        <div style={{ background: colors.white, borderRadius: 16, border: `1px solid ${colors.border}`, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          {/* Header */}
          <div style={{ padding: "20px 24px 0" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: colors.text, margin: 0 }}>Ajouter un terrain</h2>
            <p style={{ fontSize: 13, color: colors.textMuted, margin: "4px 0 0" }}>
              Remplissez les informations en 3 étapes simples
            </p>
            <FormStepper steps={STEPS} currentStep={currentStep} />
          </div>

          {/* Step content */}
          <div style={{ padding: "20px 24px" }}>
            {currentStep === 0 && <StepTerrain data={formData} onChange={onChange} />}
            {currentStep === 1 && <StepTarifs data={formData} onChange={onChange} />}
            {currentStep === 2 && <StepPhotos data={formData} onChange={onChange} />}
          </div>

          {/* Footer - Navigation */}
          <div
            style={{
              padding: "16px 24px",
              borderTop: `1px solid ${colors.border}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: colors.bg,
            }}
          >
            <button
              onClick={() => setCurrentStep((s) => s - 1)}
              disabled={currentStep === 0}
              style={{
                padding: "10px 20px",
                borderRadius: 10,
                border: `1px solid ${colors.border}`,
                background: colors.white,
                color: currentStep === 0 ? colors.muted : colors.text,
                fontSize: 14,
                fontWeight: 500,
                cursor: currentStep === 0 ? "not-allowed" : "pointer",
                opacity: currentStep === 0 ? 0.5 : 1,
              }}
            >
              ← Précédent
            </button>

            <span style={{ fontSize: 12, color: colors.textMuted }}>
              Étape {currentStep + 1} sur {STEPS.length}
            </span>

            {currentStep < STEPS.length - 1 ? (
              <button
                onClick={() => setCurrentStep((s) => s + 1)}
                disabled={!canProceed()}
                style={{
                  padding: "10px 24px",
                  borderRadius: 10,
                  border: "none",
                  background: canProceed() ? colors.primary : colors.muted,
                  color: colors.white,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: canProceed() ? "pointer" : "not-allowed",
                  boxShadow: canProceed() ? "0 2px 8px rgba(22,163,74,0.3)" : "none",
                }}
              >
                Suivant →
              </button>
            ) : (
              <button
                style={{
                  padding: "10px 24px",
                  borderRadius: 10,
                  border: "none",
                  background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
                  color: colors.white,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(22,163,74,0.3)",
                }}
              >
                ✓ Créer le terrain
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
