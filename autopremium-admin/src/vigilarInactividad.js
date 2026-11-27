export function vigilarInactividad(alVencer, renovar) {
  const limite = 60_000;
  const intervaloRenovacion = 10_000;
  const eventos = ['pointerdown', 'keydown', 'touchstart', 'scroll', 'wheel'];
  let ultimaActividad = Date.now();
  let ultimaRenovacion = 0;
  let vencimiento;
  let pendiente;
  let activa = true;

  function detener() {
    activa = false;
    window.clearTimeout(vencimiento);
    window.clearTimeout(pendiente);
    eventos.forEach(evento => window.removeEventListener(evento, registrarActividad));
    document.removeEventListener('visibilitychange', comprobarVencimiento);
  }

  function comprobarVencimiento() {
    if (!activa || Date.now() - ultimaActividad < limite) return false;
    detener();
    alVencer();
    return true;
  }

  function informarActividad() {
    pendiente = undefined;
    if (!activa || comprobarVencimiento()) return;
    ultimaRenovacion = Date.now();
    renovar();
  }

  function registrarActividad() {
    if (!activa || comprobarVencimiento()) return;
    ultimaActividad = Date.now();
    window.clearTimeout(vencimiento);
    vencimiento = window.setTimeout(comprobarVencimiento, limite);
    const espera = intervaloRenovacion - (ultimaActividad - ultimaRenovacion);
    if (espera <= 0) {
      window.clearTimeout(pendiente);
      informarActividad();
    } else if (pendiente === undefined) {
      pendiente = window.setTimeout(informarActividad, espera);
    }
  }

  eventos.forEach(evento => window.addEventListener(evento, registrarActividad, { passive: true }));
  document.addEventListener('visibilitychange', comprobarVencimiento);
  vencimiento = window.setTimeout(comprobarVencimiento, limite);
  informarActividad();
  return detener;
}
