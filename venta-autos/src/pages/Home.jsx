import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="w-full relative">
      <section className="relative min-h-[36rem] flex flex-col justify-center items-start px-8 md:px-24 bg-surface overflow-hidden pt-20">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&q=80&w=1920"
            alt=""
            className="home-hero-image w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0"></div>
        </div>

        <div className="relative z-10 max-w-3xl hero-copy p-6 rounded-2xl">
          <p className="text-content font-bold tracking-normal text-sm uppercase mb-4 mt-10">Redefiniendo la conducción</p>
          <h1 className="heading-large font-black text-content leading-tight mb-6">
            El camino a <br/>
            <span className="text-content">tu manera.</span>
          </h1>
          <p className="text-content text-base md:text-xl font-normal mb-10 max-w-xl leading-relaxed">
            Explora nuestro catálogo exclusivo de vehículos diseñados bajo los más altos estándares de desempeño, lujo y sostenibilidad tecnológica.
          </p>
          <button
            onClick={() => navigate('/catalogo')}
            className="bg-panel hover:bg-panel text-content px-8 py-4 rounded-full font-bold flex items-center gap-3"
          >
            Ver Catálogo <span>→</span>
          </button>
        </div>
      </section>

      <section className="py-24 px-8 md:px-24 bg-surface text-content">
        <div className="max-w-7xl min-w-0 mx-auto flex flex-col md:flex-row gap-16">
          <div className="md:w-1/3">
            <p className="text-content font-bold uppercase tracking-normal text-sm mb-4">AutoPremium CDMX</p>
            <h2 className="heading-large font-black mb-6 leading-tight">Por qué elegir <br/>nuestra experiencia</h2>
            <p className="text-muted leading-relaxed mb-8">
              No solo vendemos vehículos; entregamos obras maestras de la ingeniería moderna. Ofrecemos un ecosistema de compra transparente y soporte técnico capacitado.
            </p>
            <div className="flex gap-8">
              <div>
                <h3 className="heading-large font-black text-content">100%</h3>
                <p className="text-sm uppercase font-bold text-muted mt-1">Clientes Satisfechos</p>
              </div>
              <div>
                <h3 className="heading-large font-black text-content">10+</h3>
                <p className="text-sm uppercase font-bold text-muted mt-1">Años de Liderazgo</p>
              </div>
            </div>
          </div>

          <div className="md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-8 bg-panel rounded-2xl border border-line shadow-sm">
              <div className="w-12 h-12 bg-panel text-content flex items-center justify-center rounded-xl mb-6 text-xl font-bold">🛡️</div>
              <h3 className="text-xl font-bold mb-3">Garantía Premium</h3>
              <p className="text-muted text-sm leading-relaxed">Cobertura total de fábrica y mantenimiento incluido durante los primeros tres años.</p>
            </div>

            <div className="p-8 bg-panel rounded-2xl border border-line shadow-sm">
              <div className="w-12 h-12 bg-panel text-content flex items-center justify-center rounded-xl mb-6 text-xl font-bold">$</div>
              <h3 className="text-xl font-bold mb-3">Financiamiento</h3>
              <p className="text-muted text-sm leading-relaxed">Planes flexibles de arrendamiento puro y crédito con tasas preferenciales.</p>
            </div>

            <div className="p-8 bg-panel text-content rounded-2xl border border-line shadow-lg md:col-span-2 flex items-center gap-6">
              <div className="w-16 h-16 bg-panel flex-shrink-0 flex items-center justify-center rounded-full text-2xl">✨</div>
              <div>
                <h3 className="text-xl font-bold mb-2">Personalización Exclusiva a Medida</h3>
                <p className="text-muted text-sm leading-relaxed">
                  Sabemos que un auto de lujo debe ser único. Para configurar colores, acabados interiores y detalles especiales, <strong>te invitamos a agendar una cita y visitar nuestra agencia físicamente</strong>. Un asesor diseñará el auto de tus sueños frente a ti.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-8 md:px-24 bg-surface text-muted border-t border-line">
        <div className="max-w-7xl min-w-0 mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2">
            <h2 className="heading-large font-black mb-4">Colección de <span className="text-muted">Combustión.</span></h2>
            <p className="text-xl font-bold mb-8">Desde $650,000 MXN</p>

            <div className="space-y-6 mb-10">
              <div>
                <h3 className="text-lg font-bold">Motores Eficientes</h3>
                <p className="text-muted text-sm">Bloques de 1.5L a 2.0L turbo de última generación para un excelente rendimiento diario.</p>
              </div>
              <div>
                <h3 className="text-lg font-bold">Alto Desempeño</h3>
                <p className="text-muted text-sm">Imponentes configuraciones V6 y V8 atmosféricos con un rugido inconfundible.</p>
              </div>
              <div>
                <h3 className="text-lg font-bold">Tecnología Twin-Turbo</h3>
                <p className="text-muted text-sm">Sistemas de sobrealimentación que maximizan la aceleración en cualquier rango de RPM.</p>
              </div>
            </div>

            <button onClick={() => navigate('/catalogo')} className="bg-panel hover:bg-surface text-content px-8 py-4 rounded-xl font-bold w-full md:w-auto">
              Ver Catálogo de Gasolina
            </button>
          </div>
          <div className="lg:w-1/2 h-64 md:h-96 w-full bg-panel rounded-3xl overflow-hidden relative shadow-2xl">
            <img src="https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&q=80&w=800" alt="Auto Gasolina" className="w-full h-full object-cover"/>
            <span className="absolute top-4 right-4 bg-surface text-content px-4 py-1 rounded-full text-sm font-bold tracking-normal backdrop-blur-sm">LUJO CLÁSICO</span>
          </div>
        </div>
      </section>

      <section className="py-24 px-8 md:px-24 bg-panel text-content border-t-4 border-line">
        <div className="max-w-7xl min-w-0 mx-auto flex flex-col lg:flex-row-reverse items-center gap-16">
          <div className="lg:w-1/2">
            <h2 className="heading-large font-black mb-4">Dinámica <span className="text-content">Híbrida.</span></h2>
            <p className="text-content text-lg mb-8 font-normal">La inteligencia de unir dos mundos.</p>
            <p className="text-muted leading-relaxed mb-8">
              Experimenta el balance perfecto. Conduce en ciudad con cero consumo gracias a nuestras baterías de alta densidad, y desata la potencia del motor térmico para viajes largos sin preocuparte por la autonomía. Diseño aerodinámico y pantallas holográficas internas.
            </p>
            <button onClick={() => navigate('/catalogo')} className="border-2 border-line text-content hover:bg-panel hover:text-content px-8 py-3 rounded-full font-bold w-full md:w-auto">
              Explorar Híbridos
            </button>
          </div>
          <div className="lg:w-1/2 h-64 md:h-96 w-full bg-panel rounded-3xl overflow-hidden relative">
            <img src="https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&q=80&w=800" alt="Auto Hibrido" className="w-full h-full object-cover"/>
          </div>
        </div>
      </section>

      <section className="py-24 px-8 md:px-24 bg-surface text-content relative">
        <div className="max-w-7xl min-w-0 mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2">
            <h2 className="heading-large font-black mb-4 text-content">Revolución Eléctrica.</h2>
            <p className="text-muted text-lg mb-8 font-normal">El futuro no hace ruido. Acelera.</p>
            <ul className="space-y-4 mb-8 text-content">
              <li className="flex items-center gap-3"><span className="text-content">⚡</span> 0 a 100 km/h en menos de 2.1 segundos.</li>
              <li className="flex items-center gap-3"><span className="text-content">🔋</span> Autonomías que superan los 600 kilómetros.</li>
              <li className="flex items-center gap-3"><span className="text-content">🔌</span> Red de carga ultra-rápida exclusiva.</li>
            </ul>
            <button onClick={() => navigate('/catalogo')} className="bg-surface text-content px-8 py-3 rounded-sm font-bold uppercase tracking-normal hover:bg-surface w-full md:w-auto">
              Explorar eléctricos
            </button>
          </div>
          <div className="lg:w-1/2 h-64 md:h-96 w-full rounded-3xl overflow-hidden relative group">
            <img src="https://images.unsplash.com/photo-1536700503339-1e4b06520771?auto=format&fit=crop&q=80&w=800" alt="Tesla Model S" className="w-full h-full object-cover group-hover:scale-105"/>
          </div>
        </div>
      </section>

      <section className="py-24 px-8 md:px-24 bg-surface text-content border-t-2 border-line relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-panel blur-[100px] pointer-events-none"></div>
        <div className="max-w-7xl min-w-0 mx-auto flex flex-col lg:flex-row-reverse items-center gap-16 relative z-10">
          <div className="lg:w-1/2">
            <h2 className="heading-large font-black mb-4 text-content uppercase tracking-tighter italic">Adrenalina Pura.</h2>
            <div className="w-24 h-2 bg-panel mb-8"></div>
            <p className="text-muted leading-relaxed mb-8">
              Jaulas antivuelco, chasis monocasco de fibra de carbono y aerodinámica activa. Vehículos nacidos en la pista de carreras, presentados en una estética <span className="text-content font-bold">oscura y sigilosa</span>, homologados estratégicamente para dominar las calles.
            </p>
            <button onClick={() => navigate('/catalogo')} className="bg-panel hover:bg-panel text-content border border-line px-10 py-4 rounded font-black uppercase tracking-normal w-full md:w-auto">
              Explorar superdeportivos
            </button>
          </div>
          <div className="lg:w-1/2 h-64 md:h-96 w-full bg-surface rounded-xl border border-line overflow-hidden relative group">
            <div className="absolute inset-0 z-10"></div>
            <img src="https://i.pinimg.com/originals/2b/1f/53/2b1f53744c3ccb7b81a81086e3f289cc.jpg" alt="McLaren Superdeportivo" className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 group-hover:scale-105"/>
          </div>
        </div>
      </section>



    </div>
  );
}
