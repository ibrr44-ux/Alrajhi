console.log('✅ app.js loaded');
let currentArea = 'east_center';
let currentFilter = 'all';
let onlyElite = false;
let currentQuery = '';
let savedScrollPosition = 0;

let loadedAreas = {
    east_center: true
};
let isDataLoading = false;

function loadAreaData(areaId) {
    if (loadedAreas[areaId]) {
        return;
    }
    
    isDataLoading = true;
    const script = document.createElement('script');
    script.src = `js/data-${areaId.replace('_', '-')}.min.js`;
    script.async = true;
    const p = new Promise((resolve, reject) => {
        script.onload = () => {
            FACILITIES_MASTER.forEach((facility, index) => {
                facility.id = index + 1;
            });
            loadedAreas[areaId] = true;
            isDataLoading = false;
            resolve();
        };
        script.onerror = (err) => {
            isDataLoading = false;
            console.error("خطأ في تحميل بيانات المرافق الصحية:", err);
            const container = document.getElementById('resultsList');
            if (container) {
                container.innerHTML = `
                    <div class="text-center py-16 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm rounded-3xl shadow-md border border-red-100 dark:border-red-950/30">
                        <span class="text-5xl">⚠️</span>
                        <p class="mt-4 font-black text-lg text-red-600 dark:text-red-400">فشل في تحميل بيانات المرافق الصحية</p>
                        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">يرجى التحقق من الملف وإعادة المحاولة.</p>
                        <button onclick="enterGovernorateArea('${areaId}')" class="mt-5 bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg active:scale-95 transition-transform">💡 إعادة المحاولة</button>
                    </div>
                `;
            }
            reject(err);
        };
    });
    document.body.appendChild(script);
    return p;
}

function showSkeletonLoader() {
    const container = document.getElementById('resultsList');
    if (!container) return;
    
    container.innerHTML = Array(3).fill(0).map(() => `
        <div class="bg-white dark:bg-slate-900/90 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-lg animate-pulse space-y-4">
            <div class="flex justify-between items-start">
                <div class="flex-1 space-y-2">
                    <div class="h-6 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4"></div>
                    <div class="h-4 bg-slate-100 dark:bg-slate-800/60 rounded-md w-1/2"></div>
                </div>
                <div class="h-8 bg-slate-200 dark:bg-slate-800 rounded-full w-16"></div>
            </div>
            <div class="grid grid-cols-2 gap-3 mt-4">
                <div class="space-y-1">
                    <div class="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-1/3"></div>
                    <div class="h-2 bg-slate-100 dark:bg-slate-800 rounded-md w-full"></div>
                </div>
                <div class="space-y-1">
                    <div class="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-1/3"></div>
                    <div class="h-2 bg-slate-100 dark:bg-slate-800 rounded-md w-full"></div>
                </div>
            </div>
            <div class="h-10 bg-slate-100 dark:bg-slate-850 rounded-xl mt-3"></div>
        </div>
    `).join('');
}



// renderWelcomeScreen غير مستخدم حالياً - تم استبدال البطاقات في HTML الثابت
// function renderWelcomeScreen() {
//     const grid = document.getElementById('areasGrid');
//     if (!grid) return;
//     ... etc
// }


function renderResults(data){
    const container = document.getElementById('resultsList');
    const countSpan = document.getElementById('resultsCount');
    if (!container || !countSpan) return;
    
    countSpan.innerHTML = `<span>🔍 ${data.length} منشأة صحية متطابقة</span><span class="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 px-2 py-0.5 rounded-full">${data.filter(f=>isFacilityElite(f)).length} نخبة صحية</span>`;
    if(data.length===0){
        container.innerHTML = `<div class="text-center py-16 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm rounded-3xl shadow-md dark:shadow-slate-950/20"><span class="text-5xl">🔎</span><p class="mt-2 font-bold text-base dark:text-slate-200">لا توجد مرافق صحية تطابق بحثك</p><p class="text-sm text-gray-500 dark:text-slate-400">جرب كلمات مثل "أسنان، جلدية، عيون"</p></div>`;
        return;
    }
    container.innerHTML = data.map(f => {
        const trust = f.reputation_vector?.trustworthiness || 0;
        const diag = f.reputation_vector?.diagnosis_accuracy || 0;
        const isElite = isFacilityElite(f);
        const badge = getFacilityBadge(f);
        const priceBad = f.reputation_vector?.pricing_fairness !== undefined && f.reputation_vector.pricing_fairness < 65;
        const areaObj = GOVERNORATE_AREAS.find(a => a.id === f.area);
        const defaultLocation = areaObj ? areaObj.name : "الرياض";
        return `
        <div class="card-workshop bg-white dark:bg-slate-900/90 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-lg dark:shadow-slate-950/20 cursor-pointer transition-all relative" data-fid="${f.id}">
            <button data-compare="${f.id}" onclick="event.stopPropagation(); toggleCompare(${f.id})" class="absolute top-3 left-3 w-7 h-7 rounded-full border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 flex items-center justify-center text-sm font-black transition-all hover:border-indigo-500 z-10 shadow-sm" title="${compareSelection.includes(f.id) ? 'إلغاء اختيار المقارنة' : 'اختيار للمقارنة'}">${compareSelection.includes(f.id) ? '✓' : '+'}</button>
            <div class="absolute -top-3 right-4 ${badge.colorClass} text-xs font-black px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                ${badge.text}
            </div>
            <div class="flex justify-between items-start mt-2">
                <div class="flex-1"><h2 class="text-xl font-black text-slate-800 dark:text-slate-100">${f.facility_name}</h2><p class="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1"><span>📍</span> ${f.text_guidance || defaultLocation}</p></div>
                <div class="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-850 px-3 py-1 rounded-full shadow-sm dark:text-slate-200"><span class="text-base font-black">★ ${f.rating??'?'}</span><span class="text-xs"> (${f.review_count??0})</span></div>
            </div>
            <div class="grid grid-cols-2 gap-3 mt-4">
                <div><div class="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300"><span>🤝 الشفافية ووضوح التشخيص</span><span>${trust}%</span></div><div class="trust-meter mt-1"><div class="trust-fill bg-slate-800 dark:bg-slate-300" style="width:${trust}%"></div></div></div>
                <div><div class="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300"><span>🎯 دقة التشخيص الطبي</span><span>${diag}%</span></div><div class="trust-meter mt-1"><div class="trust-fill bg-blue-600 dark:bg-blue-500" style="width:${diag}%"></div></div></div>
            </div>
            <p class="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-xl mt-3 border-r-4 border-slate-300 dark:border-slate-800">✨ ${f.inferred_strength || 'خدمات صحية احترافية'}</p>
            ${priceBad ? '<div class="mt-2 text-xs bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400 p-2 rounded-lg font-medium">⚠️ تنبيه: تكلفة الخدمة مرتفعة نسبياً</div>' : ''}
            <div class="mt-3 flex gap-2 justify-between items-center">
                <div class="text-xs text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1">⚖️ <span>مقارنة</span></div>
                <div class="text-left text-sm font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1"><span>تفاصيل وتواصل</span> ←</div>
            </div>
        </div>`;
    }).join('');
    
    document.querySelectorAll('[data-fid]').forEach(card => {
        const id = parseInt(card.getAttribute('data-fid'), 10);
        card.onclick = () => showDetails(FACILITIES_MASTER.find(f => f.id === id));
    });
}

