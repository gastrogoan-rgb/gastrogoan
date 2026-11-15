/* GastroGoan · web comercial. Sin dependencias. Si este fichero no carga, la página se ve entera: nada queda oculto a la espera de él. */
(function(){
  var d = document, r = d.documentElement;
  r.classList.add('js');
  var reducir = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Cabecera: filete fino cuando se ha bajado de la parte alta.
  var cab = d.querySelector('.cab');
  if(cab){
    var f = function(){ cab.classList.toggle('scrolled', (window.scrollY || r.scrollTop) > 8); };
    f(); addEventListener('scroll', f, {passive: true});
  }

  // Barra de compra del móvil: aparece cuando el primer bloque ya no está a la vista.
  var barra = d.getElementById('barra-compra'), heroEl = d.querySelector('.hero');
  if(barra && heroEl && 'IntersectionObserver' in window){
    d.body.classList.add('con-barra');
    new IntersectionObserver(function(es){ var v = es[0].isIntersecting; barra.classList.toggle('on', !v); barra.setAttribute('aria-hidden', v ? 'true' : 'false'); barra.querySelector('a').tabIndex = v ? -1 : 0; }, {threshold: 0}).observe(heroEl);
  }

  // Aparición suave al entrar en pantalla. Lo que ya se ve al cargar se muestra al instante.
  var rv = [].slice.call(d.querySelectorAll('.rv'));
  if(!rv.length) return;
  if(reducir || !('IntersectionObserver' in window)){ rv.forEach(function(e){ e.classList.add('visto'); }); }
  else {
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('visto'); io.unobserve(e.target); } });
    }, {rootMargin: '0px 0px -8% 0px', threshold: .08});
    rv.forEach(function(e){ io.observe(e); });
    // Red de seguridad: si por lo que sea algo no llega a verse, a los 2,5 s se muestra todo.
    setTimeout(function(){ rv.forEach(function(e){ e.classList.add('visto'); }); }, 2500);
  }

  // Pestañas accesibles (capturas de la app y menús de ejemplo). Sin JS se ven todos los paneles apilados.
  [].slice.call(d.querySelectorAll('[data-tabs]')).forEach(function(box){
    var tabs = [].slice.call(box.querySelectorAll('[role=tab]'));
    var panels = tabs.map(function(t){ return d.getElementById(t.getAttribute('aria-controls')); });
    function ir(i, foco){
      tabs.forEach(function(t, k){ t.setAttribute('aria-selected', k === i ? 'true' : 'false'); t.tabIndex = k === i ? 0 : -1; });
      panels.forEach(function(p, k){ if(p){ if(k === i){ p.removeAttribute('hidden'); } else { p.setAttribute('hidden', ''); } } });
      if(foco) tabs[i].focus();
    }
    tabs.forEach(function(t, i){
      t.addEventListener('click', function(){ ir(i); });
      t.addEventListener('keydown', function(e){
        var k = e.key, n = tabs.length;
        if(k === 'ArrowRight' || k === 'ArrowDown'){ e.preventDefault(); ir((i + 1) % n, true); }
        else if(k === 'ArrowLeft' || k === 'ArrowUp'){ e.preventDefault(); ir((i - 1 + n) % n, true); }
        else if(k === 'Home'){ e.preventDefault(); ir(0, true); }
        else if(k === 'End'){ e.preventDefault(); ir(n - 1, true); }
      });
    });
    ir(0);
  });
})();
