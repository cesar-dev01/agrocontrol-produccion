import '../src/styles.css'
import '../src/routes.css'
import '../src/theme.css'

export const metadata = {
  title: 'AgroControl | Gestión de cultivos',
  description: 'Control de inversiones, producción y cosechas.',
}

export default function RootLayout({ children }) {
  return <html lang="es"><body>{children}</body></html>
}
