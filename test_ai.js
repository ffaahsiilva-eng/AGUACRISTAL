const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function test() {
  console.log("Calling AI...");
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: "Hello",
    });
    console.log("Success:", response.text);
  } catch (e) {
    console.log("Error:", e.message, e.status);
  }
}
test();
