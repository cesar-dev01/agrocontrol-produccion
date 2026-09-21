import '../src/styles.css'
import '../src/routes.css'
import '../src/theme.css'
import Script from 'next/script'

export const metadata = {
  title: 'AgroControl | Gestión de cultivos',
  description: 'Control de inversiones, producción y cosechas.',
}

const themeScript = "try{document.documentElement.dataset.theme=localStorage.getItem('agro-theme')||'light'}catch(error){document.documentElement.dataset.theme='light'}"

export default function RootLayout({ children }) {
  return <html lang="es" suppressHydrationWarning><body><Script id="agrocontrol-theme" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeScript }} />{children}</body></html>
}
