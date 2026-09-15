import { notFound } from 'next/navigation'
import App from '../../src/main'

const modules = ['dashboard', 'cultivos', 'insumos', 'movimientos', 'cosechas', 'reportes', 'equipo']

export function generateStaticParams() {
  return modules.map(module => ({ module }))
}

export const dynamicParams = false

export default async function ModulePage({ params }) {
  const { module } = await params

  if (!modules.includes(module)) {
    notFound()
  }

  return <App initialModule={module} />
}
