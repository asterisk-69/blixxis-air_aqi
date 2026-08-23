import { GoogleGenAI, Type } from '@google/genai';
import { EnvironmentalContext } from '../types/environmental';

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

export class GeminiService {
  private static ai: GoogleGenAI | null = null;

  private static getClient(): GoogleGenAI {
    if (!this.ai) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not defined in environment variables.');
      }
      this.ai = new GoogleGenAI({ apiKey });
    }
    return this.ai;
  }

  private static getModel(): string {
    return process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  }

  /**
   * Generates a structured explanation of the forecast risk based on calculated metrics.
   */
  static async explainRisk(context: EnvironmentalContext): Promise<ExplainRiskResult> {
    const ai = this.getClient();
    const model = this.getModel();

    const systemInstruction = `You are the environmental intelligence reasoning layer of BLiXXiS.

BLiXXiS provides calculated environmental measurements, hotspot scores, and forecasts.

Your responsibility is to interpret the supplied information and provide concise, evidence-grounded environmental reasoning.

You must not calculate or alter AQI values, hotspot scores, or forecasts.

You must not invent measurements, sensor readings, weather conditions, pollution sources, geographic facts, or causal relationships.

Use only information contained in the supplied context.

Clearly distinguish observed measurements, model-derived values (such as the BLiXXiS Pollutant-based Risk Score), forecasts, and recommendations. You must never treat or describe a DERIVED risk score or prototype indicator as an official observed regulatory AQI.

If important information is unavailable, explicitly state that it is unavailable.

Your output is decision support for environmental authorities, not an automated enforcement decision.`;

    const prompt = `Interpret the following calculated environmental data context:
${JSON.stringify(context, null, 2)}`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            risk_summary: {
              type: Type.STRING,
              description: 'A concise summary of the environmental risk at this location.'
            },
            key_drivers: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'The most important contributing signals/pollutants present in the supplied data.'
            },
            forecast_interpretation: {
              type: Type.STRING,
              description: 'An analysis of the predicted 6h, 12h, and 24h trends (improving vs deteriorating).'
            },
            confidence_note: {
              type: Type.STRING,
              description: 'A note on the model confidence and data density inputs.'
            },
            monitoring_recommendation: {
              type: Type.STRING,
              description: 'Actionable monitoring advice for the local environmental authorities.'
            }
          },
          required: [
            'risk_summary',
            'key_drivers',
            'forecast_interpretation',
            'confidence_note',
            'monitoring_recommendation'
          ]
        }
      }
    });

    if (!response.text) {
      throw new Error('Gemini returned an empty response.');
    }

    return JSON.parse(response.text.trim()) as ExplainRiskResult;
  }

  /**
   * Generates a structured authority-facing intervention draft.
   */
  static async generateIntervention(context: EnvironmentalContext): Promise<GenerateInterventionResult> {
    const ai = this.getClient();
    const model = this.getModel();

    const systemInstruction = `You are the environmental intelligence reasoning layer of BLiXXiS.

BLiXXiS provides calculated environmental measurements, hotspot scores, and forecasts.

Your responsibility is to interpret the supplied information and provide concise, evidence-grounded environmental reasoning and intervention recommendations.

You must not calculate or alter AQI values, hotspot scores, or forecasts.

You must not invent measurements, sensor readings, weather conditions, pollution sources, geographic facts, or causal relationships.

Use only information contained in the supplied context.

Clearly distinguish observed measurements, model-derived values (such as the BLiXXiS Pollutant-based Risk Score), forecasts, and recommendations. You must never treat or describe a DERIVED risk score or prototype indicator as an official observed regulatory AQI.

If important information is unavailable, explicitly state that it is unavailable.

Recommendations must be framed as recommendations, not confirmed facts. You must never invent or assume specific local pollution sources (such as a specific factory name or location) unless it is explicitly supplied in the context.

Your output is decision support for environmental authorities, not an automated enforcement decision.`;

    const prompt = `Formulate targeted, actionable intervention recommendations for environmental authorities based on this calculated context:
${JSON.stringify(context, null, 2)}`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            priority: {
              type: Type.STRING,
              enum: ['CRITICAL', 'HIGH', 'MODERATE', 'LOW'],
              description: 'Overall threat priority based on hotspot score and classification.'
            },
            rationale: {
              type: Type.STRING,
              description: 'Justification for the priority level based on the environmental metrics.'
            },
            actions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  priority: {
                    type: Type.STRING,
                    enum: ['IMMEDIATE', 'HIGH', 'MEDIUM', 'LOW'],
                    description: 'Action urgency.'
                  },
                  action: {
                    type: Type.STRING,
                    description: 'The recommended task or authority intervention (e.g. increase monitoring frequency, water spraying).'
                  },
                  reason: {
                    type: Type.STRING,
                    description: 'Why this specific action is recommended based on the data.'
                  }
                },
                required: ['priority', 'action', 'reason']
              },
              description: 'Suggested authority action list.'
            },
            monitoring_recommendation: {
              type: Type.STRING,
              description: 'Actionable monitoring protocol or metric tracking recommendation.'
            },
            public_advisory_recommended: {
              type: Type.BOOLEAN,
              description: 'True if a public safety health warning should be issued immediately.'
            }
          },
          required: [
            'priority',
            'rationale',
            'actions',
            'monitoring_recommendation',
            'public_advisory_recommended'
          ]
        }
      }
    });

    if (!response.text) {
      throw new Error('Gemini returned an empty response.');
    }

    return JSON.parse(response.text.trim()) as GenerateInterventionResult;
  }
}
