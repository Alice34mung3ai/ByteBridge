// Ensure HMR is disabled in AI Studio environment to prevent WebSocket client conflicts
process.env.DISABLE_HMR = 'true';

import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { WebSocketServer, WebSocket } from 'ws';
import { CONCEPTS_CATALOG } from './src/data/az900Data.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
// Always bind strictly to port 3000 as required by AI Studio Nginx proxy
const PORT = 3000;

app.use(express.json({ limit: '20mb' }));

// Initialize Google GenAI client securely on server
const apiKey = process.env.GEMINI_API_KEY || '';
let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Candidate models in preference order for maximum availability and quota resilience
const CANDIDATE_MODELS = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];

/**
 * Resilient multi-model Gemini caller with automatic fallback across supported models
 */
async function callGeminiWithFallback(options: {
  contents: any;
  systemInstruction?: string;
  temperature?: number;
  tools?: any[];
}): Promise<{ text: string; modelUsed: string; groundingMetadata?: any }> {
  if (!aiClient) {
    throw new Error('Gemini AI client is not initialized');
  }

  let lastError: any = null;
  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await aiClient.models.generateContent({
        model,
        contents: options.contents,
        config: {
          systemInstruction: options.systemInstruction,
          temperature: options.temperature ?? 0.6,
          tools: options.tools,
        },
      });

      const text = response.text || '';
      if (text.trim()) {
        return {
          text,
          modelUsed: model,
          groundingMetadata: response.candidates?.[0]?.groundingMetadata,
        };
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`Model ${model} invocation attempt:`, err?.message || err);
      // Try next model in sequence
    }
  }

  throw lastError || new Error('All candidate models failed to generate a response');
}

// System prompt enforcing patient, beginner-friendly, rigorous cloud tutor persona
const TUTOR_SYSTEM_INSTRUCTION = `You are the Cloud Concept Coach inside "Azure Exam Flight Deck", an expert, patient, and highly pedagogically disciplined tutor for beginners preparing for the AZ-900 Microsoft Azure Fundamentals exam.

Core Pedagogical Directives:
1. ANALYSE EACH NEW LEARNER RESPONSE RIGOROUSLY:
   - Carefully evaluate the learner's latest message in context of the active AZ-900 concept and the previous turn.
   - Categorize the message:
     a) ANSWER TO CHECK QUESTION: Evaluate its factual correctness immediately. Never give unearned or false praise to an incorrect answer, a wild guess, or a confused statement.
     b) EXPRESSION OF UNCERTAINTY: If the learner says "I don't know", "I'm not sure", "I'm confused", or asks for help, DO NOT praise them for an answer. Validate that cloud concepts take time to master, pivot to a simpler, completely DIFFERENT real-world analogy, break the concept into 2 intuitive pieces, and ask a guided, easier question.
     c) DIRECT QUESTION: If the learner asks a question (e.g. "What does SLA mean?", "Why does Microsoft care about CapEx?", "Can you explain Region Pairs again?"), answer their specific question clearly and accurately FIRST before steering back to the lesson.
     d) REQUEST FOR ANOTHER ANALOGY: Provide a fresh, novel, everyday analogy (e.g. comparing to cooking, utilities, travel, housing, sports).

2. ACKNOWLEDGE CORRECT POINTS PRECISELY:
   - When the learner makes a correct statement or partial insight, explicitly state WHAT they got right (e.g. "Spot on about the OS layer: the customer does manage updates in IaaS.").
   - Do NOT use canned or superficial praise.

3. IDENTIFY AND EXPLAIN SPECIFIC MISCONCEPTIONS:
   - Accurately distinguish commonly confused AZ-900 concepts:
     * IaaS vs PaaS vs SaaS: IaaS gives raw VM/networking control (customer manages OS, patching, apps); PaaS gives an application runtime (Microsoft manages OS, patching, hardware; customer manages code & data); SaaS gives finished end-user software (Microsoft manages everything; customer manages access & data).
     * CapEx vs OpEx: CapEx is upfront physical hardware investment with depreciation; OpEx is pay-as-you-go operational consumption with zero upfront server hardware cost.
     * Public vs Private vs Hybrid Cloud: Public is multitenant/shared hardware over internet; Private is dedicated single-tenant infrastructure; Hybrid bridges private on-premises with public cloud.
     * High Availability (HA) vs Disaster Recovery (DR): HA prevents downtime from single component or datacenter failures (e.g., Availability Zones within a region); DR recovers systems after catastrophic regional outages (e.g., Region Pairs 300+ miles apart).
     * Scalability vs Elasticity: Scalability is capacity to expand; Elasticity is automatic dynamic expanding AND contracting dynamically as demand fluctuates.
     * Azure Policy vs Azure RBAC: Azure Policy enforces resource configurations and properties (e.g., allowed locations, SKU restrictions); RBAC enforces identity permissions (who can take what actions on resources).
     * Microsoft Entra ID vs Azure Policy: Entra ID is identity/access management; Azure Policy is resource compliance.
     * Microsoft Defender for Cloud vs Microsoft Sentinel: Defender for Cloud is Cloud Security Posture Management (CSPM) and Cloud Workload Protection; Sentinel is SIEM/SOAR security information and event management.
     * Locally Redundant Storage (LRS) vs Zone-Redundant (ZRS) vs Geo-Redundant (GRS): LRS = 3 copies in 1 datacenter; ZRS = 3 zones in 1 region; GRS = replicates across paired regions 300+ miles apart.
   - If the learner expresses a misconception, explain WHY it is incorrect, pinpoint the exact boundary of responsibility or architecture, and guide them to the right conclusion.

4. STRICT ANTI-REPETITION MANDATE (NO CANNED PHRASES):
   - You MUST NEVER start with repetitive canned phrases like:
     * "That's a thoughtful point about..."
     * "That is an insightful observation about..."
     * "Great point!"
     * "Good observation!"
     * "You're doing great!"
     * "Let's dive deeper into..."
   - Begin your response IMMEDIATELY with the direct evaluation, the direct answer to their question, or the newly adapted explanation.
   - NEVER repeat a previous explanation or repeat a previous check question word-for-word unless the learner explicitly asks you to repeat it.
   - Vary your vocabulary, tone, and examples naturally across turns.

5. MAINTAIN STRICT AZ-900 SYLLABUS FACTUAL INTEGRITY:
   - Stay locked onto the current AZ-900 objective.
   - Only state verified Microsoft Azure facts. Do NOT invent fictional Azure services, made-up pricing, or non-existent SLAs.
   - Keep answers concise, scannable, and beginner-friendly (under 160 words).
   - End with a targeted, context-aware follow-up question or guided check-question.`;

