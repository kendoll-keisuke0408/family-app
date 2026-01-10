// Basic PII Scrubbing to prevent accidental leakage
function scrubPII(text) {
    // Redact Emails
    text = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]')
    // Redact Phone Numbers (Simple JP/Intl formats)
    text = text.replace(/(0\d{1,4}-?\d{1,4}-?\d{4})|(\+\d{1,3}-?\d{1,14})/g, '[PHONE_REDACTED]')
    return text
}

export async function callGemini(prompt, systemInstruction = '', imageBase64 = null) {
    const apiKey = localStorage.getItem('gemini_api_key')
    if (!apiKey) {
        throw new Error('API_KEY_MISSING')
    }

    // Security Filter: Scrub PII from user prompt
    const safePrompt = scrubPII(prompt)

    const parts = [{ text: safePrompt }]

    // Add image if provided
    if (imageBase64) {
        // Remove header if present (data:image/jpeg;base64,...)
        const cleanBase64 = imageBase64.split(',')[1] || imageBase64
        parts.push({
            inline_data: {
                mime_type: "image/jpeg",
                data: cleanBase64
            }
        })
    }

    const payload = {
        contents: [{
            parts: parts
        }],
        // Gemini 1.5 Flash - Efficient and Free-tier eligible
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800,
        }
    }

    if (systemInstruction) {
        payload.systemInstruction = {
            parts: [{ text: systemInstruction }]
        }
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })

        if (!response.ok) {
            const err = await response.json()
            throw new Error(err.error?.message || 'API Error')
        }

        const data = await response.json()
        return data.candidates[0].content.parts[0].text
    } catch (error) {
        console.error('Gemini API Error:', error)
        throw error
    }
}
