import { Link, useLocation } from 'react-router-dom';

export default function SiteFooter() {
  const { pathname } = useLocation();
  return (
    <footer className="site-footer print:hidden">
      <div className="footer-grid">
        <div>
          <Link className="footer-brand" to="/">AutoPremium <span>CDMX</span></Link>
          <p>Encuentra el vehículo que va contigo. Explora nuestras colecciones y visítanos para conocerlo de cerca.</p>
        </div>
        <div>
          <h2>Explora</h2>
          <ul className="footer-links" aria-label="Enlaces del pie de página">
            <li><Link to="/">Inicio</Link></li>
            <li><Link to="/catalogo">Catálogo</Link></li>
            <li><Link to="/carrito">Carrito</Link></li>
            <li><Link to={`${pathname}#mapa-showroom`}>Dónde encontrarnos</Link></li>
          </ul>
        </div>
        <div>
          <h2>Visítanos</h2>
          <address>Av. Telecomunicaciones, Chinam Pac de Juárez, Iztapalapa, 09208 Ciudad de México.</address>
          <p>Lunes a viernes: 09:00–20:00<br />Sábados: 10:00–18:00<br />Domingos: 10:00–15:00</p>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} AutoPremium CDMX.</p>
        <Link to={pathname}>Volver arriba ↑</Link>
      </div>
    </footer>
  );
}
