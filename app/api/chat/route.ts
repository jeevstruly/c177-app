import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
})

// Service role client for data queries (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  // Verify auth with anon client
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { message } = await request.json()

  // Use admin client for all data queries

  const { data: statement, error: statementError } = await supabaseAdmin
    .from('monthly_statements')
    .select('*')
    .eq('period_year', 2026)
    .eq('period_month', 3)
    .single()

  console.log('statement:', statement)
  console.log('statementError:', statementError)

  if (!statement) {
    return NextResponse.json({ error: 'Statement not found', detail: statementError }, { status: 500 })
  }
    

  const { data: income } = await supabaseAdmin
    .from('income_line_items')
    .select('*')
    .eq('statement_id', statement.id)

  const { data: expenses } = await supabaseAdmin
    .from('expense_line_items')
    .select('*')
    .eq('statement_id', statement.id)

  const { data: delinquency } = await supabaseAdmin
    .from('shareholder_delinquency')
    .select('*')
    .eq('statement_id', statement.id)

  const { data: unpaid } = await supabaseAdmin
    .from('unpaid_invoices')
    .select('*')
    .eq('statement_id', statement.id)
    
    // Build context for Claude
  const context = `
You are a financial assistant for 177/179 Columbia Heights, a residential cooperative in Brooklyn, NY.
You have access to the March 2026 financial statement. Answer questions clearly and cite specific figures.

MONTHLY SUMMARY (March 2026):
- Total Income: $${statement.total_income}
- Total Expenses: $${statement.total_expenses}
- Net P&L: $${statement.net_pl}
- Operating Account Balance: $${statement.operating_balance}
- Money Market Balance: $${statement.money_market_balance}
- Total Cash: $${statement.total_cash}
- Unpaid Invoices: $${statement.unpaid_invoices_total}
- Notes: ${statement.notes}

INCOME ITEMS:
${income.map(i => `- ${i.description} (${i.billing_code}): $${i.amount}${i.notes ? ' | ' + i.notes : ''}`).join('\n')}

EXPENSE ITEMS:
${expenses.map(e => `- ${e.category} (${e.vendor ?? 'N/A'}): $${e.amount}${e.notes ? ' | ' + e.notes : ''}`).join('\n')}

SHAREHOLDER DELINQUENCY:
${delinquency.map(d => `- Unit ${d.unit} (${d.shareholder_name}): Owes $${d.balance_owed}, Paid $${d.payment_received}${d.notes ? ' | ' + d.notes : ''}`).join('\n')}

UNPAID INVOICES:
${unpaid.map(u => `- ${u.vendor}: $${u.amount}${u.notes ? ' | ' + u.notes : ''}`).join('\n')}
`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    system: context,
    messages: [{ role: 'user', content: message }]
  })

  const reply = response.content[0].type === 'text' ? response.content[0].text : ''

  return NextResponse.json({ reply })
}