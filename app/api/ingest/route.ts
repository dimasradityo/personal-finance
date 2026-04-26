import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ClassificationRule, TransactionType } from '@/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface IngestBody {
  account_name: string
  merchant: string
  amount: number
  date: string
  raw_email?: string
}

async function insertIngestionError(reason: string, rawEmail: string | null) {
  await supabase.from('ingestion_errors').insert({
    raw_email: rawEmail ?? '',
    error_reason: reason,
    is_resolved: false,
  })
}

export async function POST(req: NextRequest) {
  let body: Partial<IngestBody> = {}
  let rawEmail: string | null = null

  try {
    body = (await req.json()) as Partial<IngestBody>
    rawEmail = body.raw_email ?? null
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 422 })
  }

  // 1. Validate required fields
  if (!body.account_name || !body.merchant || body.amount == null || !body.date) {
    await insertIngestionError('Missing required fields: account_name, merchant, amount, date', rawEmail)
    return NextResponse.json(
      { error: 'Missing required fields: account_name, merchant, amount, date' },
      { status: 422 }
    )
  }

  const { account_name, merchant, amount, date } = body as IngestBody

  try {
    // 2. Look up account by name
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id')
      .eq('name', account_name)
      .eq('is_active', true)
      .single()

    if (accountError || !account) {
      await insertIngestionError(`Account not found: ${account_name}`, rawEmail)
      return NextResponse.json({ error: `Account not found: ${account_name}` }, { status: 404 })
    }

    // 3. Dedup check
    const { data: existing, error: dedupError } = await supabase
      .from('transactions')
      .select('id')
      .eq('account_id', account.id)
      .eq('amount', amount)
      .eq('date', date)
      .eq('merchant', merchant)
      .limit(1)

    if (dedupError) {
      await insertIngestionError(`Dedup check failed: ${dedupError.message}`, rawEmail)
      return NextResponse.json({ error: 'Internal error during dedup check' }, { status: 422 })
    }

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'Duplicate transaction' }, { status: 409 })
    }

    // 4. Load enabled classification rules and find a match
    const { data: rules } = await supabase
      .from('classification_rules')
      .select('*')
      .eq('is_enabled', true)

    let matchedType: TransactionType | null = null
    let matchedCategoryId: string | null = null

    if (rules) {
      const matchedRule = (rules as ClassificationRule[]).find((rule) =>
        merchant.toLowerCase().includes(rule.keyword.toLowerCase())
      )
      if (matchedRule) {
        matchedType = matchedRule.transaction_type as TransactionType
        matchedCategoryId = matchedRule.category_id
      }
    }

    // 5. Insert transaction
    const { data: tx, error: txError } = await supabase
      .from('transactions')
      .insert({
        account_id: account.id,
        date,
        merchant,
        amount,
        type: matchedType,
        category_id: matchedCategoryId,
        source: 'auto',
        raw_email: rawEmail,
        installment_converted: false,
      })
      .select('id')
      .single()

    if (txError || !tx) {
      await insertIngestionError(txError?.message ?? 'Failed to insert transaction', rawEmail)
      return NextResponse.json({ error: 'Failed to insert transaction' }, { status: 422 })
    }

    return NextResponse.json({ id: tx.id }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    await insertIngestionError(message, rawEmail)
    return NextResponse.json({ error: message }, { status: 422 })
  }
}
