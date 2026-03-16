// HK Insurance Authority compliance rules
// Based on GL28 (Long Term Insurance) guidelines and SFC requirements

export const BLACKLISTED_PHRASES = [
  // Absolute return promises
  'guaranteed return',
  'guaranteed profit',
  'guaranteed income',
  'guaranteed yield',
  'risk-free return',
  'risk free return',
  'zero risk',
  '保證回報',
  '保證收益',
  '零風險',
  '無風險',

  // Misleading superlatives
  'best product',
  'best insurance',
  'outperforms all',
  'highest return',
  'unbeatable',
  '最好的產品',
  '最高回報',

  // Misleading comparisons
  'beats all competitors',
  'better than all',
  'number one insurance',

  // Prohibited promotional language per IA GL28
  'act now or miss out',
  'limited time guarantee',
  '不要錯過',

  // Investment advice red flags
  'will definitely increase',
  'certain to grow',
  '必定升值',
  '肯定增長',
]

export const REQUIRED_DISCLAIMER =
  'This video is for general information only and does not constitute financial advice. Please consult a licensed financial advisor for advice tailored to your individual circumstances.'

export const REQUIRED_DISCLAIMER_ZH =
  '本影片僅供一般參考，並不構成財務建議。如需適合個人情況的建議，請諮詢持牌財務顧問。'

export const INVESTMENT_LINKED_KEYWORDS = [
  'investment-linked',
  'ILAS',
  'unit-linked',
  'variable life',
  '投資相連保險',
  '投連壽險',
]

export const INVESTMENT_LINKED_DISCLAIMER =
  'Investment products are subject to market risk and the value of your investment may go up or down. Past performance is not indicative of future results.'

export interface ComplianceRule {
  id: string
  description: string
  severity: 'error' | 'warning'
  test: (content: string) => boolean
  message: string
}

export const COMPLIANCE_RULES: ComplianceRule[] = [
  {
    id: 'no_guaranteed_returns',
    description: 'No guaranteed return promises',
    severity: 'error',
    test: (content) =>
      BLACKLISTED_PHRASES.slice(0, 12).some((phrase) =>
        content.toLowerCase().includes(phrase.toLowerCase())
      ),
    message:
      'Script contains language that promises guaranteed returns, which violates IA GL28 guidelines.',
  },
  {
    id: 'no_misleading_superlatives',
    description: 'No misleading superlatives',
    severity: 'error',
    test: (content) =>
      BLACKLISTED_PHRASES.slice(12, 18).some((phrase) =>
        content.toLowerCase().includes(phrase.toLowerCase())
      ),
    message:
      'Script contains misleading superlatives that may constitute false advertising.',
  },
  {
    id: 'no_misleading_comparisons',
    description: 'No misleading product comparisons',
    severity: 'warning',
    test: (content) =>
      BLACKLISTED_PHRASES.slice(18, 21).some((phrase) =>
        content.toLowerCase().includes(phrase.toLowerCase())
      ),
    message:
      'Script contains comparative claims that need substantiation or should be removed.',
  },
  {
    id: 'no_urgency_tactics',
    description: 'No prohibited urgency tactics',
    severity: 'warning',
    test: (content) =>
      BLACKLISTED_PHRASES.slice(21, 24).some((phrase) =>
        content.toLowerCase().includes(phrase.toLowerCase())
      ),
    message: 'Script uses urgency tactics that may be considered misleading.',
  },
  {
    id: 'no_definitive_predictions',
    description: 'No definitive investment predictions',
    severity: 'error',
    test: (content) =>
      BLACKLISTED_PHRASES.slice(24).some((phrase) =>
        content.toLowerCase().includes(phrase.toLowerCase())
      ),
    message:
      'Script contains definitive investment predictions which are prohibited.',
  },
  {
    id: 'investment_linked_disclaimer',
    description: 'Investment-linked products require additional disclaimer',
    severity: 'warning',
    test: (content) =>
      INVESTMENT_LINKED_KEYWORDS.some((keyword) =>
        content.toLowerCase().includes(keyword.toLowerCase())
      ),
    message:
      'Script mentions investment-linked products. Ensure investment risk disclaimer is included.',
  },
]

export function runComplianceCheck(content: string): {
  status: 'pass' | 'warning' | 'fail'
  violations: Array<{ rule_id: string; message: string; severity: 'error' | 'warning' }>
} {
  const violations: Array<{
    rule_id: string
    message: string
    severity: 'error' | 'warning'
  }> = []

  for (const rule of COMPLIANCE_RULES) {
    if (rule.test(content)) {
      violations.push({
        rule_id: rule.id,
        message: rule.message,
        severity: rule.severity,
      })
    }
  }

  const hasErrors = violations.some((v) => v.severity === 'error')
  const hasWarnings = violations.some((v) => v.severity === 'warning')

  return {
    status: hasErrors ? 'fail' : hasWarnings ? 'warning' : 'pass',
    violations,
  }
}