/**
 * Intelligent context-aware rule-based pedagogical fallback
 * Used when Gemini API is unavailable, offline, or temporarily rate-limited
 */
function generatePedagogicalFallback(params: {
  conceptTitle: string;
  conceptKey?: string;
  message: string;
  history?: Array<{ role: string; text: string }>;
}): string {
  const { conceptTitle, conceptKey, message } = params;
  const lowerMsg = message.toLowerCase().trim();

  // Find concept in catalog
  let concept = conceptKey ? CONCEPTS_CATALOG[conceptKey] : null;
  if (!concept) {
    const foundKey = Object.keys(CONCEPTS_CATALOG).find(
      (k) =>
        CONCEPTS_CATALOG[k].title.toLowerCase().includes(conceptTitle.toLowerCase()) ||
        conceptTitle.toLowerCase().includes(CONCEPTS_CATALOG[k].title.toLowerCase())
    );
    if (foundKey) concept = CONCEPTS_CATALOG[foundKey];
  }

  const topic = concept?.title || conceptTitle || 'AZ-900 Cloud Fundamentals';
  const distinction = concept?.keyDistinction || 'Always identify who manages each layer and where the boundaries of responsibility lie';
  const confusion = concept?.commonConfusion || 'Confusing customer management boundaries with Microsoft platform managed responsibilities';

  // 1. Learner expresses confusion, uncertainty, or "I don't know"
  const isUnsure =
    lowerMsg.includes("don't know") ||
    lowerMsg.includes("dont know") ||
    lowerMsg.includes("not sure") ||
    lowerMsg.includes("confused") ||
    lowerMsg.includes("no idea") ||
    lowerMsg.includes("stuck") ||
    lowerMsg.includes("lost") ||
    lowerMsg.includes("help") ||
    lowerMsg.includes("explain again");

  if (isUnsure) {
    return (
      `It is completely normal to feel unsure here—this distinction is one of the most frequently tested areas on the AZ-900 exam.\n\n` +
      `Let's break down "${topic}" with a simpler step-by-step perspective:\n` +
      (concept?.quickAnalogy ? `• Everyday Analogy: ${concept.quickAnalogy}\n` : '') +
      `• Core Rule: ${distinction}.\n\n` +
      `Guided Check: Based on that rule, if a physical server power cord gets unplugged in an Azure datacenter, is that Microsoft's job to fix, or the customer's?`
    );
  }

  // 2. Learner asks a direct question
  const isQuestion =
    lowerMsg.includes('?') ||
    lowerMsg.startsWith('what') ||
    lowerMsg.startsWith('why') ||
    lowerMsg.startsWith('how') ||
    lowerMsg.startsWith('can you') ||
    lowerMsg.startsWith('difference between');

  if (isQuestion) {
    return (
      `Here is the clear AZ-900 answer for ${topic}:\n\n` +
      `${concept?.summary || `${topic} defines how workloads and governance are managed in Microsoft Azure.`}\n\n` +
      `• Key Distinction: ${distinction}.\n` +
      `• Exam trap to watch for: ${confusion}.\n\n` +
      `Does this directly address your question, or would you like to see how this works in a specific Azure service like Virtual Machines or App Service?`
    );
  }

  // 3. Learner attempted an answer: evaluate correctness based on concept keywords
  const indicatesCorrect =
    (lowerMsg.includes('customer') && (lowerMsg.includes('data') || lowerMsg.includes('identity') || lowerMsg.includes('os') || lowerMsg.includes('patch'))) ||
    (lowerMsg.includes('microsoft') && (lowerMsg.includes('hardware') || lowerMsg.includes('physical') || lowerMsg.includes('datacenter') || lowerMsg.includes('hypervisor'))) ||
    (lowerMsg.includes('opex') && lowerMsg.includes('pay')) ||
    (lowerMsg.includes('elastic') && (lowerMsg.includes('shrink') || lowerMsg.includes('auto'))) ||
    (lowerMsg.includes('zone') && (lowerMsg.includes('datacenter') || lowerMsg.includes('region'))) ||
    (lowerMsg.includes('policy') && (lowerMsg.includes('resource') || lowerMsg.includes('compliance'))) ||
    (lowerMsg.includes('rbac') && (lowerMsg.includes('user') || lowerMsg.includes('role') || lowerMsg.includes('action')));

  if (indicatesCorrect) {
    return (
      `Spot on! You correctly identified the critical concept boundary.\n\n` +
      `In Microsoft Azure: ${distinction}.\n\n` +
      `To lock this in for the exam: ${concept?.sampleCheckQuestion || 'How would this impact an application if an entire datacenter went offline?'}`
    );
  }

  // If learner made an incorrect assertion or common misconception
  return (
    `Let's examine that carefully. A common exam trap here is: ${confusion}.\n\n` +
    `The official AZ-900 distinction is: ${distinction}.\n\n` +
    `Thinking about that boundary, how would you re-evaluate who has responsibility in this scenario?`
  );
}

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'Azure Exam Flight Deck',
    timestamp: new Date().toISOString(),
    aiReady: Boolean(aiClient),
  });
});

