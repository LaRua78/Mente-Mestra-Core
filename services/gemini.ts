
// @google/genai Coding Guidelines followed:
// - Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
// - Use response.text property (not method).
// - Model names correctly chosen (gemini-3-pro-preview, gemini-3-flash-preview, gemini-2.5-flash-preview-tts).
// - Function calling and grounding chunks extraction.

import { GoogleGenAI, Type, Modality } from "@google/genai";

export class GeminiService {
  private getAI() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async generateAnalysis(prompt: string, context?: string): Promise<{ text: string, sources?: { title: string, uri: string }[] }> {
    try {
      const ai = this.getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `${context ? `Contexto anterior: ${context}\n\n` : ''}${prompt}`,
        config: {
          tools: [{ googleSearch: {} }],
          temperature: 0.1,
          systemInstruction: `És um analista sénior de apostas desportivas (EV+). 
          Estilo: Frio, racional, direto, Português de Portugal (PT-PT). 
          Foca-te em probabilidades implícitas vs reais. 
          Pesquisa odds atuais em casas portuguesas (Betclic, Placard, etc) via Google Search.
          Se não houver valor, diz claramente "Sem Valor".
          Identifica riscos (lesões, clima, motivação). Todas as respostas OBRIGATORIAMENTE em Português de Portugal (PT-PT).`
        }
      });

      // Extract grounding chunks for source attribution as required, ensuring type safety
      const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const groundingChunks = (Array.isArray(rawChunks) ? rawChunks : []) as any[];
      
      const sources = groundingChunks
        .filter((chunk: any) => chunk.web)
        .map((chunk: any) => ({
          title: chunk.web.title,
          uri: chunk.web.uri
        }));

      return {
        text: response.text || "Erro ao gerar análise.",
        sources: sources.length > 0 ? sources : undefined
      };
    } catch (error: any) {
      if (error?.message?.includes("Requested entity was not found")) {
        throw new Error("KEY_NOT_FOUND");
      }
      throw error;
    }
  }

  // Improved speech generation prompt for European Portuguese accent as per user requirement
  async generateSpeech(text: string): Promise<string | undefined> {
    try {
      const ai = this.getAI();
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        // Enforcing European Portuguese phonetics (PT-PT) via explicit prompt instruction
        contents: [{ parts: [{ text: `Lê o seguinte texto em Português de Portugal (PT-PT) com sotaque europeu nativo: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              // Kore is a robust voice that adapts well to PT-PT when prompted correctly
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });
      // Extracting audio data correctly from the response
      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    } catch (error) {
      console.error("Erro na síntese de voz:", error);
      return undefined;
    }
  }

  static decodeBase64(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  static async decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number = 24000,
    numChannels: number = 1
  ): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  }

  async parseManualGames(text: string): Promise<any[]> {
    try {
      const ai = this.getAI();
      const prompt = `Analisa o seguinte texto e extrai apenas os jogos de futebol mencionados. 
      Devolve um array JSON com esta estrutura: [{"homeTeam": "...", "awayTeam": "...", "time": "HH:mm", "league": "..."}]. 
      Assume que se não houver liga, é uma liga principal. Texto: ${text}`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                homeTeam: { type: Type.STRING },
                awayTeam: { type: Type.STRING },
                time: { type: Type.STRING },
                league: { type: Type.STRING }
              },
              required: ["homeTeam", "awayTeam", "time", "league"]
            }
          }
        }
      });

      return JSON.parse(response.text || "[]");
    } catch (error) {
      console.error("Erro ao processar jogos manuais:", error);
      return [];
    }
  }

  // Optimized JSON extraction using explicit schema for structured betting results
  async generateJson(prompt: string): Promise<string> {
    try {
      const ai = this.getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              conclusion: { type: Type.STRING, description: 'Conclusão da aposta: Apostar, Passar ou Live' },
              recommendation: { type: Type.STRING, description: 'Mercado recomendado' },
              odds: { type: Type.STRING, description: 'Odds estimadas' },
              value: { type: Type.STRING, description: 'Indicação de valor EV+' },
              risk: { type: Type.STRING, description: 'Nível de risco' }
            },
            required: ["conclusion", "recommendation", "odds", "value", "risk"]
          }
        }
      });
      return response.text || "{}";
    } catch (error) {
      console.error("Erro na extração JSON:", error);
      return "{}";
    }
  }
}
