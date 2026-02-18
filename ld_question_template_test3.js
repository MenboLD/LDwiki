(() => {
  const el = (id) => document.getElementById(id);

  const state = {
    units: [
      { id: 5009, owned: false, lv: '未', treasure: false },
      { id: 5009, owned: true,  lv: '12', treasure: true },
      { id: 5009, owned: true,  lv: '6',  treasure: false },
    ],
    _exportUrl: null,
  };

  function showExportError(msg) {
    const out = el('exportOut');
    const err = el('exportErr');
    out.hidden = false;
    err.hidden = false;
    err.textContent = msg;
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function toast(msg) {
    // minimal toast (topbar title overwrite for test)
    console.log('[toast]', msg);
  }

  function unitSvgUrl(id) {
    // same-origin path (GitHub Pages): /LDwiki/svg/xxxx.svg
    return `svg/${id}.svg`;
  }

  function makeTile(idx) {
    const u = state.units[idx];

    const tile = document.createElement('div');
    tile.className = 'unitTile' + (u.owned ? '' : ' unitTile--unowned');

    const wrap = document.createElement('div');
    wrap.className = 'unitImgWrap';

    const img = document.createElement('img');
    img.alt = `unit ${u.id}`;
    img.loading = 'eager';
    img.decoding = 'async';
    img.src = unitSvgUrl(u.id);

    // If missing, show a tiny placeholder (still lets us test capture)
    img.onerror = () => {
      img.removeAttribute('src');
      img.alt = `missing svg/${u.id}.svg`;
    };

    const badgeLv = document.createElement('div');
    badgeLv.className = 'overlayLv';
    badgeLv.textContent = u.owned ? u.lv : '未';

    const badgeT = document.createElement('div');
    badgeT.className = 'overlayTreasure';
    badgeT.textContent = (u.owned && u.treasure && (u.lv === '12' || u.lv === '15')) ? '専' : '';

    wrap.appendChild(img);
    wrap.appendChild(badgeLv);
    wrap.appendChild(badgeT);

    const controls = document.createElement('div');
    controls.className = 'controls';

    const btnOwned = document.createElement('button');
    btnOwned.className = 'pill';
    btnOwned.type = 'button';
    btnOwned.textContent = u.owned ? '所持' : '未所持';
    btnOwned.setAttribute('aria-pressed', u.owned ? 'true' : 'false');
    btnOwned.onclick = () => {
      u.owned = !u.owned;
      if (!u.owned) u.treasure = false;
      render();
    };

    const btnLv = document.createElement('button');
    btnLv.className = 'pill';
    btnLv.type = 'button';
    btnLv.textContent = `Lv ${u.owned ? u.lv : '未'}`;
    btnLv.onclick = () => {
      if (!u.owned) return;
      const order = ['6','12','15'];
      const cur = order.indexOf(u.lv);
      u.lv = order[(cur + 1) % order.length];
      if (u.lv === '6') u.treasure = false; // NG rule for test
      render();
    };

    const btnTreasure = document.createElement('button');
    btnTreasure.className = 'pill';
    btnTreasure.type = 'button';
    btnTreasure.textContent = u.treasure ? '専 ON' : '専 OFF';
    btnTreasure.setAttribute('aria-pressed', u.treasure ? 'true' : 'false');
    btnTreasure.onclick = () => {
      if (!u.owned) return;
      if (u.lv === '6') return; // NG rule for test
      u.treasure = !u.treasure;
      render();
    };

    controls.appendChild(btnOwned);
    controls.appendChild(btnLv);
    controls.appendChild(btnTreasure);

    tile.appendChild(wrap);
    tile.appendChild(controls);

    return tile;
  }

  function render() {
    const grid = el('unitGrid');
    grid.innerHTML = '';
    for (let i = 0; i < state.units.length; i++) grid.appendChild(makeTile(i));

    // sync id inputs
    el('id1').value = state.units[0].id;
    el('id2').value = state.units[1].id;
    el('id3').value = state.units[2].id;
  }

  el('btnApplyIds').addEventListener('click', () => {
    const ids = [Number(el('id1').value), Number(el('id2').value), Number(el('id3').value)];
    ids.forEach((v, i) => { if (Number.isFinite(v) && v > 0) state.units[i].id = v; });
    render();
  });

  el('btnReset').addEventListener('click', () => {
    state.units = [
      { id: 5009, owned: false, lv: '未', treasure: false },
      { id: 5009, owned: true,  lv: '12', treasure: true },
      { id: 5009, owned: true,  lv: '6',  treasure: false },
    ];
    el('exportOut').hidden = true;
    if (state._exportUrl) {
      try { URL.revokeObjectURL(state._exportUrl); } catch {}
      state._exportUrl = null;
    }
    render();
  });

  el('btnExport').addEventListener('click', async () => {
    const errBox = el('exportErr');
    errBox.hidden = true;
    errBox.textContent = '';

    const out = el('exportOut');
    out.hidden = false;

    if (!window.html2canvas) {
      showExportError('html2canvas が読み込めませんでした。通信環境の良い状態で再読み込みしてください。');
      return;
    }

    const node = el('capture');
    const img = el('exportImg');
    const link = el('exportLink');
    const meta = el('exportMeta');
    meta.hidden = true;
    meta.textContent = '';

    toast('画像を生成中…');

    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const scale = isIOS ? 1.0 : 2.0;

    try {
      const canvas = await window.html2canvas(node, {
        backgroundColor: '#0f1115',
        scale,
        useCORS: true,
        imageTimeout: 20000,
        logging: false,
      });

      // まずは dataURL（小さいのでiOSでも比較的安定）
      const dataUrl = canvas.toDataURL(isIOS ? 'image/jpeg' : 'image/png', isIOS ? 0.85 : 1);

      img.src = dataUrl;
      link.href = dataUrl;
      link.target = '_self';

      meta.hidden = false;
      meta.textContent = `canvas: ${canvas.width}x${canvas.height} / scale: ${scale} / ios: ${isIOS}`;
      out.scrollIntoView({ behavior: 'smooth', block: 'start' });

      toast('下に画像を表示しました（長押し→写真に保存）');
    } catch (e) {
      console.error(e);
      showExportError('画像生成に失敗しました。iPhoneの場合はメモリ不足やSVG描画の相性が原因になりやすいです。');
    }
  });

  render();
})();