// API endpoint to generate an initial concept coaching breakdown
app.post('/api/coach/explain', async (req: Request, res: Response) => {
  try {
    const { conceptTitle, conceptKey, userContext, alternativeAnalogyRequested } = req.body;

    if (!conceptTitle) {
      return res.status(400).json({ error: 'conceptTitle is required' });
    }

    // Look up concept in catalog
    const catalogItem = conceptKey ? CONCEPTS_CATALOG[conceptKey] : null;

    if (!aiClient) {
      const fallbackText = catalogItem
        ? `**Simple Definition**:\n${catalogItem.summary}\n\n**Everyday Analogy**:\n${catalogItem.quickAnalogy}\n\n**The Azure Connection**:\n${catalogItem.azureExample}\n\n**Common Pitfall / Comparison**:\n${catalogItem.commonConfusion}\nKey distinction: ${catalogItem.keyDistinction}\n\n**Coach's Check Question**:\n${catalogItem.sampleCheckQuestion}`
        : `**Simple Definition**:\n${conceptTitle} is a core foundational cloud computing topic covered in the AZ-900 syllabus.\n\n**Everyday Analogy**:\nThink of this like renting a serviced apartment vs owning a house: you only pay for what you need and avoid physical maintenance burdens.\n\n**The Azure Connection**:\nIn Microsoft Azure, this principle determines how services are architected, governed, and priced.\n\n**Common Pitfall / Comparison**:\nBe careful not to confuse this with related deployment or architecture options.\n\n**Coach's Check Question**:\nIn your own words, what is the biggest advantage of this model for a company with unpredictable customer demand?`;

      return res.json({
        conceptTitle,
        conceptKey,
        fullText: fallbackText,
      });
    }

    const prompt = `Please coach a beginner on the AZ-900 concept: "${conceptTitle}".
${catalogItem ? `Verified Catalog Facts:\n- Summary: ${catalogItem.summary}\n- Distinctions: ${catalogItem.keyDistinction}\n- Pitfalls: ${catalogItem.commonConfusion}` : ''}
${userContext ? `Learner Context: ${userContext}` : ''}
${alternativeAnalogyRequested ? 'The learner asked for a FRESH, DIFFERENT real-world analogy than usual.' : ''}

Structure your response with clear sections:
1. **Simple Definition**: 2-3 clear sentences in plain English.
2. **Everyday Analogy**: A relatable, concrete real-world comparison.
3. **The Azure Connection**: How Azure implements this (mention specific Azure services or architectures).
4. **Common Pitfall / Comparison**: A commonly confused concept and how to distinguish them.
5. **Coach's Check Question**: Exactly ONE original follow-up question to check their understanding. Stop right there and do NOT reveal the answer yet.`;

    let fullText = '';

    try {
      const genResult = await callGeminiWithFallback({
        contents: prompt,
        systemInstruction: TUTOR_SYSTEM_INSTRUCTION,
        temperature: 0.6,
      });
      fullText = genResult.text;
    } catch (apiErr: any) {
      console.warn('Gemini explain error, falling back to verified catalog content:', apiErr?.message);
      fullText = catalogItem
        ? `**Simple Definition**:\n${catalogItem.summary}\n\n**Everyday Analogy**:\n${catalogItem.quickAnalogy}\n\n**The Azure Connection**:\n${catalogItem.azureExample}\n\n**Common Pitfall / Comparison**:\n${catalogItem.commonConfusion}\nKey distinction: ${catalogItem.keyDistinction}\n\n**Coach's Check Question**:\n${catalogItem.sampleCheckQuestion}`
        : `**Simple Definition**:\n${conceptTitle} is a foundational pillar of cloud computing and a core objective on the AZ-900 exam.\n\n**Everyday Analogy**:\nThink of this like renting a serviced apartment rather than owning a single-family house.\n\n**The Azure Connection**:\nIn Microsoft Azure, services are architected to support this model natively.\n\n**Coach's Check Question**:\nIn your own words, what is the single biggest security or operational benefit an organization gains from this concept?`;
    }

    return res.json({
      conceptTitle,
      conceptKey,
      fullText,
    });
  } catch (error: any) {
    console.error('Error generating concept coaching:', error);
    return res.status(500).json({ error: 'Internal server error generating concept' });
  }
});

