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

    // Detectar tipo de problema
    const isSystem = equation && equation.includes(',');
    const isQuadratic = equation && (equation.includes('x²') || equation.includes('x^2') || equation.includes('²'));
    const hasMultipleSolutions = correctAnswer && correctAnswer.includes(',');
    
    let prompt;
    
    if (isCorrect) {
      if (isSystem) {
        // Sistema de ecuaciones - respuesta correcta
        prompt = `Eres un tutor de matemáticas amigable y alentador que da consejos prácticos de optimización.

Sistema de ecuaciones: ${equation}
Solución correcta: ${correctAnswer}
Desarrollo del estudiante:
${userDevelopment}

El estudiante resolvió correctamente el sistema. Analiza su desarrollo y da consejos específicos:
- Identifica qué método usó (sustitución, eliminación, igualación)
- Evalúa si fue el método más eficiente para este sistema
- Si hay pasos innecesarios, señálalos amablemente
- Sugiere optimizaciones: "Podrías haber eliminado y primero...", "La sustitución fue buena, pero..."
- Menciona patrones para futuros sistemas similares
- Máximo 4-5 líneas concisas

Responde en español con formato HTML simple (usa <br> para saltos de línea, <strong> para negrita, <code> para ecuaciones). Incluye emojis apropiados.`;
      } else if (isQuadratic || hasMultipleSolutions) {
        // Ecuación cuadrática - respuesta correcta con ambas soluciones
        prompt = `Eres un tutor de matemáticas amigable y alentador que da consejos prácticos de optimización.

Ecuación cuadrática: ${equation}
Soluciones correctas: x = ${correctAnswer}
Desarrollo del estudiante:
${userDevelopment}

El estudiante encontró ambas soluciones correctamente. Analiza su desarrollo:
- Identifica el método usado (factorización, fórmula cuadrática, raíz cuadrada, completar cuadrado)
- Evalúa si fue el método más eficiente para esta ecuación
- Si usó factorización: ¿Reconoció patrones? ¿Fue rápido?
- Si usó fórmula general: ¿Era necesario o había forma más directa?
- Si hay pasos innecesarios, señálalos
- Sugiere optimizaciones para ecuaciones similares
- Máximo 4-5 líneas concisas

Responde en español con formato HTML simple (usa <br> para saltos de línea, <strong> para negrita, <code> para ecuaciones). Incluye emojis apropiados.`;
      } else {
        // Ecuación lineal normal - respuesta correcta
        prompt = `Eres un tutor de matemáticas amigable y alentador que da consejos prácticos de optimización.

Ecuación: ${equation}
Respuesta correcta: x = ${correctAnswer}
Desarrollo del estudiante:
${userDevelopment}

El estudiante llegó a la respuesta correcta. Analiza su desarrollo y da consejos específicos:
- Si su método es directo y eficiente, elógialo enthusiasticamente
- Si hay pasos innecesarios (ej: operaciones que se cancelan, distribuciones que no aportan, movimientos redundantes), señálalos amablemente
- Sugiere optimizaciones concretas: "Podrías haber sumado primero...", "En el paso X pudiste...", "Eso te ahorraría Y pasos"
- Menciona patrones que puede aplicar a futuros ejercicios
- Sé específico sobre qué paso optimizar y cómo
- Máximo 4-5 líneas concisas

Responde en español con formato HTML simple (usa <br> para saltos de línea, <strong> para negrita, <code> para ecuaciones). Incluye emojis apropiados.`;
      }
    } else {
      if (isSystem) {
        // Sistema de ecuaciones - respuesta incorrecta
        prompt = `Eres un tutor de matemáticas paciente y claro que identifica errores y da consejos preventivos.

Sistema de ecuaciones: ${equation}
Solución correcta: ${correctAnswer}
Respuesta del estudiante: ${userAnswer}
Desarrollo del estudiante:
${userDevelopment}

El estudiante NO llegó a la solución correcta. Analiza paso a paso:
1. Identifica en qué paso del método está el error (sustitución, eliminación, despeje)
2. Explica qué hizo mal: ¿Error algebraico? ¿Signo incorrecto? ¿Variable mal despejada?
3. Muestra el paso correcto con las ecuaciones bien escritas
4. Da consejo de prevención específico para sistemas: "Al despejar recuerda...", "Verifica que ambas ecuaciones..."
5. Sé constructivo - enfatiza que los errores son parte del aprendizaje

Responde en español con formato HTML simple (usa <br> para saltos de línea, <strong> para negrita, <code> para ecuaciones). Incluye emojis apropiados.`;
      } else if (isQuadratic || hasMultipleSolutions) {
        // Ecuación cuadrática - respuesta incorrecta o incompleta
        prompt = `Eres un tutor de matemáticas paciente y claro que identifica errores y da consejos preventivos.

Ecuación cuadrática: ${equation}
Soluciones correctas: x = ${correctAnswer}
Respuesta del estudiante: x = ${userAnswer}
Desarrollo del estudiante:
${userDevelopment}

El estudiante NO llegó a ambas soluciones correctas. Analiza detalladamente:
1. ¿Mostró ambas soluciones o solo una? (¡Las cuadráticas tienen 2 soluciones!)
2. Identifica en qué paso está el error: ¿Factorización incorrecta? ¿Error en fórmula cuadrática? ¿Signo de raíz cuadrada?
3. Si saltó de forma estándar a respuesta sin mostrar método, señálalo
4. Muestra el desarrollo correcto completo: forma estándar → método → ambas soluciones
5. Consejo preventivo: "Recuerda que x² = k tiene dos soluciones ±", "Verifica tu factorización multiplicando..."
6. Sé constructivo - enfatiza que dominar cuadráticas requiere práctica

Responde en español con formato HTML simple (usa <br> para saltos de línea, <strong> para negrita, <code> para ecuaciones). Incluye emojis apropiados.`;
      } else {
        // Ecuación lineal normal - respuesta incorrecta
        prompt = `Eres un tutor de matemáticas paciente y claro que identifica errores y da consejos preventivos.

Ecuación: ${equation}
Respuesta correcta: x = ${correctAnswer}
Respuesta del estudiante: x = ${userAnswer}
Desarrollo del estudiante:
${userDevelopment}

El estudiante NO llegó a la respuesta correcta. Analiza paso a paso:
1. Identifica en qué paso está el error (número de línea o ecuación exacta)
2. Explica qué hizo mal y por qué es incorrecto (la operación fallida o concepto erróneo)
3. Muestra el paso correcto con la ecuación bien escrita
4. Da un consejo de prevención: cómo evitar este error en el futuro (ej: "Recuerda cambiar el signo al pasar...", "Verifica que...")
5. Sé constructivo, no crítico - enfatiza que los errores son parte del aprendizaje

Responde en español con formato HTML simple (usa <br> para saltos de línea, <strong> para negrita, <code> para ecuaciones). Incluye emojis apropiados.`;
      }
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
