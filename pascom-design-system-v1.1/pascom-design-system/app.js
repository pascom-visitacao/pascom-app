/**
 * PASCOM DESIGN SYSTEM — app.js
 * Renderiza as escalas a partir de tokens.js e adiciona pequenas interações
 * de demonstração (tabs, paginação, cópia de token, navegação ativa).
 */
(function () {
  var T = window.PASCOM_TOKENS;

  /* ---------- Escalas de cor ---------- */
  document.querySelectorAll('[data-scale]').forEach(function (grid) {
    var key = grid.getAttribute('data-scale');
    var scale = T.color[key];
    Object.keys(scale).forEach(function (step) {
      var hex = scale[step];
      var el = document.createElement('div');
      el.className = 'ds-swatch';
      el.setAttribute('data-token', '--color-' + key + '-' + step);
      el.innerHTML =
        '<div class="ds-swatch-color" style="background:' + hex + '"></div>' +
        '<div class="ds-swatch-meta"><span class="name">' + T.colorNames[key] + ' ' + step + '</span><span class="hex">' + hex + '</span></div>';
      el.style.cursor = 'pointer';
      el.addEventListener('click', function () { copyToken('--color-' + key + '-' + step, el); });
      grid.appendChild(el);
    });
  });

  function copyToken(tokenName, el) {
    var meta = el.querySelector('.hex');
    var original = meta.textContent;
    var done = function () {
      meta.textContent = 'Copiado!';
      setTimeout(function () { meta.textContent = original; }, 1100);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(tokenName).then(done, done);
    } else {
      done();
    }
  }

  /* ---------- Escala tipográfica ---------- */
  var typeHost = document.getElementById('type-scale');
  if (typeHost) {
    var familyMap = { display: 'var(--font-display)', body: 'var(--font-body)', mono: 'var(--font-mono)' };
    T.type.forEach(function (row) {
      var div = document.createElement('div');
      div.className = 'type-row';
      div.innerHTML =
        '<span class="sample" style="font-family:' + familyMap[row.family] + '; font-size:' + row.px + 'px; font-weight:' + row.weight + ';">' + row.sample + '</span>' +
        '<span class="meta">--' + row.token + '<br>' + row.px + 'px · peso ' + row.weight + '</span>';
      typeHost.appendChild(div);
    });
  }

  /* ---------- Escala de espaçamento ---------- */
  var spacingHost = document.getElementById('spacing-scale');
  if (spacingHost) {
    var maxPx = T.spacing[T.spacing.length - 1].px;
    T.spacing.forEach(function (row) {
      var div = document.createElement('div');
      div.className = 'scale-row';
      var barWidth = Math.max(4, (row.px / maxPx) * 320);
      div.innerHTML =
        '<span class="token">--' + row.token + '</span>' +
        '<div class="bar" style="width:' + barWidth + 'px;"></div>' +
        '<span class="px">' + row.px + 'px</span>';
      spacingHost.appendChild(div);
    });
  }

  /* ---------- Escala de raio ---------- */
  var radiusHost = document.getElementById('radius-scale');
  if (radiusHost) {
    T.radius.forEach(function (row) {
      var div = document.createElement('div');
      div.className = 'radius-demo-item';
      var radiusCss = row.px > 999 ? '9999px' : row.px + 'px';
      div.innerHTML =
        '<div class="radius-demo-box" style="border-radius:' + radiusCss + ';"></div>' +
        '<span class="lbl">--' + row.token + '<br>' + (row.px > 999 ? 'full' : row.px + 'px') + '</span>';
      radiusHost.appendChild(div);
    });
  }

  /* ---------- Tabs de demonstração ---------- */
  var tabHost = document.getElementById('demo-tabs');
  if (tabHost) {
    tabHost.addEventListener('click', function (e) {
      var item = e.target.closest('.tab-item');
      if (!item) return;
      tabHost.querySelectorAll('.tab-item').forEach(function (t) { t.classList.remove('is-active'); });
      item.classList.add('is-active');
    });
  }

  /* ---------- Paginação de demonstração ---------- */
  var pagHost = document.getElementById('demo-pagination');
  if (pagHost) {
    pagHost.addEventListener('click', function (e) {
      var item = e.target.closest('.page-item[data-page]');
      if (!item) return;
      pagHost.querySelectorAll('.page-item[data-page]').forEach(function (t) { t.classList.remove('is-active'); });
      item.classList.add('is-active');
    });
  }

  /* ---------- Modal: abrir/fechar ---------- */
  document.querySelectorAll('[data-modal-open]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var overlay = document.getElementById(btn.getAttribute('data-modal-open'));
      if (overlay) overlay.classList.add('is-open');
    });
  });
  document.querySelectorAll('.modal-overlay').forEach(function (overlay) {
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay || e.target.closest('[data-modal-close]')) {
        overlay.classList.remove('is-open');
      }
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.is-open').forEach(function (o) { o.classList.remove('is-open'); });
    }
  });

  /* ---------- Navegação ativa na sidebar ---------- */
  var sections = document.querySelectorAll('main .ds-section, main .ds-hero');
  var links = document.querySelectorAll('.ds-nav-link');
  if ('IntersectionObserver' in window && sections.length) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var id = entry.target.getAttribute('id');
          links.forEach(function (l) {
            l.classList.toggle('is-active', l.getAttribute('href') === '#' + id);
          });
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });
    sections.forEach(function (s) { obs.observe(s); });
  }
})();
