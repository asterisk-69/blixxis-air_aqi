import type { EnvironmentalContext } from '../types/environmental';

export interface ExplainRiskResult {
  risk_summary: string;
  key_drivers: string[];
  forecast_interpretation: string;
  confidence_note: string;
  monitoring_recommendation: string;
}

export interface GenerateInterventionResult {
  priority: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  rationale: string;
  actions: {
    priority: 'IMMEDIATE' | 'HIGH' | 'MEDIUM' | 'LOW';
    action: string;
    reason: string;
  }[];
  monitoring_recommendation: string;
  public_advisory_recommended: boolean;
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export const AIService = {
  /**
   * Calls Gemini to explain the forecast risk based on calculated context.
   */
  async explainRisk(context: EnvironmentalContext): Promise<ExplainRiskResult> {
    const response = await fetch(`${API_BASE_URL}/api/ai/explain-risk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(context),
    });

    if (!response.ok) {
      const errPayload = await response.json().catch(() => ({}));
      throw new Error(errPayload.error || `HTTP error! Status: ${response.status}`);
    }

    return response.json() as Promise<ExplainRiskResult>;
  },

  /**
   * Calls Gemini to generate an authority-facing intervention draft.
   */
  async generateIntervention(context: EnvironmentalContext): Promise<GenerateInterventionResult> {
    const response = await fetch(`${API_BASE_URL}/api/ai/generate-intervention`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(context),
    });

    if (!response.ok) {
      const errPayload = await response.json().catch(() => ({}));
      throw new Error(errPayload.error || `HTTP error! Status: ${response.status}`);
    }

    return response.json() as Promise<GenerateInterventionResult>;
  },
};
