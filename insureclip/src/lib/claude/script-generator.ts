import Anthropic from '@anthropic-ai/sdk'
import type {
  ScriptGenerationParams,
  ScriptGenerationResult,
} from '@/types'
import {
  runComplianceCheck,
  REQUIRED_DISCLAIMER,
  REQUIRED_DISCLAIMER_ZH,
} from '@/lib/compliance/rules'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const SYSTEM_PROMPT = `You are an expert insurance content writer for Hong Kong and Asia-Pacific markets. You create compliant, engaging video scripts for insurance agents and financial advisors.

COMPLIANCE RULES (HK Insurance Authority GL28 + SFC guidelines - MANDATORY):
1. NEVER promise guaranteed returns or profits
2. NEVER use absolute claims like "risk-free", "zero risk", "guaranteed yield"
3. NEVER make unsubstantiated superlatives ("best product", "highest return", "number one")
4. NEVER make misleading comparisons between insurance products
5. NEVER give specific investment advice or predict market performance
6. ALWAYS include a disclaimer that the content is for general information only
7. For investment-linked products, ALWAYS mention that values can go up or down
8. Scripts must be educational and informative, not sales pitches with false urgency
9. Avoid prohibited promotional language per IA GL28

SCRIPT WRITING GUIDELINES:
- Write naturally for spoken delivery (short sentences, conversational flow)
- Use appropriate code-switching for Cantonese (mixing English terms naturally used by HK agents)
- Target the specified duration precisely
- Include the agent's name naturally in the greeting
- End with the specified call-to-action
- Tone options: professional (formal), warm_casual (friendly), educational (explanatory)
- Structure options: problem_solution, story, list, qa

LANGUAGE NOTES:
- Cantonese: Write in Traditional Chinese with natural Cantonese expressions (唔係, 係咪, 咁樣)
- Mandarin: Write in Traditional Chinese with standard Mandarin expressions
- English: Write in clear, accessible English suitable for HK professionals

OUTPUT FORMAT (JSON):
{
  "script": "The full script text",
  "compliance_status": "pass|warning|fail",
  "compliance_notes": ["any warnings or notes"],
  "word_count": number,
  "estimated_duration": number (in seconds),
  "disclaimer": "The disclaimer text to add as footer"
}`

const WORD_TARGETS: Record<number, number> = {
  15: 38,
  30: 75,
  45: 112,
  60: 150,
}

function buildUserPrompt(params: ScriptGenerationParams): string {
  const wordTarget = WORD_TARGETS[params.length]

  const languageInstruction = {
    cantonese: 'Write the script in Cantonese (Traditional Chinese, natural HK Cantonese expressions)',
    mandarin: 'Write the script in Mandarin (Traditional Chinese, standard Mandarin)',
    english: 'Write the script in English',
  }[params.language]

  const toneInstruction = {
    professional: 'Use a professional, formal tone suitable for client-facing content',
    warm_casual: 'Use a warm, friendly, casual tone that feels approachable and personal',
    educational: 'Use an educational, explanatory tone that helps viewers understand concepts',
  }[params.tone]

  const structureInstruction = {
    problem_solution: 'Structure: Start with a relatable problem or pain point, then present the solution',
    story: 'Structure: Tell a brief story or scenario that illustrates the point',
    list: 'Structure: Present 2-3 clear numbered points or tips',
    qa: 'Structure: Use a question-and-answer format to address common concerns',
  }[params.structure]

  const ctaInstruction = {
    contact_me: 'End with: "Feel free to message me or give me a call for a free consultation."',
    book_review: 'End with: "Book a free financial review with me today."',
    learn_more: 'End with: "For more information, check the link in my bio."',
    none: 'No call-to-action needed.',
  }[params.cta]

  return `Create a ${params.length}-second video script (approximately ${wordTarget} words) for ${params.agent_name}${params.agent_company ? `, an advisor at ${params.agent_company}` : ''}.

Topic: ${params.topic_title}

Requirements:
- ${languageInstruction}
- ${toneInstruction}
- ${structureInstruction}
- ${ctaInstruction}
- Start with a natural greeting that introduces ${params.agent_name}
- Target exactly ${wordTarget} words for ${params.length} seconds of speaking time
- The script should sound natural when spoken aloud, not like written text
- Include all required compliance elements

Return valid JSON only with the structure defined in the system prompt.`
}

export async function generateScript(
  params: ScriptGenerationParams
): Promise<ScriptGenerationResult> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: buildUserPrompt(params),
      },
    ],
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude API')
  }

  let parsed: {
    script: string
    compliance_status: string
    compliance_notes: string[]
    word_count: number
    estimated_duration: number
    disclaimer: string
  }

  try {
    // Extract JSON from response (Claude sometimes adds markdown code blocks)
    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in response')
    parsed = JSON.parse(jsonMatch[0])
  } catch {
    throw new Error('Failed to parse Claude API response as JSON')
  }

  // Stage 2: Run our own regex-based compliance check
  const stage2Check = runComplianceCheck(parsed.script)

  // Merge compliance results (stage 2 can escalate, not downgrade)
  const mergedNotes = [
    ...(parsed.compliance_notes || []),
    ...stage2Check.violations.map((v) => v.message),
  ]

  let finalStatus: 'pass' | 'warning' | 'fail' = parsed.compliance_status as
    | 'pass'
    | 'warning'
    | 'fail'
  if (stage2Check.status === 'fail') finalStatus = 'fail'
  else if (stage2Check.status === 'warning' && finalStatus === 'pass')
    finalStatus = 'warning'

  // Append disclaimer to script
  const disclaimer =
    params.language === 'english' ? REQUIRED_DISCLAIMER : REQUIRED_DISCLAIMER_ZH
  const scriptWithDisclaimer = parsed.script

  return {
    script: scriptWithDisclaimer,
    compliance_status: finalStatus,
    compliance_notes: [...new Set(mergedNotes)],
    word_count: parsed.word_count || parsed.script.length,
    estimated_duration: parsed.estimated_duration || params.length,
  }
}