// Interactive chat endpoint for the coach conversation loop
app.post('/api/coach/chat', async (req: Request, res: Response) => {
  try {
    const { history, message, conceptTitle, conceptKey } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required' });
    }

    // Look up concept metadata in CONCEPTS_CATALOG for factual grounding
    let concept = conceptKey ? CONCEPTS_CATALOG[conceptKey] : null;
    if (!concept && conceptTitle) {
      const foundKey = Object.keys(CONCEPTS_CATALOG).find(
        (k) =>
          CONCEPTS_CATALOG[k].title.toLowerCase().includes(conceptTitle.toLowerCase()) ||
          conceptTitle.toLowerCase().includes(CONCEPTS_CATALOG[k].title.toLowerCase())
      );
      if (foundKey) concept = CONCEPTS_CATALOG[foundKey];
    }

    const conversationPrompt = `Active AZ-900 Concept: "${conceptTitle || 'AZ-900 Cloud Fundamentals'}"

Verified Microsoft Azure Curriculum Facts:
${
  concept
    ? `- Summary: ${concept.summary}
- Everyday Analogy: ${concept.quickAnalogy}
- Azure Implementation: ${concept.azureExample}
- Common Misconception: ${concept.commonConfusion}
- Key Exam Distinction: ${concept.keyDistinction}
- Sample Check Question: ${concept.sampleCheckQuestion}`
    : '- Ground all explanations strictly in verified AZ-900 syllabus facts.'
}

Full Conversation Transcript so far:
${
  Array.isArray(history) && history.length > 0
    ? history
        .map((h: any) => `${h.role === 'model' ? 'Coach' : 'Learner'}: ${h.text || h.content || ''}`)
        .join('\n\n')
    : '(First turn of conversation)'
}

Latest Learner Input to Evaluate:
"${message}"

Pedagogical Directives for This Response:
1. ANALYSE the learner's message carefully in context:
   - If they are answering your previous check-question: Evaluate whether their answer is accurate, partially accurate, or incorrect. If accurate, acknowledge specifically what they got right and ask a follow-up or solidify the takeaway. If incorrect, kindly identify the exact misconception, contrast the confused concepts (e.g. IaaS vs PaaS, CapEx vs OpEx, RBAC vs Policy), and guide them toward the right conclusion.
   - If they express uncertainty ("I don't know", "not sure", "confused", "stuck"): DO NOT praise them for an answer. Validate that cloud fundamentals can be confusing, introduce a FRESH, DIFFERENT everyday analogy, break the concept into 2 intuitive steps, and ask an easier, guided question (or 2-choice prompt).
   - If they ask a direct question: Answer their specific question directly, concisely, and factually FIRST before continuing the lesson.
   - If they requested a different analogy: Give a brand-new everyday analogy.
2. STRICT ANTI-REPETITION:
   - NEVER use canned generic openers such as "That's a thoughtful point", "That is an insightful observation", "Great point!", "Good observation!", or "You're doing great!".
   - Begin your response IMMEDIATELY with the direct evaluation, answer, or adapted analogy.
   - NEVER repeat a previous explanation or prior question word-for-word.
3. Keep technical facts strictly verified according to Microsoft Azure AZ-900 standards.
4. Keep the response under 150 words, conversational, clear, and beginner-friendly.`;

    let reply = '';
    try {
      const genResult = await callGeminiWithFallback({
        contents: conversationPrompt,
        systemInstruction: TUTOR_SYSTEM_INSTRUCTION,
        temperature: 0.6,
      });
      reply = genResult.text;
    } catch (chatApiErr: any) {
      console.warn('Gemini chat error across all models, generating pedagogical fallback:', chatApiErr?.message);
      reply = generatePedagogicalFallback({
        conceptTitle: conceptTitle || 'Cloud Concepts',
        conceptKey,
        message,
        history,
      });
    }

    return res.json({ reply });
  } catch (error: any) {
    console.error('Error in coach chat handler:', error);
    const reply = generatePedagogicalFallback({
      conceptTitle: req.body?.conceptTitle || 'Cloud Concepts',
      conceptKey: req.body?.conceptKey,
      message: req.body?.message || '',
      history: req.body?.history,
    });
    return res.json({ reply });
  }
});

