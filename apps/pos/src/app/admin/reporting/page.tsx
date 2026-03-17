import { redirect } from 'next/navigation'

// Reports have moved to the standalone /reports section
export default function AdminReportingRedirect() {
  redirect('/reports')
}