function showDetails(f){
    if(!f) return;
    savedScrollPosition = window.scrollY;
    
    const hasPrice = f.reputation_vector?.pricing_fairness !== undefined && f.reputation_vector.pricing_fairness < 65;
    const evidenceHtml = f.evidence?.map(ev => `<div class="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl text-sm italic border-r-2 border-blue-300 dark:border-blue-500 dark:text-slate-300">“ ${ev.text} ”</div>`).join('') || '<div class="text-sm text-gray-400 dark:text-slate-500">لا توجد أدلة نصية مسجلة</div>';
    
    const vector = f.reputation_vector || {};
    const vectorLabels = {
        technical_skill: '🛠️ كفاءة الكادر الطبي',
        diagnosis_accuracy: '🎯 دقة التشخيص الطبي',
        trustworthiness: '🤝 الشفافية ووضوح التشخيص',
        pricing_fairness: '💵 تكلفة الخدمة',
        customer_behavior: '⭐ التعامل والرعاية'
    };
    const vectorHtml = Object.entries(vectorLabels).map(([key, label]) => `
        <div class="bg-white dark:bg-slate-950/30 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div class="text-xs text-slate-500 dark:text-slate-400 font-bold">${label}</div>
            <div class="font-black text-base text-slate-800 dark:text-slate-200 mt-0.5">${vector[key] !== undefined ? vector[key] + '%' : 'غير متوفر'}</div>
        </div>
    `).join('');

    const areaObj = GOVERNORATE_AREAS.find(a => a.id === f.area);
    const defaultLocation = areaObj ? areaObj.name : "الرياض";
    const badge = getFacilityBadge(f);
    
    document.getElementById('detailsCard').innerHTML = `
        <div class="relative flex flex-col gap-2">
            <div class="flex flex-wrap gap-2 items-center">
                <span class="text-xs font-black px-2.5 py-1 rounded-md ${f.facility_type === 'hospital' ? 'bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-900/50' : f.facility_type === 'clinic' ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}">${f.facility_type === 'hospital' ? '🏥 مستشفى' : f.facility_type === 'clinic' ? '🏪 مجمع عيادات' : '📌 مركز صحي'}</span>
                <span class="text-xs font-black px-2.5 py-1 rounded-md border ${badge.colorClass}">${badge.text}</span>
            </div>
            <h2 class="text-2xl font-black mt-1 text-slate-900 dark:text-white">${f.facility_name}</h2>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1"><span>📍</span> ${f.text_guidance || defaultLocation}</p>
        </div>
        <div class="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3 mt-2">
            <h4 class="text-xs font-bold text-slate-400 dark:text-slate-500">📊 متجهات السمعة الموثقة (من 100):</h4>
            <div class="grid grid-cols-2 gap-2">${vectorHtml}</div>
        </div>
        <div class="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2">
            <h4 class="font-bold text-sm text-slate-400 dark:text-slate-500">📋 آراء المراجعين الموثقة:</h4>
            ${evidenceHtml}
        </div>
        ${hasPrice ? '<div class="bg-amber-50 border border-amber-100 dark:border-amber-900/50 rounded-xl p-3 text-sm text-amber-900 dark:text-amber-300 font-medium">💡 <b>ملاحظة:</b> تشير التقييمات إلى تفاوت في تكلفة الخدمات، ننصح بالاستفسار عن الأسعار قبل البدء.</div>' : ''}
        <div class="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 mt-2">
            ${f.phone ? `<a href="tel:${f.phone}" class="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-center py-3.5 rounded-xl font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-1 text-base">📞 اتصال بالمنشأة</a>` : ''}
            <a href="https://maps.google.com/?q=${encodeURIComponent(f.facility_name + ' الرياض')}" target="_blank" class="flex-1 bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 text-white text-center py-3.5 rounded-xl font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-1 text-base">🗺️ خرائط جوجل</a>
            <button onclick="shareFacility(${f.id})" class="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white px-4 py-3.5 rounded-xl font-bold shadow-md transition flex items-center justify-center gap-1 text-base" title="مشاركة">📤 مشاركة</button>
        </div>
    `;
    document.getElementById('searchFilterContainer')?.classList.add('hidden');
    document.getElementById('homeView').classList.add('hidden');
    document.getElementById('detailsView').classList.remove('hidden');
    document.getElementById('compareFloatingBtn')?.classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== COMPARE (مقارنة بين مركزين) =====
let compareSelection = [];

window.toggleCompare = function(id) {
  const idx = compareSelection.indexOf(id);
  if (idx !== -1) {
    compareSelection.splice(idx, 1);
  } else {
    if (compareSelection.length >= 4) {
      compareSelection.shift();
    }
    compareSelection.push(id);
  }
  updateCompareUI();
}

function updateCompareUI() {
  document.querySelectorAll('[data-compare]').forEach(el => {
    const fid = parseInt(el.getAttribute('data-compare'), 10);
    const selected = compareSelection.includes(fid);
    el.innerHTML = selected ? '✓' : '+';
    el.classList.toggle('bg-indigo-600', selected);
    el.classList.toggle('text-white', selected);
    el.classList.toggle('border-indigo-600', selected);
    el.classList.toggle('bg-white', !selected);
    el.classList.toggle('text-slate-500', !selected);
    el.classList.toggle('border-slate-300', !selected);
  });
  const btn = document.getElementById('compareFloatingBtn');
  if (btn) {
    const isHidden = compareSelection.length < 2;
    btn.classList.toggle('hidden', isHidden);
    if (!isHidden) {
      const buttonText = btn.querySelector('span:last-child');
      if (buttonText) {
        if (compareSelection.length === 2) {
          buttonText.innerText = "قارن بين المنشأتين";
        } else {
          buttonText.innerText = `قارن بين المنشآت (${compareSelection.length})`;
        }
      }
    }
  }
}

window.showCompareView = function() {
  if (compareSelection.length < 2 || compareSelection.length > 4) return;
  const selectedFacilities = compareSelection.map(id => FACILITIES_MASTER.find(f => f.id === id)).filter(Boolean);
  if (selectedFacilities.length < 2) return;

  savedScrollPosition = window.scrollY;
  document.getElementById('searchFilterContainer')?.classList.add('hidden');
  document.getElementById('homeView').classList.add('hidden');
  document.getElementById('detailsView').classList.add('hidden');
  document.getElementById('compareView').classList.remove('hidden');
  document.getElementById('compareFloatingBtn')?.classList.add('hidden');

  renderCompareView(selectedFacilities);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

function badgeLabel(f) {
  const b = getFacilityBadge(f);
  return b.text;
}

function vectorCompareHTML(f, label) {
  const v = f.reputation_vector || {};
  const labels = {
    technical_skill: '🛠️ كفاءة الكادر',
    diagnosis_accuracy: '🎯 دقة التشخيص',
    trustworthiness: '🤝 الشفافية',
    pricing_fairness: '💵 التكلفة',
    customer_behavior: '⭐ التعامل'
  };
  return Object.entries(labels).map(([key, text]) => {
    const val = v[key] !== undefined ? v[key] : null;
    if (val === null || val === 0) return '';
    const color = val >= 80 ? 'bg-emerald-500' : val >= 60 ? 'bg-amber-500' : 'bg-red-500';
    return `
      <div class="mb-2">
        <div class="flex justify-between text-xs font-bold mb-0.5"><span>${text}</span><span>${val}%</span></div>
        <div class="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div class="h-full ${color} rounded-full" style="width:${val}%"></div>
        </div>
      </div>`;
  }).filter(Boolean).join('');
}

function journeyCompareHTML(f) {
  const j = f.patient_journey || {};
  const labels = {
    booking_experience: '📅 الحجز',
    waiting_time: '⏳ الانتظار',
    treatment_experience: '💊 العلاج',
    follow_up_quality: '📞 المتابعة'
  };
  return Object.entries(labels).map(([key, text]) => {
    const val = j[key];
    if (val === null || val === undefined || val === 0) return '';
    const color = val >= 80 ? 'emerald' : val >= 55 ? 'amber' : 'red';
    return `<span class="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-${color}-50 dark:bg-${color}-950/20 text-${color}-700 dark:text-${color}-300 border border-${color}-200 dark:border-${color}-900/50">${text}: ${val}%</span>`;
  }).join(' ');
}

function evidenceCompareHTML(f) {
  if (!f.evidence || f.evidence.length === 0) return '<div class="text-xs text-slate-400">لا توجد أدلة</div>';
  return f.evidence.slice(0, 3).map(e =>
    `<div class="text-xs italic bg-slate-50 dark:bg-slate-950/40 p-2 rounded-lg border-r-2 border-blue-300 dark:border-blue-500 mb-1">“ ${e.text} ”</div>`
  ).join('');
}

function renderCompareView(facilities) {
  const container = document.getElementById('compareCard');
  if (!container) return;

  container.className = "grid grid-cols-1 gap-4";
  if (facilities.length === 2) {
    container.classList.add("md:grid-cols-2");
  } else if (facilities.length === 3) {
    container.classList.add("md:grid-cols-3");
  } else if (facilities.length === 4) {
    container.classList.add("md:grid-cols-4");
  }

  const cardsHtml = facilities.map((f, index) => {
    const area = f.text_guidance || 'الرياض';
    const badge = getFacilityBadge(f);
    const identifier = ['أ', 'ب', 'ج', 'د'][index] || String.fromCharCode(65 + index);
    const identifierColor = index === 0 ? 'text-indigo-500' : index === 1 ? 'text-purple-500' : index === 2 ? 'text-teal-500' : 'text-amber-500';

    return `
    <div class="bg-white/90 dark:bg-slate-900/95 backdrop-blur-sm rounded-3xl p-4 border border-white/50 dark:border-slate-800 shadow-2xl">
      <div class="flex items-start gap-2 mb-3">
        <span class="text-2xl shrink-0">🏥<span class="text-xs font-black ${identifierColor}">(${identifier})</span></span>
        <div class="min-w-0">
          <h3 class="text-base font-black text-slate-800 dark:text-slate-100 leading-tight">${f.facility_name}</h3>
          <p class="text-xs text-slate-500 mt-0.5">📍 ${area}</p>
          <span class="text-[10px] font-black px-2 py-0.5 rounded-full ${badge.colorClass} inline-block mt-1">${badge.text}</span>
        </div>
      </div>
      <div class="text-xs space-y-1 mb-2">
        <p><span class="font-bold text-slate-500">النوع:</span> ${f.facility_type === 'center' ? '📌 مركز صحي' : f.facility_type === 'clinic' ? '🏪 مجمع عيادات' : '🏥 مستشفى'}</p>
        <p><span class="font-bold text-slate-500">التخصصات:</span> ${(f.normalized_specialization||['غير حدد']).map(s => ({dentistry:'🦷 أسنان',dermatology:'🧴 جلدية',physiotherapy:'💪 علاج طبيعي',general:'🩺 عامة',internal_medicine:'🔬 باطنة',obgyn:'👶 نساء',pediatrics:'🧒 أطفال',ophthalmology:'👁️ عيون',ent:'👂 أنف وأذن',orthopedics:'🦴 عظام',emergency:'🚑 طوارئ',lab:'🔬 تحاليل',radiology:'📡 أشعة'})[s]||s).join('، ')}</p>
        ${f.phone ? `<p><span class="font-bold text-slate-500">📞 </span>${f.phone}</p>` : ''}
      </div>
      ${f.known_staff?.length ? `<div class="text-xs font-bold text-slate-500 mb-1">👨‍⚕️ الكادر: ${f.known_staff.join('، ')}</div>` : ''}
      <div class="border-t border-slate-100 dark:border-slate-800 pt-3 mt-2">
        <h4 class="text-xs font-bold text-slate-400 mb-2">📊 متجهات السمعة</h4>
        ${vectorCompareHTML(f, identifier)}
      </div>
      ${f.patient_journey ? `<div class="border-t border-slate-100 dark:border-slate-800 pt-2 mt-2"><h4 class="text-xs font-bold text-slate-400 mb-1">🚶 رحلة المريض</h4><div class="flex flex-wrap gap-1">${journeyCompareHTML(f)}</div></div>` : ''}
      <div class="border-t border-slate-100 dark:border-slate-800 pt-2 mt-2">
        <h4 class="text-xs font-bold text-slate-400 mb-1">💬 الأدلة</h4>
        ${evidenceCompareHTML(f)}
      </div>
      <div class="text-xs mt-2 p-2 bg-slate-50 dark:bg-slate-950/40 rounded-xl border-r-4 border-indigo-300 dark:border-indigo-700">
        <span class="font-bold text-slate-500">الخلاصة:</span>
        <span class="text-slate-700 dark:text-slate-300">${f.final_assessment || 'غير متوفرة'}</span>
      </div>
    </div>`;
  }).join('');

  const tableHeaders = facilities.map((f, index) => {
    const identifier = ['أ', 'ب', 'ج', 'د'][index] || String.fromCharCode(65 + index);
    const identifierColor = index === 0 ? 'text-indigo-600 dark:text-indigo-400' : index === 1 ? 'text-purple-600 dark:text-purple-400' : index === 2 ? 'text-teal-600 dark:text-teal-400' : 'text-amber-600 dark:text-amber-400';
    const displayName = f.facility_name.length > 15 ? f.facility_name.slice(0, 13) + '…' : f.facility_name;
    return `<th class="text-center py-2 font-black ${identifierColor}">(${identifier}) ${displayName}</th>`;
  }).join('');

  const scoreRows = [
    { label: '🏆 الثقة (Trust Score)', key: 'trust_score', pct: true },
    { label: '📊 الثقة التحليلية', key: 'analysis_confidence', pct: true },
    { label: '⭐ التقييم العام', key: 'rating', star: true },
    { label: '📝 عدد المراجعات', key: 'review_count', fmt: true },
    { label: '✅ مراجعات مؤهلة', key: 'qualified_reviews_count', fmt: true },
    { label: '📐 الدرجة المركبة', key: 'composite_score', pct: true },
    { label: '🔍 الموثوقية', key: 'reliability_classification' },
    { label: '🚨 مخاطر الشذوذ', key: 'anomaly_risk' },
  ];

  const tableRowsHtml = scoreRows.map(row => {
    const cells = facilities.map(f => {
      let v = f[row.key];
      if (v === undefined || v === null) v = '—';
      
      const fmt = (val) => {
        if (row.star) return val !== '—' ? `★ ${val}` : '?';
        if (row.pct) return val !== '—' ? `${val}%` : '—';
        if (row.fmt && typeof val === 'number') return val.toLocaleString('ar-SA');
        return val;
      };

      const cls = row.pct && typeof v === 'number' && v >= 70 ? 'text-emerald-700 dark:text-emerald-400' :
                  row.pct && typeof v === 'number' && v >= 50 ? 'text-amber-700 dark:text-amber-400' : '';

      return `<td class="py-1.5 text-sm font-black ${cls} text-center">${fmt(v)}</td>`;
    }).join('');

    return `
    <tr class="border-b border-slate-100 dark:border-slate-800">
      <td class="py-1.5 text-xs font-bold text-slate-500">${row.label}</td>
      ${cells}
    </tr>`;
  }).join('');

  const tableColSpan = facilities.length > 2 ? 'col-span-1 md:col-span-3 lg:col-span-4' : 'col-span-1 md:col-span-2';
  const tableHtml = `
  <div class="${tableColSpan} bg-white/90 dark:bg-slate-900/95 backdrop-blur-sm rounded-3xl p-4 border border-white/50 dark:border-slate-800 shadow-2xl">
    <h4 class="text-sm font-black text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">⚖️ <span>مقارنة سريعة بين المنشآت</span></h4>
    <div class="overflow-x-auto">
      <table class="w-full text-xs">
        <thead>
          <tr class="border-b-2 border-slate-200 dark:border-slate-700">
            <th class="text-right py-2 font-bold text-slate-500">المعيار</th>
            ${tableHeaders}
          </tr>
        </thead>
        <tbody>${tableRowsHtml}</tbody>
      </table>
    </div>
  </div>`;

  const aiButtonColSpan = facilities.length > 2 ? 'col-span-1 md:col-span-3 lg:col-span-4' : 'col-span-1 md:col-span-2';

  container.innerHTML = `
    ${cardsHtml}
    ${tableHtml}
    <div class="${aiButtonColSpan}">
      <button onclick="openAIConsult()" class="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-6 py-4 rounded-2xl font-black text-base shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 border border-white/20">
        <span>🧠</span>
        <span>استشارة الذكاء الاصطناعي</span>
        <span class="text-xs bg-white/20 px-2 py-0.5 rounded-full font-bold">DeepSeek / Gemini</span>
      </button>
    </div>
  `;
}

// ===== AI CONSULT (استشارة الذكاء الاصطناعي) =====
const AI_SUGGESTIONS = [
  "ألم في الكتف الأيسر", "صداع مزمن", "آلام أسفل الظهر", "التهاب المفاصل",
  "مشاكل في الأسنان", "آلام الرقبة", "حساسية جلدية", "تساقط الشعر",
  "اضطرابات النوم", "آلام المعدة", "ارتفاع ضغط الدم", "السكري",
  "ضعف النظر", "طنين الأذن", "دوخة ودوار", "التهاب الحلق المتكرر"
];

window.openAIConsult = function() {
  const modal = document.getElementById('aiModalOverlay');
  if (!modal) return;
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Populate suggestions
  const container = document.getElementById('aiSuggestions');
  if (container) {
    container.innerHTML = AI_SUGGESTIONS.map(s =>
      `<button onclick="selectAISuggestion('${s.replace(/'/g, "\\'")}')" class="text-[10px] font-bold px-2.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/50 hover:bg-indigo-100 dark:hover:bg-indigo-950/40 transition whitespace-nowrap">${s}</button>`
    ).join('');
  }

  // Reset UI
  const responseArea = document.getElementById('aiResponseArea');
  if (responseArea) responseArea.classList.add('hidden');
  const sendBtn = document.getElementById('aiSendBtn');
  if (sendBtn) { sendBtn.disabled = false; sendBtn.innerHTML = '<span>📋</span><span>إنشاء البرومبت</span>'; }
};

window.selectAISuggestion = function(text) {
  const input = document.getElementById('aiProblemInput');
  if (input) { input.value = text; input.focus(); }
};

window.closeAIConsult = function() {
  const modal = document.getElementById('aiModalOverlay');
  if (modal) modal.classList.add('hidden');
  document.body.style.overflow = '';
};

function buildAIPrompt(problem, location, facilities) {
  const specMap = s => ({dentistry:'أسنان',dermatology:'جلدية',physiotherapy:'علاج طبيعي',general:'عامة',internal_medicine:'باطنة',obgyn:'نساء وولادة',pediatrics:'أطفال',ophthalmology:'عيون',ent:'أنف وأذن',orthopedics:'عظام',emergency:'طوارئ',lab:'تحاليل',radiology:'أشعة'})[s]||s;

  const facilitiesBlocks = facilities.map((f, index) => {
    const identifier = ['أ', 'ب', 'ج', 'د'][index] || String.fromCharCode(65 + index);
    const specs = (f.normalized_specialization||[]).map(specMap).join('، ');
    const staff = (f.known_staff||[]).join('، ') || 'غير محدد';
    const services = (f.supported_services||[]).join('، ') || 'غير محدد';
    
    return `المركز رقم ${index + 1} (${identifier}):
* facility_name: ${f.facility_name}
* specialties: ${specs || 'غير محدد'}
* rating: ${f.rating ?? 'غير متوفر'}
* review_count: ${f.review_count ?? 0}
* trust_score: ${f.trust_score ?? 'N/A'}
* location: ${f.text_guidance || 'الرياض'}
* medical_staff: ${staff}
* reputation_summary: ${f.final_assessment || 'غير متوفرة'}
* services: ${services}
* reliability: ${f.reliability_classification || 'غير حدد'}`;
  }).join('\n\n');

  return `# Clinical Comparison Engine V1.0

## Saudi Rehabilitation & Medical Center Comparator

### اللغة: العربية الفصحى المبسطة

أنت خبير مقارن صحي متخصص في تحليل ومقارنة المراكز الطبية السعودية اعتمادًا على:
* السمعة العلاجية الواقعية
* كفاءة الكادر الطبي
* التخصص الدقيق المرتبط بالمشكلة الصحية
* قوة الأدلة السريرية
* موثوقية النتائج العلاجية

مهمتك الأساسية هي مقارنة وتقييم المنشآت الطبية المرفقة ببياناتها أدناه والبالغ عددها (${facilities.length} مراكز)، مع البحث واقتراح مركز إضافي متميز قريب من الحي السكني للمريض ليكون المقارن الأفضل.

قاعدة المقارنة الإضافية والبحث الجغرافي (هام جداً):
- إذا قام المستخدم باختيار مركزين (2) للمقارنة، يجب عليك البحث عن مركز ثالث (3) خارج القائمة المرفقة يكون متميزاً وقريباً من الحي السكني للمريض وإدخاله في دراسة مقارنة ومقيّمة معهما.
- إذا قام المستخدم باختيار ثلاثة (3) مراكز للمقارنة، يجب عليك البحث عن مركز رابع (4) خارج القائمة المرفقة يكون متميزاً وقريباً من الحي السكني للمريض وإدخاله في المقارنة.
- إذا قام المستخدم باختيار أربعة (4) مراكز للمقارنة، يجب عليك البحث عن مركز خامس (5) خارج القائمة المرفقة يكون متميزاً وقريباً من الحي السكني للمريض وإدخاله في المقارنة.
- هدف البحث والاقتراح لهذا المركز الإضافي هو دراسة وتقييم ومقارنة العمل بين جميع المراكز (المحددة والمقترحة) للخروج بالخيار الأفضل للمريض، وتلافي أي مركز متميز قد يكون المريض قد أغفله أو سقط منه سهواً.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GLOBAL EXECUTION RULES (قواعد التنفيذ العامة)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. بالنسبة للمراكز المرفقة ببياناتها (أ، ب، ج، د)، التزم فقط بالبيانات المدخلة ولا تخترع معلومات غير موجودة عنها.
2. [استثناء مهم للبحث الجغرافي]: يُسمح لك ويُطلب منك استخدام قاعدة معرفتك العامة الموثوقة لمدينة الرياض للبحث واقتراح المركز الطبي الخارجي الإضافي القريب من حي المريض ("${location || 'الرياض'}") وتقديم وصف طبي ومقارنة كاملة له مع بقية المراكز.
3. ركّز على ملاءمة كل مركز للمشكلة الصحية المحددة، وليس التقييم العام فقط.
4. التحليل يجب أن يكون طبيًا عمليًا ومبسطًا للمريض العادي.
5. أخرج الإجابة باللغة العربية الفصحى المبسطة.
6. نظّم الإجابة بالأقسام المطلوبة فقط.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REPUTATION NOISE FILTERING ENGINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
قبل تنفيذ المقارنة النهائية، قم بتصفية الضوضاء والانحيازات غير الطبية في السمعة (مثل مراجعات المجاملة بدون وصف طبي، المراجعات الترويجية المبالغ فيها، ومراجعات التشويه).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INPUT STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

المشكلة الصحية:
"${problem}"

الحي السكني للمريض:
"${location || 'الرياض'}"

المراكز المقارنة المرفقة:

${facilitiesBlocks}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ANALYSIS ENGINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
قم بالمقارنة وفق المحاور التالية:
## [A] Clinical Relevance Analysis (ملاءمة التخصص والكادر للمشكلة الصحية).
## [B] Reputation Reliability Assessment (موثوقية السمعة والأدلة).
## [C] Practical Patient Factors (عوامل عملية كسهولة الوصول للمريض).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NUMERICAL EVALUATION SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
قيّم كل من المراكز المقارنة المرفقة بالإضافة إلى المركز الإضافي المقترح من قبلك من 1 إلى 10 في:
1. الجودة السريرية
2. سرعة الحصول على الخدمة
3. التكلفة المتوقعة (10 = اقتصادي ممتاز، 1 = مرتفع جداً)
4. التقنيات والخدمات العلاجية

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FINAL OUTPUT STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

أخرج النتيجة بالأقسام التالية حصراً وبنفس الترتيب:

# أولاً: التحليل الطبي للمشكلة
* أي المراكز المرفقة أو المقترحة يبدو أكثر ملاءمة للحالة؟ ولماذا؟
* تفصيل لنقاط القوة والضعف لكل مركز (المرفقة والمركز الإضافي) بالنسبة لهذه الحالات تحديداً.
* [المركز الإضافي المقترح بناءً على الحي]: اذكر بوضوح اسم وموقع المركز الإضافي (المركز رقم ${facilities.length + 1}) الذي اخترته بناءً على قربه من الحي السكني للمريض ("${location || 'الرياض'}")، وقارنه بشكل كامل مع المراكز الأخرى بحيث يخرج التحليل بالخيار الأفضل للمريض الذي ربما يكون قد أغفله أو سقط منه سهواً.

# ثانياً: التقييم الرقمي للمراكز (المرفقة والمقترحة)
${facilities.map((f, i) => {
  const identifier = ['أ', 'ب', 'ج', 'د'][i];
  return `## المركز (${identifier}): ${f.facility_name}
* الجودة السريرية: X/10
* سرعة الحصول على الخدمة: X/10
* التكلفة المتوقعة: X/10
* التقنيات والخدمات العلاجية: X/10`;
}).join('\n\n')}

## المركز الإضافي المقترح (المركز رقم ${facilities.length + 1}): [اسم المركز المقترح]
* الجودة السريرية: X/10
* سرعة الحصول على الخدمة: X/10
* التكلفة المتوقعة: X/10
* التقنيات والخدمات العلاجية: X/10

# ثالثاً: التوجيه المناسب للمريض والخيار الأفضل النهائي
* توصية عملية وواضحة تحدد متى يذهب المريض لكل مركز ونوع الحالات الأنسب لكل منها، مع تسمية "المركز الأفضل" لحالة المريض السريرية والجغرافية.

# رابعاً: التحذيرات والملاحظات
* أي ضعف في الثقة أو نقص في الأدلة أو حاجة للتحقق.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STYLE RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
* استخدم لغة واضحة ومهنية ومبسطة.
* لا تستخدم لغة تسويقية أو تدعي "الأفضل مطلقاً" بدون مبرر طبي.
* لا تذكر معلومات غير موجودة في البيانات المدخلة بالنسبة للمراكز المرفقة (أ، ب، ج، د)، ولكن ابحث واقترح المركز الإضافي الخارجي بحرية تامة بناءً على معرفتك وعلمك بالمراكز الطبية بالرياض.`;
}

window.generateAIPrompt = function() {
  const input = document.getElementById('aiProblemInput');
  const locationInput = document.getElementById('aiLocationInput');
  const responseArea = document.getElementById('aiResponseArea');
  const responseContent = document.getElementById('aiResponseContent');
  const problem = input?.value.trim();
  const location = locationInput?.value.trim() || '';

  if (!problem) { alert('الرجاء كتابة وصف المشكلة الصحية'); return; }

  const selectedFacilities = compareSelection.map(id => FACILITIES_MASTER.find(f => f.id === id)).filter(Boolean);
  if (selectedFacilities.length < 2) { alert('حدث خطأ في تحميل بيانات المراكز الطبية للمقارنة'); return; }

  const prompt = buildAIPrompt(problem, location, selectedFacilities);
  if (responseContent) responseContent.textContent = prompt;
  if (responseArea) responseArea.classList.remove('hidden');
};

window.copyAIPrompt = function() {
  const content = document.getElementById('aiResponseContent');
  if (!content) return;
  navigator.clipboard.writeText(content.textContent).then(() => {
    const btn = document.getElementById('aiCopyBtn');
    if (btn) { btn.innerHTML = '<span>✅</span><span>تم النسخ!</span>'; setTimeout(() => { btn.innerHTML = '<span>📋</span><span>نسخ الأمر</span>'; }, 2000); }
  }).catch(() => {
    alert('تعذر النسخ. يمكنك تحديد النص يدوياً ونسخه.');
  });
};

window.shareFacility = function(id) {
    const f = FACILITIES_MASTER.find(w => w.id === id);
    if (!f) return;
    const areaObj = GOVERNORATE_AREAS.find(a => a.id === f.area);
    const defaultLocation = areaObj ? areaObj.name : "الرياض";
    const shareText = `🏥 *منوال المستوصفات (طريق الصحة)*:\nالمنشأة: *${f.facility_name}*\n📍 الموقع: ${f.text_guidance || defaultLocation}\n📞 اتصال: ${f.phone || 'غير متوفر'}\n⭐ التقييم: ${f.rating || 'غير متوفر'} (${f.review_count || 0} تقييم)\n🎯 التخصص: ${f.inferred_strength || 'خدمات صحية'}\n🗺️ موقع الخرائط: https://maps.google.com/?q=${encodeURIComponent(f.facility_name + ' الرياض')}`;
    
    if (navigator.share) {
        navigator.share({
            title: f.facility_name,
            text: shareText
        }).catch(() => {
            fallbackShare(shareText);
        });
    } else {
        fallbackShare(shareText);
    }
};

function fallbackShare(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert("تم نسخ تفاصيل المنشأة الصحية بنجاح! يمكنك لصقها وإرسالها لأي شخص.");
    }).catch(() => {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    });
}

