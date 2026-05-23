import React from 'react';

export default function CarCard({ car, agregarAlCarrito, theme }) {
  if (!car) {
    return (
      <div className="bg-zinc-950 border border-zinc-900 rounded-3xl h-[550px] animate-pulse flex items-center justify-center text-zinc-600">
        <span className="text-sm uppercase tracking-widest">Cargando unidad...</span>
      </div>
    );
  }

  let specs = {};
  try {
    if (car.especificaciones) {
      specs = typeof car.especificaciones === 'string' 
        ? JSON.parse(car.especificaciones) 
        : car.especificaciones;
    }
  } catch (error) {
    specs = {};
  }

  // Si no se pasa un tema, usamos la categoría por defecto
  const cardTheme = theme || car.categoria;

  const getCardStyle = () => {
    switch (cardTheme) {
      case 'gasolina': return 'bg-zinc-900 border-zinc-800/80 text-white shadow-xl hover:border-zinc-500/50';
      case 'hibrido': return 'bg-[#0a1417] border-cyan-900/40 text-slate-100 hover:border-cyan-500/50';
      case 'electrico': return 'bg-[#030303] border-emerald-900/30 text-zinc-100 hover:border-[#00ffcc]/50 shadow-[0_0_20px_rgba(0,255,204,0.03)]';
      case 'superdeportivo': return 'bg-[#050505] border-red-950/40 text-white hover:border-red-600/50 shadow-[0_15px_40px_rgba(220,38,38,0.08)]';
      default: return 'bg-zinc-950 border-zinc-900 text-white hover:border-blue-500/40';
    }
  };

  const getButtonStyle = () => {
    switch (cardTheme) {
      case 'gasolina': return 'bg-zinc-200 hover:bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.1)]';
      case 'hibrido': return 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.2)]';
      case 'electrico': return 'bg-[#00ffcc] hover:bg-white text-black font-black shadow-[0_0_15px_rgba(0,255,204,0.3)]';
      case 'superdeportivo': return 'bg-red-600 hover:bg-red-700 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]';
      default: return 'bg-blue-600 hover:bg-blue-500 text-white';
    }
  };

  return (
    <div className={`border rounded-3xl overflow-hidden transition-all duration-500 flex flex-col group ${getCardStyle()}`}>
      
      {/* 1. SECCIÓN DE IMAGEN MÁS GRANDE (h-80 = 320px) */}
      <div className="w-full h-80 overflow-hidden relative bg-black">
        <img 
          src={car.imagen} 
          alt={`${car.marca} ${car.modelo}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90 group-hover:opacity-100"
          onError={(e) => {
            e.target.src = "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&q=80&w=800";
          }}
        />
        <span className={`absolute top-5 right-5 text-[10px] font-black px-4 py-2 uppercase tracking-widest rounded-full border backdrop-blur-md ${
          cardTheme === 'gasolina' ? 'bg-zinc-900/80 text-zinc-300 border-zinc-600/50' :
          cardTheme === 'hibrido' ? 'bg-cyan-950/80 text-cyan-400 border-cyan-500/30' :
          cardTheme === 'electrico' ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30' :
          'bg-red-950/80 text-red-400 border-red-500/30'
        }`}>
          {car.categoria}
        </span>
      </div>

      {/* 2. CONTENIDO INFORMATIVO DEL AUTO */}
      <div className="p-8 flex-1 flex flex-col justify-between">
        <div>
          {/* Título y Año (Textos más grandes) */}
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-2xl md:text-3xl font-extrabold tracking-wide">
              {car.marca} <span className="font-light opacity-70 block md:inline text-xl">{car.modelo}</span>
            </h3>
            <span className={`text-sm font-mono px-3 py-1 rounded border ${
              cardTheme === 'gasolina' ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-zinc-900/50 border-zinc-800/50 text-zinc-400'
            }`}>
              {car.anio}
            </span>
          </div>

          <p className="text-sm opacity-85 line-clamp-2 mb-8 font-light leading-relaxed">
            {car.descripcion}
          </p>

          {/* Ficha Técnica */}
          <div className={`grid grid-cols-2 gap-4 p-5 rounded-2xl border mb-8 ${
            cardTheme === 'gasolina' ? 'bg-zinc-950/50 border-zinc-800/50' : 'bg-black/30 border-white/5'
          }`}>
            {Object.entries(specs).length > 0 ? (
              Object.entries(specs).map(([key, val]) => (
                <div key={key} className="text-left">
                  <span className="text-[10px] opacity-60 uppercase block tracking-widest font-bold mb-1">
                    {key.replace(/_/g, ' ')}
                  </span>
                  <span className="text-sm font-medium truncate block">
                    {val}
                  </span>
                </div>
              ))
            ) : (
              <div className="col-span-2 text-center text-xs opacity-50 uppercase tracking-widest py-2">
                Especificaciones en Showroom
              </div>
            )}
          </div>
        </div>

        {/* 3. PRECIO Y BOTÓN DE APARTADO */}
        <div className={`pt-6 border-t flex items-center justify-between ${
          cardTheme === 'gasolina' ? 'border-zinc-800' : 'border-white/10'
        }`}>
          <div>
            <span className="text-[10px] uppercase tracking-widest opacity-60 block mb-1">Precio de Lista</span>
            <span className="text-2xl font-mono font-bold">
              ${Number(car.precio).toLocaleString('es-MX')} <span className="text-xs font-sans opacity-60">MXN</span>
            </span>
          </div>

          <button 
            onClick={() => agregarAlCarrito && agregarAlCarrito(car.id)}
            className={`px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-300 ${getButtonStyle()}`}
          >
            Apartar
          </button>
        </div>
      </div>
    </div>
  );
}