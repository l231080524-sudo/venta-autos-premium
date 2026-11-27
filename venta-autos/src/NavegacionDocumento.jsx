import { useLayoutEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const enlacesDelMenu = '.brand, .site-nav a';
const enlacesDelPie = '.footer-brand, .footer-links a, .footer-bottom a';

export default function NavegacionDocumento() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useLayoutEffect(() => {
    document.getElementById('portada').hidden = pathname !== '/';
    document.getElementById('anio-pie').textContent = new Date().getFullYear();
    document.getElementById('volver-arriba').setAttribute('href', pathname);

    for (const enlace of document.querySelectorAll('a[href$="#mapa-showroom"]')) {
      enlace.setAttribute('href', pathname + '#mapa-showroom');
    }

    for (const enlace of document.querySelectorAll(enlacesDelMenu)) {
      const activa = enlace.getAttribute('href') === pathname.toLowerCase();
      enlace.classList.toggle('active', activa);
      if (activa) enlace.setAttribute('aria-current', 'page');
      else enlace.removeAttribute('aria-current');
    }

    function seguirEnlace(event) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return;
      if (!(event.target instanceof Element)) return;

      const enlace = event.target.closest(enlacesDelMenu + ', ' + enlacesDelPie);
      const boton = event.target.closest('#portada .ir-al-catalogo');
      if (!enlace && !boton) return;
      if (enlace?.hasAttribute('download') || (enlace?.target && enlace.target !== '_self')) return;

      const destino = enlace ? enlace.getAttribute('href') : '/catalogo';
      if (!destino?.startsWith('/') || destino.startsWith('//')) return;
      event.preventDefault();
      navigate(destino, { replace: destino === pathname });
    }

    document.addEventListener('click', seguirEnlace);
    return () => document.removeEventListener('click', seguirEnlace);
  }, [navigate, pathname]);

  return null;
}