function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const currentTheme = localStorage.getItem('theme') || 'light';
    
    if (currentTheme === 'dark') {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
        if (themeToggle) themeToggle.innerHTML = '☀️';
    } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark');
        if (themeToggle) themeToggle.innerHTML = '🌙';
    }
    
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isDark = document.documentElement.classList.toggle('dark');
            document.body.classList.toggle('dark', isDark);
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            themeToggle.innerHTML = isDark ? '☀️' : '🌙';
        });
    }
}

function updateUI(){
    try {
        const results = smartSearch(FACILITIES_MASTER, currentArea, currentQuery, currentFilter, onlyElite);
        renderResults(results);
    } catch(e) {
        console.error('خطأ في تحديث الواجهة:', e);
        const container = document.getElementById('resultsList');
        if (container) {
            container.innerHTML = `<div class="text-center py-16 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm rounded-3xl shadow-md">
                <span class="text-5xl">⚠️</span>
                <p class="mt-2 font-bold text-base dark:text-slate-200">حدث خطأ أثناء عرض النتائج</p>
                <p class="text-sm text-gray-500 dark:text-slate-400 mt-1">${e.message}</p>
            </div>`;
        }
    }
}

window.enterGovernorateArea = async function(areaId, preFilter, preQuery) {
  console.log('✅ enterGovernorateArea START', areaId);
  try {
    const area = GOVERNORATE_AREAS.find(a => a.id === areaId);
    if (!area || !area.active) {
        console.log('⚠️ Area not active:', areaId);
        alert('هذه المنطقة غير متاحة حالياً. يرجى اختيار شرق الرياض ووسطها.');
        return;
    }

    currentArea = areaId;

    const welcomeEl = document.getElementById('welcomeScreen');
    const directoryEl = document.getElementById('directoryScreen');
    const homeViewEl = document.getElementById('homeView');
    const detailsViewEl = document.getElementById('detailsView');
    const compareViewEl = document.getElementById('compareView');
    const searchFilterEl = document.getElementById('searchFilterContainer');
    const compareFloatingEl = document.getElementById('compareFloatingBtn');

    console.log('✅ Elements found:', {welcome: !!welcomeEl, directory: !!directoryEl, homeView: !!homeViewEl});

    if (welcomeEl) welcomeEl.classList.add('hidden');
    if (directoryEl) directoryEl.classList.remove('hidden');
    else console.error('❌ directoryScreen NOT found in DOM');

    if (homeViewEl) homeViewEl.classList.remove('hidden');
    if (detailsViewEl) detailsViewEl.classList.add('hidden');
    if (compareViewEl) compareViewEl.classList.add('hidden');
    if (compareFloatingEl) compareFloatingEl.classList.add('hidden');

    try { window.scroll(0, 0); } catch(e) { console.warn('scroll failed:', e); }

    const activeAreaSub = document.getElementById('activeAreaSub');
    if (activeAreaSub) activeAreaSub.innerText = area.subtext;

    console.log('✅ Showing skeleton loader');
    showSkeletonLoader();
    const totalEl = document.getElementById('totalFacilitiesCount');
    const eliteEl = document.getElementById('eliteFacilitiesCount');
    if (totalEl) totalEl.innerText = 'جاري التحميل...';
    if (eliteEl) eliteEl.innerText = 'جاري التحميل...';

    try {
        console.log('✅ Loading area data for:', areaId);
        await loadAreaData(areaId);
        console.log('✅ Area data loaded successfully');
    } catch (err) {
        console.error('❌ Error loading area data:', err);
        const container = document.getElementById('resultsList');
        if (container) {
            container.innerHTML = `<div class="text-center py-16 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm rounded-3xl shadow-md border border-red-100 dark:border-red-950/30">
                <span class="text-5xl">⚠️</span>
                <p class="mt-4 font-black text-lg text-red-600 dark:text-red-400">تعذّر تحميل بيانات المنطقة</p>
                <button onclick="enterGovernorateArea('${areaId}')" class="mt-5 bg-slate-900 text-white px-6 py-2.5 rounded-xl text-sm font-bold">🔄 إعادة المحاولة</button>
            </div>`;
        }
        if (searchFilterEl) searchFilterEl.classList.remove('hidden');
        return;
    }

    const areaFacilities = FACILITIES_MASTER.filter(f => f.area === areaId);
    console.log('✅ Area facilities count:', areaFacilities.length);
    if (totalEl) totalEl.innerText = `${areaFacilities.length} منشأة موثقة`;
    if (eliteEl) eliteEl.innerText = `${areaFacilities.filter(f => isFacilityElite(f)).length} نخبة صحية`;

    if (preFilter === 'elite') {
        onlyElite = true;
        currentFilter = 'all';
    } else {
        onlyElite = false;
        currentFilter = preFilter || 'all';
    }
    currentQuery = preQuery || '';

    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = currentQuery;

    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
        clearBtn.classList.toggle('hidden', !currentQuery);
    }

    updateFilterButtonsUI();

    if (searchFilterEl) searchFilterEl.classList.remove('hidden');

    compareSelection = [];

    console.log('✅ Calling updateUI');
    updateUI();
    console.log('✅ enterGovernorateArea END');
  } catch (e) {
    console.error('❌ Fatal error in enterGovernorateArea:', e);
    const container = document.getElementById('resultsList');
    if (container) {
      container.innerHTML = `<div class="text-center py-16 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm rounded-3xl shadow-md border border-red-100 dark:border-red-950/30">
        <span class="text-5xl">⚠️</span>
        <p class="mt-4 font-black text-lg text-red-600 dark:text-red-400">حدث خطأ أثناء تحميل الصفحة</p>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">${e.message}</p>
        <button onclick="enterGovernorateArea('${areaId}')" class="mt-5 bg-slate-900 text-white px-6 py-2.5 rounded-xl text-sm font-bold">🔄 إعادة المحاولة</button>
      </div>`;
    }
    const searchEl = document.getElementById('searchFilterContainer');
    if (searchEl) searchEl.classList.remove('hidden');
  }
  console.log('✅ enterGovernorateArea COMPLETE');
};