// FEATURE: Google Search Grounding with gemini-3.8-flash
app.post('/api/coach/search-grounded', async (req: Request, res: Response) => {
  try {
    const { query, conceptTitle } = req.body;
    const searchTerm = query || conceptTitle || 'AZ-900 Microsoft Azure latest updates';

    if (!aiClient) {
      return res.json({
        text: `Microsoft Azure continuously updates its services. For AZ-900, remember that Azure Active Directory was rebranded to Microsoft Entra ID, Azure Purview handles unified data governance, and Microsoft Defender for Cloud provides unified posture management.`,
        searchQueries: ['Microsoft Azure AZ-900 updates'],
        sources: [
          { title: 'Microsoft Learn: AZ-900 Exam Study Guide', uri: 'https://learn.microsoft.com/certifications/exams/az-900' }
        ]
      });
    }

    const prompt = `You are an expert Microsoft Azure certification specialist. 
Provide the latest official facts, current service naming changes (e.g. Entra ID), latest regional architecture updates, and exam objectives for: "${searchTerm}".
Keep it beginner-friendly, factually precise, and under 250 words.`;

    const genResult = await callGeminiWithFallback({
      contents: prompt,
      tools: [{ googleSearch: {} }],
      temperature: 0.3,
    });

    const text = genResult.text || '';
    const groundingMetadata = genResult.groundingMetadata;
    const searchQueries = groundingMetadata?.webSearchQueries || [];
    const searchChunks = groundingMetadata?.groundingChunks || [];

    const sources = searchChunks
      .filter((c: any) => c.web?.uri)
      .map((c: any) => ({
        title: c.web.title || c.web.uri,
        uri: c.web.uri,
      }))
      .slice(0, 5);

    return res.json({
      text,
      searchQueries,
      sources,
    });
  } catch (error: any) {
    console.error('Error in search-grounded endpoint:', error);
    return res.json({
      text: `Current AZ-900 Key Update: Azure Active Directory is now officially Microsoft Entra ID. Storage tiers include Hot, Cool, Cold, and Archive. High Availability spans multiple Availability Zones within an Azure region.`,
      searchQueries: ['Microsoft Azure AZ-900 latest update'],
      sources: [
        { title: 'Microsoft Learn Azure Fundamentals', uri: 'https://learn.microsoft.com' }
      ]
    });
  }
});

