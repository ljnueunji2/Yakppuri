(() => {
  'use strict';

  const dataState = window.MedicineData?.load() || { medicines: [], error: '데이터 로더를 불러오지 못했습니다.' };
  const medicines = dataState.medicines;
  const quickSearch = medicines[0]?.name || '';
  const main = document.getElementById('main');
  const storageKey = 'eyak-recent-v1';
  const textSizeKey = 'eyak-large-text';
  let recentIds = readStorage(storageKey, []);
  if (!Array.isArray(recentIds)) recentIds = [];
  // 과거의 mock ID는 실제 품목과 연결하지 않고 제거합니다. 이후에는 ITEM_SEQ만 저장합니다.
  recentIds = recentIds.filter(id => medicines.some(medicine => medicine.id === id));
  if (!dataState.error) writeStorage(storageKey, recentIds);
  let lastSearch = quickSearch;

  // localStorage는 file:// 또는 브라우저 정책에 따라 차단될 수 있습니다.
  // 저장이 불가능해도 현재 탭에서 모든 화면과 최근 본 약이 동작합니다.
  function readStorage(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  }
  function writeStorage(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch { /* 현재 탭의 메모리 상태로 계속 사용 */ }
  }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function hasText(value) { return typeof value === 'string' && value.trim().length > 0; }
  function safeUrl(value, allowLocal = false) {
    if (!hasText(value)) return null;
    try {
      const parsed = new URL(value, location.href);
      return ['https:', 'http:', ...(allowLocal ? ['file:'] : [])].includes(parsed.protocol) ? parsed.href : null;
    } catch { return null; }
  }
  function icon(name) {
    const paths = {
      search: '<circle cx="10.5" cy="10.5" r="6.8"/><path d="m16 16 5 5"/>',
      arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
      chevron: '<path d="m9 5 7 7-7 7"/>',
      history: '<path d="M3 11a9 9 0 1 1 2 7M3 5v6h6m3-4v6l4 2"/>',
      medicine: '<path d="m8 4-5 5a6 6 0 0 0 8 9l8-8a6 6 0 0 0-8-8L8 4Zm-1 1 9 9"/>',
      clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
      interval: '<path d="M4 8h16m-4-4 4 4-4 4M20 16H4m4-4-4 4 4 4"/>',
      test: '<path d="M8 3h8M10 3v6L4 19a1.3 1.3 0 0 0 1 2h14a1.3 1.3 0 0 0 1-2L14 9V3M8 14h8"/>',
      info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>'
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.info}</svg>`;
  }
  function routeSearch(query) { return '#/search?q=' + encodeURIComponent(query); }
  function routeDetail(id) { return '#/medicine/' + encodeURIComponent(id); }

  function searchForm(query = '', home = false) {
    return `<form class="${home ? 'home-search' : 'page-search'}" role="search" data-search-form>
      <label class="${home ? 'search-label' : 'visually-hidden'}" for="medicine-search">${home ? '복용 중인 약을 검색해 보세요!' : '약 이름 검색'}</label>
      <div class="search-box">${icon('search')}<input id="medicine-search" name="q" type="search" placeholder="약 이름을 입력해 주세요" value="${escapeHtml(query)}" required maxlength="100" autocomplete="off"><button class="button" type="submit">검색</button></div>
    </form>`;
  }
  function visual(medicine) {
    const src = safeUrl(medicine.imageUrl, true);
    if (!src) return '';
    return `<div class="medicine-visual"><img src="${escapeHtml(src)}" alt="${escapeHtml(medicine.name)} ${escapeHtml(medicine.strength)} 제품 이미지" data-medicine-image referrerpolicy="no-referrer"></div>`;
  }
  function placeholder() {
    return '<span class="pill-illustration" aria-hidden="true"></span><p>실제 약 사진이<br>아닙니다</p>';
  }
  function metadata(medicine) {
    const appearance = medicine.appearance || {};
    const tags = [...(appearance.colors || []), appearance.shape, appearance.form].filter(hasText);
    return `<p class="ingredient"><span class="field-label">성분명</span>${escapeHtml(medicine.ingredient)}</p>
      ${hasText(medicine.manufacturer) ? `<p class="manufacturer"><span class="field-label">업체명</span>${escapeHtml(medicine.manufacturer)}</p>` : ''}
      ${tags.length ? `<div class="tags" aria-label="외형 정보">${tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>` : ''}`;
  }
  function breadcrumb(parts) {
    return `<nav class="breadcrumb" aria-label="현재 위치"><a href="#/">홈</a>${parts.map(part => `${icon('chevron')}${part.href ? `<a href="${escapeHtml(part.href)}">${escapeHtml(part.text)}</a>` : `<span aria-current="page">${escapeHtml(part.text)}</span>`}`).join('')}</nav>`;
  }
  function renderHome() {
    document.title = '이약 뭐약 · 쉬운 복약정보';
    const recent = recentIds.map(id => medicines.find(m => m.id === id)).filter(Boolean);
    main.innerHTML = `<div class="container home-page"><section class="home-hero" aria-labelledby="home-title"><div class="home-hero-content"><h1 id="home-title">복용 중인 약,<br><span>쉽게 확인해 보세요</span></h1><p class="home-hero-description">어려운 의약품 정보를 쉬운 설명으로 알려드려요.</p>${searchForm('', true)}</div>
      <div class="home-art" aria-hidden="true">
        <img class="home-hero-illustration" src="assets/home_hero_illustration.png" alt="" width="1200" height="900" decoding="async">
      </div></section>
      <section class="home-bottom" aria-labelledby="recent-title"><div class="section-heading"><h2 id="recent-title">최근 본 약</h2><p>다시 찾기 쉽게 모아두었어요</p></div>
      ${recent.length ? `<div class="recent-list">${recent.map(m => `<article class="recent-card"><div class="soft-icon">${icon('history')}</div><div class="recent-info"><h3>${escapeHtml(m.name)}</h3><div class="recent-meta"><p><span class="field-label">함량</span>${escapeHtml(m.strength)}</p><p><span class="field-label">성분명</span>${escapeHtml(m.ingredient)}</p></div></div><a class="button secondary" href="${routeDetail(m.id)}" aria-label="${escapeHtml(m.name)} ${escapeHtml(m.strength)} 복약정보 다시 보기">다시 보기 ${icon('arrow')}</a></article>`).join('')}</div>` : `<div class="recent-card"><div class="recent-empty"><div class="soft-icon">${icon('history')}</div><div><h3>아직 최근 본 약이 없어요</h3><p>복약정보를 읽은 약은 여기에 표시돼요.</p></div></div><a class="button secondary" href="${routeSearch(quickSearch)}">${escapeHtml(quickSearch)} 찾아보기 ${icon('arrow')}</a></div>`}
      <div class="how-it-works" aria-label="사용 순서"><span><i class="step-number">1</i>약 이름 검색</span><b class="step-arrow" aria-hidden="true">→</b><span><i class="step-number">2</i>내 약인지 확인</span><b class="step-arrow" aria-hidden="true">→</b><span><i class="step-number">3</i>쉬운 복약정보 읽기</span></div></section></div>`;
  }
  function normalize(value) { return value.toLocaleLowerCase().replace(/\s+/g, ''); }
  function renderResults(query) {
    document.title = `${query || '약'} 검색 결과 · 이약 뭐약`;
    if (query) lastSearch = query;
    const normalized = normalize(query);
    const results = normalized ? medicines.filter(m => [m.name, m.ingredient, ...(m.keywords || [])].some(value => normalize(value).includes(normalized))) : [];
    main.innerHTML = `<div class="container">${searchForm(query)}<section aria-labelledby="results-title"><div class="results-intro"><h1 id="results-title"><span>‘${escapeHtml(query || '약 이름')}’</span> 검색 결과</h1><p>약 이름과 함량을 확인하고, 내가 먹는 약을 선택해 주세요.</p></div><div class="result-count">전체 <strong>${results.length}건</strong></div>
      ${results.length ? `<div class="results-list">${results.map(m => `<article class="medicine-card">${visual(m)}<div class="medicine-info"><div class="medicine-title"><h2>${escapeHtml(m.name)}</h2><span class="strength">${escapeHtml(m.strength)}</span></div>${metadata(m)}</div><a class="button result-action" href="${routeDetail(m.id)}" aria-label="${escapeHtml(m.name)} ${escapeHtml(m.strength)} 복약정보 보기">복약정보 보기 ${icon('arrow')}</a></article>`).join('')}</div><p class="notice">${icon('info')}<span>이름이 같아도 함량이 다를 수 있어요. 약 봉투나 포장에 적힌 이름과 함량을 함께 확인해 주세요.</span></p>` : `<div class="empty-state search-empty-state"><div class="soft-icon">${icon('search')}</div><h2>${query ? '검색한 약을 찾지 못했어요' : '약 이름을 입력해 주세요'}</h2><p>약 봉투나 포장에 적힌 이름을 다시 확인해 주세요.<br>다른 이름으로 다시 검색해 주세요.</p></div>`}</section></div>`;
  }
  function emphasize(text, emphasis) {
    // 문자열 및 여러 강조 문구를 지원합니다. 원문은 바꾸지 않습니다.
    const phrases = (Array.isArray(emphasis) ? emphasis : [emphasis]).filter(hasText).sort((a, b) => b.length - a.length);
    let result = '';
    for (let position = 0; position < text.length;) {
      const phrase = phrases.find(value => text.startsWith(value, position));
      if (phrase) {
        result += `<strong>${escapeHtml(phrase)}</strong>`;
        position += phrase.length;
      } else result += escapeHtml(text[position++]);
    }
    return result;
  }
  function detailDisclosure(value) {
    if (!hasText(value)) return '';
    return `<details class="text-detail" data-detail-toggle><summary>자세히 보기</summary><div class="detail-text-content">${escapeHtml(value)}</div></details>`;
  }
  function renderDetail(id) {
    const medicine = medicines.find(m => m.id === id);
    if (!medicine) {
      document.title = '약을 찾을 수 없어요 · 이약 뭐약';
      main.innerHTML = `<div class="container">${breadcrumb([{ text: '약 정보' }])}<div class="empty-state"><h1>약 정보를 찾을 수 없어요</h1><p>홈에서 약 이름을 다시 검색해 주세요.</p><a class="button" href="#/">홈으로 이동</a></div></div>`;
      return;
    }
    recentIds = [id, ...recentIds.filter(value => value !== id)].slice(0, 5);
    writeStorage(storageKey, recentIds);
    document.title = `${medicine.name} ${medicine.strength} 복약정보 · 이약 뭐약`;
    // id는 통합 데이터의 itemSeq입니다. 공식 상세 링크에 쓸 코드만 검증합니다.
    const itemSeq = typeof medicine.id === 'string' ? medicine.id.trim() : '';
    const sourceUrl = /^\d{9}$/.test(itemSeq)
      ? `https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetailCache?cacheSeq=${encodeURIComponent(itemSeq)}`
      : null;
    main.innerHTML = `<div class="container detail-page">${breadcrumb([{ text: '검색 결과', href: routeSearch(lastSearch) }, { text: '쉬운 복약정보' }])}
      <section class="medicine-card detail-product" aria-labelledby="medicine-title">${visual(medicine)}<div class="medicine-info"><div class="medicine-title"><h1 id="medicine-title">${escapeHtml(medicine.name)}</h1><span class="strength">${escapeHtml(medicine.strength)}</span></div>${metadata(medicine)}</div></section>
      <section class="core-section" aria-labelledby="core-title"><div class="section-heading"><h2 id="core-title">핵심 복약정보</h2><p>이 ${medicine.core.length}가지를 먼저 확인해 주세요</p></div><div class="core-grid">${medicine.core.map(card => `<article class="core-card"><h3><span class="card-icon">${icon(card.icon)}</span>${escapeHtml(card.title)}</h3><p>${emphasize(card.text, card.emphasis)}</p>${detailDisclosure(card.detailText)}</article>`).join('')}</div></section>
      <section class="additional-section" aria-labelledby="additional-title"><div class="section-heading"><h2 id="additional-title">추가로 알아두세요</h2><p>궁금한 항목을 펼쳐보세요</p></div><div class="accordion">${medicine.additional.map(section => `<details${section.warning === true ? ' class="warning-details"' : ''}><summary>${escapeHtml(section.title)}</summary><div class="accordion-content"><ul>${section.items.map(item => `<li><p>${escapeHtml(item.text)}</p>${detailDisclosure(item.detailText)}</li>`).join('')}</ul></div></details>`).join('')}<details class="source-details"><summary>의약품 허가정보 원문 보기</summary><div class="accordion-content">${sourceUrl ? `<p>식품의약품안전처 의약품안전나라에서 공식 허가정보를 확인할 수 있어요.</p><a class="source-link" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">의약품안전나라 바로가기 ↗</a>` : '<p>품목기준코드를 확인할 수 없어 공식 상세정보 링크를 제공하지 못했어요.</p><span class="source-pending">공식 링크 확인 불가</span>'}</div></details></div></section><aside class="medical-note" aria-label="의료정보 이용 안내">${icon('info')}<div><h2>복약정보를 읽기 전에 알아두세요</h2><p>AI 요약은 약을 이해하기 위한 참고정보이며, 의료진의 진단이나 처방을 대신하지 않아요. 임의로 복용량을 바꾸지 말고, 실제 복용은 의사·약사의 안내를 따라주세요.</p></div></aside></div>`;
  }
  function render() {
    if (dataState.error) {
      document.title = '데이터를 불러오지 못했어요 · 이약 뭐약';
      main.innerHTML = `<div class="container"><div class="empty-state" role="alert"><h1>약 정보를 불러오지 못했어요</h1><p>${escapeHtml(dataState.error)}<br>web 폴더의 update-data.cmd를 실행한 뒤 새로고침해 주세요.</p><button class="button" type="button" data-reload>다시 불러오기</button></div></div>`;
      return;
    }
    const hash = location.hash.slice(1) || '/';
    const [pathname, query = ''] = hash.split('?');
    if (pathname === '/search') renderResults((new URLSearchParams(query).get('q') || '').trim().slice(0, 100));
    else if (pathname.startsWith('/medicine/')) {
      let id;
      try { id = decodeURIComponent(pathname.slice('/medicine/'.length)); }
      catch { id = ''; }
      renderDetail(id);
    } else renderHome();
    // URL이 없는 경우는 숨기고, 있는 URL이 실패한 경우에만 placeholder를 표시합니다.
    main.querySelectorAll('[data-medicine-image]').forEach(img => {
      const fallback = () => {
        if (!img.parentElement) return;
        img.parentElement.innerHTML = placeholder();
      };
      img.addEventListener('error', fallback, { once: true });
      if (img.complete && !img.naturalWidth) fallback();
    });
  }
  function navigate(hash) {
    if (location.hash === hash) { render(); main.focus({ preventScroll: true }); }
    else location.hash = hash;
  }
  main.addEventListener('submit', event => {
    if (!event.target.matches('[data-search-form]')) return;
    event.preventDefault();
    const input = event.target.elements.q;
    const query = input.value.trim();
    if (!query) { input.value = ''; input.reportValidity(); return; }
    navigate(routeSearch(query));
  });
  main.addEventListener('click', event => {
    if (event.target.closest('[data-reload]')) { location.reload(); return; }
    if (event.target.closest('[data-example]')) navigate(routeSearch(quickSearch));
  });
  const textSizeButton = document.getElementById('text-size');
  function applyTextSize(large) {
    document.documentElement.classList.toggle('large-text', large);
    textSizeButton.setAttribute('aria-pressed', String(large));
    textSizeButton.innerHTML = large ? '가− <span>기본 글씨</span>' : '가+ <span>글씨 크게</span>';
  }
  applyTextSize(readStorage(textSizeKey, false) === true);
  textSizeButton.addEventListener('click', () => {
    const large = !document.documentElement.classList.contains('large-text');
    applyTextSize(large);
    writeStorage(textSizeKey, large);
  });
  window.addEventListener('hashchange', () => {
    render();
    window.scrollTo({ top: 0, behavior: 'instant' });
    main.focus({ preventScroll: true });
  });
  render();
})();