window.goToWelcomeScreen = function() {
    document.getElementById('directoryScreen').classList.add('hidden');
    document.getElementById('detailsView').classList.add('hidden');
    document.getElementById('compareView').classList.add('hidden');
    document.getElementById('homeView').classList.remove('hidden');
    document.getElementById('welcomeScreen').classList.remove('hidden');
    document.getElementById('searchFilterContainer')?.classList.add('hidden');
    document.getElementById('compareFloatingBtn')?.classList.add('hidden');
    compareSelection = [];
    window.scrollTo({ top: 0, behavior: 'instant' });
};

window.handleHeroSearch = function() {
    const areaSelect = document.getElementById('heroAreaSelect');
    const areaId = areaSelect ? areaSelect.value : '';
    if (!areaId) {
        alert('الرجاء اختيار المنطقة أولاً لعرض المراكز الصحية.');
        areaSelect?.focus();
        return;
    }
    
    // التحقق من أن المنطقة نشطة وتحتوي على بيانات
    const area = GOVERNORATE_AREAS.find(a => a.id === areaId);
    if (!area || !area.active) {
        alert('هذه المنطقة قيد الإعداد وستكون متاحة قريباً. حالياً البيانات المتاحة هي شرق الرياض ووسطها فقط.');
        return;
    }
    
    const query = document.getElementById('heroSearchInput')?.value.trim() || '';
    const filter = document.getElementById('heroSpecialtySelect')?.value || 'all';
    
    if (areaId === 'east_center') {
        window.location.href = `east_riyadh.html?filter=${filter}&query=${encodeURIComponent(query)}`;
    } else {
        window.enterGovernorateArea(areaId, filter, query);
    }
};

