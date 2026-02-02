import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY is missing. Gemini features will not work.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateIceBreaker = async (theme: string): Promise<string> => {
  const ai = getClient();
  if (!ai) return "API 키가 설정되지 않아 아이스브레이킹 주제를 불러올 수 없습니다.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a fun, light-hearted, and trendy ice-breaking question or topic for university students in Korea meeting for a blind date. The theme is "${theme}". Keep it short (under 2 sentences) and in Korean. Don't add quotes.`,
    });

    return response.text || "서로의 첫인상은 어땠나요? (기본 질문)";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "가장 좋아하는 여행지는 어디인가요? (오류 대체 질문)";
  }
};