// FEATURE: Audio Transcription with gemini-3.5-transcribe
app.post('/api/coach/transcribe', async (req: Request, res: Response) => {
  try {
    const { audioBase64, mimeType } = req.body;

    if (!audioBase64) {
      return res.status(400).json({ error: 'audioBase64 is required' });
    }

    if (!aiClient) {
      return res.json({
        transcription: 'Explain Azure Availability Zones vs Region Pairs for high availability.',
      });
    }

    const audioPart = {
      inlineData: {
        mimeType: mimeType || 'audio/webm',
        data: audioBase64,
      },
    };

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          audioPart,
          {
            text: 'Transcribe this user speech accurately into text. Capture cloud terminology, acronyms (like IaaS, PaaS, SaaS, Entra ID, SLA, VNet, Blob), and question phrasing cleanly.',
          },
        ],
      },
    });

    const transcription = response.text?.trim() || '';
    return res.json({ transcription });
  } catch (error: any) {
    console.error('Error in audio transcription:', error);
    return res.status(500).json({
      error: 'Failed to transcribe audio',
      message: error?.message || 'Transcription error',
    });
  }
});

// FEATURE: Live API Voice Conversation WebSocket bridge (gemini-3.8-live)
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', async (clientWs: WebSocket) => {
  console.log('Client connected to Live Voice Cockpit (/live)');

  if (!aiClient) {
    clientWs.send(
      JSON.stringify({
        text: 'Live voice requires active Gemini API key in environment.',
      })
    );
    return;
  }

  try {
    const session = await aiClient.live.connect({
      model: 'gemini-3.8-live',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Zephyr' },
          },
        },
        systemInstruction: `You are the Flight Deck AI Voice Coach for the AZ-900 Azure Fundamentals exam.
Speak in a friendly, crisp, encouraging voice.
Give short, digestible verbal explanations (under 35 seconds per turn).
Use simple everyday analogies (e.g. houses, airports, restaurants).
Ask learners quick check questions to test their knowledge verbally.`,
      },
      callbacks: {
        onmessage: (message: LiveServerMessage) => {
          const audioChunk = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audioChunk) {
            clientWs.send(JSON.stringify({ audio: audioChunk }));
          }
          if (message.serverContent?.interrupted) {
            clientWs.send(JSON.stringify({ interrupted: true }));
          }
          const textPart = message.serverContent?.modelTurn?.parts?.[0]?.text;
          if (textPart) {
            clientWs.send(JSON.stringify({ text: textPart }));
          }
        },
        onclose: () => {
          console.log('Live session closed by server');
        },
      },
    });

    clientWs.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.audio) {
          session.sendRealtimeInput({
            audio: { data: msg.audio, mimeType: 'audio/pcm;rate=16000' },
          });
        } else if (msg.text) {
          session.sendRealtimeInput({
            text: msg.text,
          });
        }
      } catch (e) {
        console.error('Error processing live audio payload:', e);
      }
    });

    clientWs.on('close', () => {
      try {
        session.close();
      } catch (e) {}
    });
  } catch (liveErr: any) {
    console.error('Error creating Gemini Live session:', liveErr);
    clientWs.send(
      JSON.stringify({
        error: 'Unable to connect to Live Voice session. High traffic or offline.',
      })
    );
  }
});

// Upgrade HTTP connection for WebSocket on /live
server.on('upgrade', (request, socket, head) => {
  try {
    const { pathname } = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
    if (pathname === '/live') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
      return;
    }
  } catch (err) {
    // URL parsing fallback
  }

  // Gracefully decline non-live WebSocket requests without abrupt reset
  socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
  socket.destroy();
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Azure Exam Flight Deck server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