window.handleSymptomClick = function(symptomName, specialtyKey) {
    const areaSelect = document.getElementById('heroAreaSelect');
    const areaId = areaSelect ? areaSelect.value : '';
    if (!areaId) {
        alert('الرجاء تحديد المنطقة أولاً من القائمة الجانبية لشريط البحث لمعاينة المراكز.');
        areaSelect?.focus();
        return;
    }
    
    if (areaId === 'east_center') {
        window.location.href = `east_riyadh.html?filter=${specialtyKey}&query=${encodeURIComponent(symptomName)}`;
    } else {
        window.enterGovernorateArea(areaId, specialtyKey, symptomName);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    FACILITIES_MASTER.forEach((facility, index) => {
        facility.id = index + 1;
    });
    
    initTheme();
    
    window.updateFilterButtonsUI = function() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            const filterVal = btn.getAttribute('data-filter');
            if (filterVal === 'elite') {
                if (onlyElite) {
                    btn.classList.add('bg-amber-500', 'text-white', 'border-amber-500');
                    btn.classList.remove('bg-amber-50', 'text-amber-800', 'border-amber-200', 'dark:bg-amber-950/20', 'dark:border-amber-900/50', 'dark:text-amber-400');
                } else {
                    btn.classList.remove('bg-amber-500', 'text-white', 'border-amber-500');
                    btn.classList.add('bg-amber-50', 'text-amber-800', 'border-amber-200', 'dark:bg-amber-950/20', 'dark:border-amber-900/50', 'dark:text-amber-400');
                }
            } else {
                const isActive = filterVal === currentFilter;
                if (isActive) {
                    btn.classList.add('active', 'bg-slate-900', 'text-white', 'dark:bg-slate-100', 'dark:text-slate-900');
                    btn.classList.remove('bg-white', 'text-slate-700', 'border-slate-200', 'dark:bg-slate-900', 'dark:text-slate-300', 'dark:border-slate-800');
                } else {
                    btn.classList.remove('active', 'bg-slate-900', 'text-white', 'dark:bg-slate-100', 'dark:text-slate-900');
                    btn.classList.add('bg-white', 'text-slate-700', 'border-slate-200', 'dark:bg-slate-900', 'dark:text-slate-300', 'dark:border-slate-800');
                }
            }
        });
    };

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const filterVal = btn.getAttribute('data-filter');
            if (filterVal === 'elite') {
                onlyElite = !onlyElite;
            } else {
                currentFilter = filterVal;
            }
            updateFilterButtonsUI();
            updateUI();
        });
    });
    
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearBtn');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentQuery = e.target.value;
            updateUI();
            if (clearBtn) clearBtn.classList.toggle('hidden', !currentQuery.trim());
        });
    }

    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.onsubmit = (e) => {
            e.preventDefault();
            if (searchInput) {
                currentQuery = searchInput.value;
                updateUI();
                if (clearBtn) clearBtn.classList.toggle('hidden', !currentQuery.trim());
            }
        };
    }

    if (clearBtn) {
        clearBtn.onclick = () => {
            if (searchInput) searchInput.value = '';
            currentQuery = '';
            updateUI();
            clearBtn.classList.add('hidden');
        };
    }

    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.onclick = () => {
            document.getElementById('detailsView').classList.add('hidden');
            document.getElementById('searchFilterContainer')?.classList.remove('hidden');
            document.getElementById('homeView').classList.remove('hidden');
            if (compareSelection.length >= 2) document.getElementById('compareFloatingBtn')?.classList.remove('hidden');
            window.scrollTo({ top: savedScrollPosition, behavior: 'instant' });
        };
    }

    const compareBackBtn = document.getElementById('compareBackBtn');
    if (compareBackBtn) {
        compareBackBtn.onclick = () => {
            document.getElementById('compareView').classList.add('hidden');
            document.getElementById('searchFilterContainer')?.classList.remove('hidden');
            document.getElementById('homeView').classList.remove('hidden');
            compareSelection = [];
            updateCompareUI();
            window.scrollTo({ top: savedScrollPosition, behavior: 'instant' });
        };
    }

    const compareSwapBtn = document.getElementById('compareSwapBtn');
    if (compareSwapBtn) {
        compareSwapBtn.onclick = () => {
            if (compareSelection.length >= 2) {
                const first = compareSelection.shift();
                compareSelection.push(first);
                const selectedFacilities = compareSelection.map(id => FACILITIES_MASTER.find(f => f.id === id)).filter(Boolean);
                if (selectedFacilities.length >= 2) {
                    renderCompareView(selectedFacilities);
                }
            }
        };
    }

    const badgeGuideToggle = document.getElementById('badgeGuideToggle');
    const badgeGuideContent = document.getElementById('badgeGuideContent');
    const badgeGuideArrow = document.getElementById('badgeGuideArrow');
    if (badgeGuideToggle && badgeGuideContent && badgeGuideArrow) {
        badgeGuideToggle.addEventListener('click', () => {
            const isHidden = badgeGuideContent.classList.contains('hidden');
            if (isHidden) {
                badgeGuideContent.classList.remove('hidden');
                badgeGuideArrow.innerText = '▲';
                badgeGuideArrow.style.transform = 'rotate(180deg)';
            } else {
                badgeGuideContent.classList.add('hidden');
                badgeGuideArrow.innerText = '▼';
                badgeGuideArrow.style.transform = 'rotate(0deg)';
            }
        });
    }

    window.addEventListener('online', () => document.getElementById('offlineIndicator')?.classList.add('hidden'));
    window.addEventListener('offline', () => document.getElementById('offlineIndicator')?.classList.remove('hidden'));
    if(!navigator.onLine) document.getElementById('offlineIndicator')?.classList.remove('hidden');

    // إخفاء searchFilterContainer حتى يختار المستخدم منطقة (فقط إذا كنا في الصفحة الرئيسية)
    if (document.getElementById('welcomeScreen')) {
        document.getElementById('searchFilterContainer')?.classList.add('hidden');
    }
});

if (window.location.protocol !== 'file:') {
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = 'manifest.json';
    document.head.appendChild(link);
}
