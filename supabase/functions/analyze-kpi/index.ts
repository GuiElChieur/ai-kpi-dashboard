import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type JsonRow = Record<string, unknown>;

function firstValue(row: JsonRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

function pickString(row: JsonRow, keys: string[]) {
  const value = firstValue(row, keys);
  return value == null ? "" : String(value);
}

function pickNumber(row: JsonRow, keys: string[]) {
  const value = firstValue(row, keys);
  if (value == null || value === "") return 0;

  const n = Number(String(value).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function pickDate(row: JsonRow, keys: string[]) {
  const value = firstValue(row, keys);
  if (!value) return null;

  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatNumber(value: number, digits = 2) {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatDate(date: Date | null) {
  if (!date) return "non renseignée";
  return date.toLocaleDateString("fr-FR");
}

function buildOtLignesContext(rows: JsonRow[]) {
  const now = new Date();

  const normalized = rows.map((row) => {
    const ot = pickString(row, ["ot", "ot_numero", "numero_ot", "code_ot", "id"]) || "OT inconnu";
    const statut = pickString(row, ["statut", "status", "etat"]) || "non renseigné";

    const chargePrevue = pickNumber(row, ["charge_prevue", "charge_planifiee", "heures_prevues", "temps_prevu"]);

    const chargeReelle = pickNumber(row, ["charge_reelle", "charge_realisee", "heures_reelles", "temps_passe"]);

    const budgetPrevu = pickNumber(row, ["budget_prevu", "cout_prevu", "montant_budget"]);

    const coutReel = pickNumber(row, ["cout_reel", "cout_actuel", "cout_consomme", "depense_reelle"]);

    const dateFinPrevue = pickDate(row, ["date_fin_prevue", "date_echeance", "echeance", "planned_end_date"]);

    const dateFinReelle = pickDate(row, ["date_fin_reelle", "date_cloture", "completed_at", "closed_at"]);

    const matierePrevue = pickNumber(row, ["matiere_prevue", "quantite_matiere_prevue", "objectif_matiere"]);

    const matiereSortie = pickNumber(row, ["matiere_sortie", "quantite_sortie", "sortie_matiere"]);

    const tauxSortieDirect = pickNumber(row, ["taux_sortie_matieres", "rendement_matiere", "taux_sortie"]);

    const cloture = /termin|cl[oô]tur|ferm|done|completed|closed/i.test(statut) || !!dateFinReelle;

    const retardJours =
      dateFinPrevue && !cloture ? Math.max(0, Math.floor((now.getTime() - dateFinPrevue.getTime()) / 86400000)) : 0;

    const ecartChargePct = chargePrevue > 0 ? ((chargeReelle - chargePrevue) / chargePrevue) * 100 : 0;

    const ecartBudgetPct = budgetPrevu > 0 ? ((coutReel - budgetPrevu) / budgetPrevu) * 100 : 0;

    const tauxSortieMatieres =
      tauxSortieDirect > 0 ? tauxSortieDirect : matierePrevue > 0 ? (matiereSortie / matierePrevue) * 100 : 0;

    const criticiteScore =
      retardJours * 5 +
      Math.max(0, ecartBudgetPct) +
      Math.abs(ecartChargePct) * 0.5 +
      Math.max(0, 80 - tauxSortieMatieres);

    return {
      ot,
      statut,
      chargePrevue,
      chargeReelle,
      budgetPrevu,
      coutReel,
      dateFinPrevue,
      dateFinReelle,
      retardJours,
      ecartChargePct,
      ecartBudgetPct,
      tauxSortieMatieres,
      criticiteScore,
    };
  });

  const totalChargePrevue = normalized.reduce((sum, r) => sum + r.chargePrevue, 0);
  const totalChargeReelle = normalized.reduce((sum, r) => sum + r.chargeReelle, 0);
  const totalBudgetPrevu = normalized.reduce((sum, r) => sum + r.budgetPrevu, 0);
  const totalCoutReel = normalized.reduce((sum, r) => sum + r.coutReel, 0);

  const ecartChargeGlobalPct =
    totalChargePrevue > 0 ? ((totalChargeReelle - totalChargePrevue) / totalChargePrevue) * 100 : 0;

  const ecartBudgetGlobalPct = totalBudgetPrevu > 0 ? ((totalCoutReel - totalBudgetPrevu) / totalBudgetPrevu) * 100 : 0;

  const otEnRetard = normalized.filter((r) => r.retardJours > 0).sort((a, b) => b.retardJours - a.retardJours);

  const derivesCharge = normalized
    .filter((r) => r.chargePrevue > 0 && Math.abs(r.ecartChargePct) >= 20)
    .sort((a, b) => Math.abs(b.ecartChargePct) - Math.abs(a.ecartChargePct));

  const derivesBudget = normalized
    .filter((r) => r.budgetPrevu > 0 && r.ecartBudgetPct >= 10)
    .sort((a, b) => b.ecartBudgetPct - a.ecartBudgetPct);

  const faiblesSortiesMatieres = normalized
    .filter((r) => r.tauxSortieMatieres > 0 && r.tauxSortieMatieres < 80)
    .sort((a, b) => a.tauxSortieMatieres - b.tauxSortieMatieres);

  const repartitionStatuts = Object.entries(
    normalized.reduce<Record<string, number>>((acc, row) => {
      acc[row.statut] = (acc[row.statut] || 0) + 1;
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .map(([statut, count]) => `${statut}: ${count}`)
    .join(", ");

  const topRisques = [...normalized]
    .sort((a, b) => b.criticiteScore - a.criticiteScore)
    .slice(0, 12)
    .map((r) => ({
      ot: r.ot,
      statut: r.statut,
      date_fin_prevue: r.dateFinPrevue ? r.dateFinPrevue.toISOString() : null,
      retard_jours: r.retardJours,
      charge_prevue: Number(r.chargePrevue.toFixed(2)),
      charge_reelle: Number(r.chargeReelle.toFixed(2)),
      ecart_charge_pct: Number(r.ecartChargePct.toFixed(1)),
      budget_prevu: Number(r.budgetPrevu.toFixed(2)),
      cout_reel: Number(r.coutReel.toFixed(2)),
      ecart_budget_pct: Number(r.ecartBudgetPct.toFixed(1)),
      taux_sortie_matieres_pct: Number(r.tauxSortieMatieres.toFixed(1)),
    }));

  return `
=== CONTEXTE DETAILLE OT_LIGNES ===

Nombre de lignes OT analysées : ${rows.length}
Répartition des statuts : ${repartitionStatuts || "non renseignée"}

Charge prévue totale : ${formatNumber(totalChargePrevue)} h
Charge réelle totale : ${formatNumber(totalChargeReelle)} h
Écart global de charge : ${formatNumber(ecartChargeGlobalPct, 1)} %

Budget prévu total : ${formatNumber(totalBudgetPrevu)} €
Coût réel total : ${formatNumber(totalCoutReel)} €
Dérive budget globale : ${formatNumber(ecartBudgetGlobalPct, 1)} %

Nombre d'OT en retard : ${otEnRetard.length}
Nombre d'écarts de charge significatifs (>= 20 %) : ${derivesCharge.length}
Nombre de dérives budget significatives (>= 10 %) : ${derivesBudget.length}
Nombre de taux de sortie matières faibles (< 80 %) : ${faiblesSortiesMatieres.length}

Top OT en retard :
${
  otEnRetard
    .slice(0, 10)
    .map((r) => `- ${r.ot} | statut=${r.statut} | échéance=${formatDate(r.dateFinPrevue)} | retard=${r.retardJours} j`)
    .join("\n") || "- Aucun"
}

Top dérives de charge :
${
  derivesCharge
    .slice(0, 10)
    .map(
      (r) =>
        `- ${r.ot} | prévu=${formatNumber(r.chargePrevue)} h | réel=${formatNumber(r.chargeReelle)} h | écart=${formatNumber(r.ecartChargePct, 1)} %`,
    )
    .join("\n") || "- Aucune"
}

Top dérives budget :
${
  derivesBudget
    .slice(0, 10)
    .map(
      (r) =>
        `- ${r.ot} | budget=${formatNumber(r.budgetPrevu)} € | réel=${formatNumber(r.coutReel)} € | dérive=${formatNumber(r.ecartBudgetPct, 1)} %`,
    )
    .join("\n") || "- Aucune"
}

Top faibles taux de sortie matières :
${
  faiblesSortiesMatieres
    .slice(0, 10)
    .map((r) => `- ${r.ot} | taux sortie matières=${formatNumber(r.tauxSortieMatieres, 1)} %`)
    .join("\n") || "- Aucun"
}

Échantillon structuré des OT les plus risqués :
${JSON.stringify(topRisques, null, 2)}
`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      messages = [],
      kpiSummary = "",
      projectId = 1935,
      projectColumn = "affaire_id", // <-- adapte ce nom à ton schéma réel
      limit = 1000,
    } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    let query = supabaseAdmin.from("ot_lignes").select("*").limit(limit) as any;

    if (projectId !== null && projectId !== undefined) {
      query = query.eq(projectColumn, projectId);
    }

    const { data: otLignes, error: otError } = await query;

    if (otError) {
      throw new Error(`Erreur lecture ot_lignes: ${otError.message}`);
    }

    const otContext = buildOtLignesContext((otLignes ?? []) as JsonRow[]);

    const systemPrompt = `Tu es un analyste industriel expert en pilotage d'activités.
Tu analyses le projet industriel ${projectId}.

Résumé KPI déjà calculé :
${kpiSummary || "Aucun résumé KPI fourni."}

Contexte détaillé extrait de la table ot_lignes :
${otContext}

Tes capacités :
1. Détection d'anomalies : OT en retard, écarts de charge, dérives budget, taux de sortie matières faibles
2. Résumés & recommandations : synthèse de l'état du projet avec recommandations actionnables
3. Prédictions : estimation de dates de fin et alertes préventives
4. Analyse libre : répondre à toute question sur les données

Consignes de réponse :
- Réponds toujours en français
- Utilise des chiffres précis
- Structure avec des titres, listes et points clés
- Classe les anomalies par criticité : 🔴 Critique, 🟡 Attention, 🟢 OK
- Cite explicitement les numéros d'OT concernés quand c'est possible
- Base-toi d'abord sur ot_lignes ; utilise kpiSummary comme complément
- Si une information n'existe pas dans les données, dis-le clairement`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Limite de requêtes atteinte, veuillez réessayer dans quelques instants.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            error: "Crédits insuffisants. Ajoutez des crédits dans les paramètres Lovable.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const t = await response.text();
      console.error("AI gateway error:", response.status, t);

      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (e) {
    console.error("analyze-kpi error:", e);

    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
