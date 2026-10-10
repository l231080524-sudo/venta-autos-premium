export default function Showroom() {
  return (
      <section id="mapa-showroom" aria-labelledby="mapa-titulo" tabIndex={-1} className="showroom-section py-16 px-8 md:px-24 bg-surface border-t border-line text-content print:hidden">
            <div className="max-w-7xl mx-auto mb-8">
              <h2 id="mapa-titulo" className="text-3xl heading-large font-black mb-2">Visita Nuestro Showroom</h2>
              <p className="text-content font-bold uppercase tracking-normal text-sm">Agenda tu cita para personalización</p>
            </div>
        <div className="max-w-7xl min-w-0 mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="showroom-map w-full bg-panel rounded-2xl border border-line overflow-hidden shadow-2xl relative">
            <iframe
              title="Ubicación AutoPremium CDMX"
              className="w-full h-full border-0 filter"
              src="https://maps.google.com/maps?q=Av%20Telecomunicaciones,%20Chinam%20Pac%20de%20Juárez,%20Iztapalapa,%2009208%20Ciudad%20de%20México,%20CDMX&t=&z=16&ie=UTF8&iwloc=&output=embed"
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
          <div className="space-y-8">

            <div className="bg-panel p-6 md:p-8 rounded-2xl border border-line space-y-6">
              <div>
                <h3 className="text-sm text-muted uppercase tracking-normal font-bold mb-3 flex items-center gap-2"><span>📍</span> Ubicación</h3>
                <p className="text-lg text-content">Av Telecomunicaciones, Chinam Pac de Juárez,<br/> Iztapalapa, 09208 Ciudad de México, CDMX</p>
                <a className="map-link" href="https://maps.google.com/?q=Av+Telecomunicaciones+Chinam+Pac+de+Juarez+Iztapalapa+CDMX">Abrir ubicación en Google Maps</a>
              </div>
              <div className="h-px w-full bg-panel"></div>
              <div>
                <h3 className="text-sm text-muted uppercase tracking-normal font-bold mb-3 flex items-center gap-2"><span>🕒</span> Horarios de Atención</h3>
                <ul className="space-y-3 text-content">
                  <li className="flex flex-wrap gap-3 justify-between items-center">
                    <span>Lunes a Viernes</span>
                    <span className="font-ui bg-surface px-3 py-1 rounded text-sm">09:00 - 20:00</span>
                  </li>
                  <li className="flex flex-wrap gap-3 justify-between items-center">
                    <span>Sábados</span>
                    <span className="font-ui bg-surface px-3 py-1 rounded text-sm">10:00 - 18:00</span>
                  </li>
                  <li className="flex flex-wrap gap-3 justify-between items-center">
                    <span>Domingos</span>
                    <span className="font-ui bg-surface px-3 py-1 rounded text-sm">10:00 - 15:00</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

        </div>
      </section>
  );
}
