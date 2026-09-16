import { notFound } from 'next/navigation'

const modules = ['dashboard', 'cultivos', 'insumos', 'movimientos', 'cosechas', 'reportes', 'equipo', 'configuracion']

export function generateStaticParams() {
  return modules.map(module => ({ module }))
}

export const dynamicParams = false

export default async function ModulePage({ params }) {
  const { module } = await params

  if (!modules.includes(module)) {
    notFound()
  }

  return null
}
