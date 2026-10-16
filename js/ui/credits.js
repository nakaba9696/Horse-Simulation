// クレジット（素材の作者と出典）と、3D の馬の切り替え。タイトルの「クレジット」から開く
// 出典の正は assets/CREDITS.md。ここはゲームの中で見せる短い一覧（CC-BY の素材は作者名と作品名を必ず出す）
(function () {
  const HS = globalThis.HS = globalThis.HS || {};
  const C = HS.Credits = {};
  C.LIST = [
    { what: '3D の馬', title: 'Horse Rigged(Game Ready)', by: 'abhayexe', lic: 'CC-BY-4.0', url: 'https://sketchfab.com/3d-models/horse-riggedgame-ready-bc64f4ff7966474ca9bacd42fa73a754', note: 'This work is based on "Horse Rigged(Game Ready)" by abhayexe, licensed under CC-BY-4.0. 形をサラブレッドの比に直し、毛色を塗って使っています。' },
    { what: '騎手の体', title: 'Universal Base Characters', by: 'Quaternius', lic: 'CC0', url: 'https://quaternius.com/' },
    { what: '空・木・画面の背景', title: 'Poly Haven の HDRI・3D モデル', by: 'Greg Zaal・Jarod Guest・Rob Tuytel ほか', lic: 'CC0', url: 'https://polyhaven.com/' },
    { what: '芝・ダート・草地の質感', title: 'ambientCG', by: 'Lennart Demes', lic: 'CC0', url: 'https://ambientcg.com/' },
    { what: '3D の描画', title: 'three.js r128', by: 'three.js authors', lic: 'MIT', url: 'https://threejs.org/' },
    { what: '馬主の顔', title: 'このゲームの持ち主が作った絵', by: '持ち主', lic: '' },
  ];
  const e = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  C.html = function () {
    const HR = HS.HorseRigged, cur = HR ? HR.model() : 'handmade', ok = HR && HR.state === 'ok';
    const rows = C.LIST.map(x => `<div class="row" style="display:block;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.08)">
      <div><b>${e(x.what)}</b>　${e(x.title)}</div>
      <div class="small muted">${e(x.by)}${x.lic ? '・' + e(x.lic) : ''}${x.url ? '　' + e(x.url) : ''}</div>
      ${x.note ? `<div class="small">${e(x.note)}</div>` : ''}</div>`).join('');
    return `<h3>クレジット</h3>
      <div class="panel" style="max-height:52vh;overflow:auto">${rows}</div>
      <h3 class="mt">3D の馬</h3>
      <p class="small muted">レースと馬の絵で使う馬の形。素材の馬は写実的な毛並み、手作りの馬は軽い形です。${ok ? '' : '（素材の馬が読めないときは手作りの馬で描きます）'}</p>
      <div class="btns">
        <button class="btn ${cur === 'rigged' ? 'gold' : ''}" data-act="horse-model" data-v="rigged">素材の馬</button>
        <button class="btn ${cur === 'handmade' ? 'gold' : ''}" data-act="horse-model" data-v="handmade">手作りの馬</button>
      </div>
      <div class="btns mt"><button class="btn" data-act="close">閉じる</button></div>`;
  };
  const App = HS.App;
  if (App && App.act) {
    App.act.credits = () => { App.modal(C.html(), { wide: true }); };
    App.act['horse-model'] = d => {
      if (HS.HorseRigged) HS.HorseRigged.setModel(d.v);
      const m = document.querySelector('#modal-root .modal');
      if (m) m.innerHTML = '<button class="close" data-act="close">×</button>' + C.html();
    };
  }
})();
