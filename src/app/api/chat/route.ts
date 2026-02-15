import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    const startTime = Date.now();
    try {
        const body = await req.json();
        const { message } = body;

        // 1. INPUT VALIDATION
        if (!message) {
            console.error('[CHAT PROXY] Error: Mensaje vacío recibido del frontend.');
            return NextResponse.json({ error: 'El mensaje está vacío.' }, { status: 400 });
        }

        const webhookUrl = process.env.N8N_WEBHOOK_URL;
        const apiKey = process.env.N8N_API_KEY;

        // 2. CONFIGURATION VALIDATION
        if (!webhookUrl) {
            console.error('[CHAT PROXY] CRÍTICO: N8N_WEBHOOK_URL no está definida en .env.local');
            return NextResponse.json({ error: 'Configuración Webhook faltante.' }, { status: 500 });
        }

        console.log(`\n--- [CHAT PROXY START] ---`);
        console.log(`[USER MESSAGE]: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
        console.log(`[TARGET_WEBHOOK]: ${webhookUrl}`);

        // 3. PREPARE PAYLOAD
        const payload = {
            action: "sendMessage",
            chatInput: message,
            sessionId: body.sessionId || `gen_${Math.random().toString(36).substring(7)}`
        };

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Origin': 'https://redsolucionesti.com',
            'Accept': 'application/json',
            'User-Agent': 'RedSoluciones-NextJS-Proxy/1.0',
        };

        // 4. AUTHENTICATION
        // The user requested: Authorization: Bearer process.env.N8N_API_KEY
        if (apiKey && apiKey !== 'xxxx') {
            headers['Authorization'] = `Bearer ${apiKey}`;
            console.log(`[AUTH]: Bearer token applied (${apiKey.substring(0, 4)}***)`);
        } else {
            console.warn(`[AUTH]: No valid API Key found. Sending request without Authorization header.`);
        }

        console.log(`[PAYLOAD]:`, JSON.stringify(payload));

        // 5. EXECUTION
        const n8nResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload),
        });

        const endTime = Date.now();
        console.log(`[N8N RESPONSE STATUS]: ${n8nResponse.status} ${n8nResponse.statusText} (${endTime - startTime}ms)`);

        // 6. RESPONSE HANDLING
        const contentType = n8nResponse.headers.get('content-type') || '';
        let responseText = '';

        try {
            responseText = await n8nResponse.text();
        } catch (e) {
            console.error('[CHAT PROXY] Error leyendo texto de respuesta:', e);
        }

        if (!n8nResponse.ok) {
            console.error(`[CHAT PROXY FAIL] n8n devolvió error 500 o similar.`);
            console.error(`[RAW RESPONSE]:`, responseText);

            // Return structured error to frontend
            return NextResponse.json({
                error: `Error de n8n (${n8nResponse.status})`,
                details: responseText || 'Error interno en el servidor de n8n o en el workflow.'
            }, { status: n8nResponse.status });
        }

        // Parse JSON
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.warn('[CHAT PROXY] n8n no devolvió JSON válido. Usando texto plano.');
            data = { output: responseText };
        }

        console.log(`[N8N SUCCESS DATA]:`, JSON.stringify(data).substring(0, 200));

        // 7. REPLY EXTRACTION
        let reply = '';
        if (Array.isArray(data)) {
            const first = data[0];
            reply = first.output || first.response || first.text || JSON.stringify(first);
        } else if (typeof data === 'object' && data !== null) {
            reply = data.output || data.response || data.text || JSON.stringify(data);
        } else {
            reply = String(data);
        }

        console.log(`--- [CHAT PROXY SUCCESS] ---\n`);

        return NextResponse.json({ reply: reply || 'Disculpa, el asistente no pudo procesar tu mensaje.' });

    } catch (error: any) {
        console.error('[CHAT PROXY CRITICAL EXCEPTION]:', error);
        return NextResponse.json({
            error: 'Error interno del servidor proxy',
            details: error.message
        }, { status: 500 });
    }
}
