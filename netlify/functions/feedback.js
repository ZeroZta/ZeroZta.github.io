// Netlify Function: Gemini Feedback API
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only accept POST
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' }) 
    };
  }

  try {
    const { userDevelopment, equation, correctAnswer, userAnswer, isCorrect } = JSON.parse(event.body);

    if (!GEMINI_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'API key not configured' })
      };
    }

    let prompt;
    
    if (isCorrect) {
      prompt = `Eres un tutor de matemáticas amigable y alentador.

Ecuación: ${equation}
Respuesta correcta: x = ${correctAnswer}
Desarrollo del estudiante:
${userDevelopment}

El estudiante llegó a la respuesta correcta. Analiza su desarrollo:
- Si su método es directo y eficiente, elógialo
- Si usó un camino más largo pero válido, sugiere la forma más directa de forma constructiva
- Sé breve, máximo 3-4 líneas

Responde en español con formato HTML simple (usa <br> para saltos de línea, <strong> para negrita, <code> para ecuaciones). Incluye emojis apropiados.`;
    } else {
      prompt = `Eres un tutor de matemáticas paciente y claro.

Ecuación: ${equation}
Respuesta correcta: x = ${correctAnswer}
Respuesta del estudiante: x = ${userAnswer}
Desarrollo del estudiante:
${userDevelopment}

El estudiante NO llegó a la respuesta correcta. Analiza paso a paso:
1. Identifica en qué paso está el error
2. Explica qué hizo mal y por qué es incorrecto
3. Muestra el paso correcto
4. Sé constructivo, no crítico

Responde en español con formato HTML simple (usa <br> para saltos de línea, <strong> para negrita, <code> para ecuaciones). Incluye emojis apropiados.`;
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 500
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0]) {
      throw new Error('Invalid response from Gemini API');
    }

    const feedback = data.candidates[0].content.parts[0].text;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ feedback, isCorrect })
    };

  } catch (error) {
    console.error('Feedback function error:', error);
    
    // Fallback message
    const fallbackFeedback = isCorrect 
      ? `✅ ¡Correcto! x = ${correctAnswer}. ¡Bien hecho! 🎉`
      : `❌ Respuesta incorrecta. La respuesta correcta es x = ${correctAnswer}. Revisa tu desarrollo paso a paso.`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        feedback: fallbackFeedback,
        isCorrect,
        fallback: true,
        error: error.message 
      })
    };
  }
};
