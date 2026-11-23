/* 통합 모델 -> 기존 화면 모델. 의료 문구/외형의 예시 데이터는 포함하지 않습니다. */
(() => {
  'use strict';
  const primaryOrder = ['purpose', 'dosage', 'interactions', 'tests'];
  const icons = { purpose: 'medicine', dosage: 'clock', interactions: 'interval', tests: 'test', food: 'info', conditions: 'info', warnings: 'info', symptoms: 'info' };
  const hasText = value => typeof value === 'string' && value.trim().length > 0;

  function adapt(medicine) {
    if (!medicine || !['1.0.0', '1.1.0', '1.2.0'].includes(medicine.schemaVersion) || !/^\d{9}$/.test(medicine.itemSeq)) {
      throw new Error('지원하지 않는 통합 데이터입니다.');
    }
    for (const field of ['officialName', 'displayName', 'dose', 'ingredient']) {
      if (!hasText(medicine[field])) throw new Error('필수 약 정보가 누락되었습니다.');
    }
    if (!Array.isArray(medicine.primary) || !Array.isArray(medicine.secondary)) {
      throw new Error('복약정보 배열이 누락되었습니다.');
    }
    const categorySet = new Set(medicine.primary.map(card => card.category));
    if (!medicine.primary.length || medicine.primary.some(card => !hasText(card.category))) {
      throw new Error('지원하지 않는 핵심 정보 카테고리입니다.');
    }
    if (medicine.schemaVersion === '1.0.0' && (medicine.primary.length !== 4 || !primaryOrder.every(key => categorySet.has(key)))) {
      throw new Error('핵심 복약정보 4개를 확인해 주세요.');
    }
    const orderedPrimary = [...medicine.primary];
    if (medicine.schemaVersion === '1.0.0') orderedPrimary.sort((a, b) => primaryOrder.indexOf(a.category) - primaryOrder.indexOf(b.category));
    const core = orderedPrimary.map(card => {
      if (!hasText(card.title) || !hasText(card.easyText)) throw new Error('핵심 카드 내용이 누락되었습니다.');
      return { title: card.title, text: card.easyText, detailText: hasText(card.detailText) ? card.detailText : null, icon: icons[card.category] || 'info',
        // 실제 문장에 있는 행동/수치만 강조하며, 내용을 생성하거나 바꾸지 않습니다.
        emphasis: card.easyText.match(/최소\s+\d+(?:\.\d+)?\s*(?:시간\s*간격|일(?:\s*동안)?)|의료진에게 알려주세요/g) || [] };
    });
    const groups = new Map();
    medicine.secondary.forEach(card => {
      if (!hasText(card.category) || !hasText(card.title) || !hasText(card.easyText)) throw new Error('추가 카드 내용이 누락되었습니다.');
      if (!groups.has(card.category)) groups.set(card.category, {
        title: card.category === 'interactions' ? '다른 약·영양제 추가정보' : card.title,
        warning: card.category === 'warnings', items: []
      });
      groups.get(card.category).items.push({ text: card.easyText, detailText: hasText(card.detailText) ? card.detailText : null });
    });
    const appearance = medicine.appearance || {};
    return {
      id: medicine.itemSeq, name: medicine.displayName, officialName: medicine.officialName,
      strength: medicine.dose, ingredient: medicine.ingredient,
      manufacturer: medicine.companyName, imageUrl: medicine.imageUrl,
      appearance: { colors: Array.isArray(appearance.colors) ? appearance.colors.filter(hasText) : [],
        shape: appearance.shape, form: appearance.form },
      core, additional: [...groups.values()],
      keywords: [medicine.officialName, medicine.dose, ...(Array.isArray(medicine.searchAliases) ? medicine.searchAliases.filter(hasText) : [])],
      isSample: medicine.metadata?.isFinal === false
    };
  }

  function load() {
    try {
      const source = window.INTEGRATED_MEDICINES;
      if (!Array.isArray(source) || !source.length) throw new Error('통합 데이터를 불러오지 못했습니다.');
      const medicines = source.map(adapt);
      if (new Set(medicines.map(medicine => medicine.id)).size !== medicines.length) throw new Error('약 식별번호가 중복되었습니다.');
      return { medicines, error: null };
    } catch (error) {
      // 깨진 데이터를 정상적인 빈 검색 결과로 표시하지 않습니다.
      return { medicines: [], error: error.message };
    }
  }
  window.MedicineData = Object.freeze({ load, adapt });
})();
