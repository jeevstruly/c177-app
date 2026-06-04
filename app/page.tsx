import { supabase } from '@/lib/supabase'

export default async function Home() {
  const { data, error } = await supabase
    .from('monthly_statements')
    .select('period_label')

  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      <h1>C177 Connected</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}