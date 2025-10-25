
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

// This is the Vercel serverless function handler, updated for the Node.js runtime.
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { dataForAnalysis } = req.body;

        // Ensure the necessary data is present in the request
        if (!dataForAnalysis) {
            return res.status(400).json({ error: 'Missing dataForAnalysis in request body' });
        }
        
        // Securely access the API key from environment variables on the server
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
             return res.status(500).json({ error: 'API key not configured on server' });
        }
        
        const ai = new GoogleGenAI({ apiKey });

        const prompt = `
            You are an expert business consultant specializing in organizational structure for service-based businesses.
            Analyze the following organizational structure and financial data.
            Your tone should be casual and direct. Get straight to the point.
            Provide a concise analysis covering three key areas: Strengths, Potential Risks/Opportunities, and Key Observations.
            
            **Important Context & Rules:**
            - This data represents a forward-looking plan or model, not necessarily the current state of the business. Utilization targets are aspirational goals.
            - The 'benefitsPercent' setting creates a total salary multiplier to estimate the true cost of an employee (including benefits, payroll taxes, etc.). The 30% default is a common industry standard.
            - The 'overheadPercent' accounts for operational costs (rent, software, etc.). The 15% default is a standard baseline but can be adjusted for leaner organizations.
            - **Crucially, do not comment on the negative profit margins of C-suite or executive roles (like CEO, COO).** These positions are strategic and not expected to be billable. It is normal and acceptable for them to show a loss on paper; their value is in leading the company, not in billable work.
            
            **Guidelines for your analysis:**
            - **Rule of 7:** Pay close attention to the number of direct reports for each manager ('directReports' property). A manager with fewer than 3-4 reports might suggest the team is top-heavy. A manager with more than 7-8 reports is likely over-extended and may become a bottleneck. Flag these as risks or opportunities.
            - **Manager Utilization:** A manager with 2 or more direct reports should have their utilization scrutinized. If their utilization target is high (e.g., over 50-60%), this is a major risk. Their management duties will conflict with their billable work, leading to burnout or underperformance. As a team grows, a manager's utilization *must* decrease. Flag any situation that violates this principle as a significant risk.
            - **Actionable Insights:** Focus on high-impact insights about profitability, team balance, and growth. For "Risks & Opportunities," suggest concrete actions.
            - **Clarity:** Each bullet point should be a single, clear sentence.
            - **Specificity:** Refer to specific roles or departments where relevant.

            Here is the data:
            ${JSON.stringify(dataForAnalysis, null, 2)}
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        strengths: {
                            type: Type.ARRAY,
                            description: "Positive aspects of the org structure, team balance, or financial health. 2-4 points.",
                            items: { type: Type.STRING }
                        },
                        risks_opportunities: {
                            type: Type.ARRAY,
                            description: "Potential issues, bottlenecks, financial risks, or opportunities for improvement/growth. 2-4 points.",
                            items: { type: Type.STRING }
                        },
                        key_observations: {
                            type: Type.ARRAY,
                            description: "Neutral, interesting, or noteworthy financial or structural observations. 2-4 points.",
                            items: { type: Type.STRING }
                        }
                    },
                    required: ['strengths', 'risks_opportunities', 'key_observations']
                }
            }
        });
        
        // Send the successful JSON response from the AI
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).send(response.text);

    } catch (error) {
        console.error("AI analysis failed in serverless function:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return res.status(500).json({ error: 'Internal Server Error', details: errorMessage });
    }
}
