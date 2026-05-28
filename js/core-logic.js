// core-logic.js - Core data processing and filtering logic
// Independent of the DOM/Browser, can be tested in Node.js

function isFacilityElite(facility) {
    const trust = facility.reputation_vector?.trustworthiness || 0;
    return (facility.confidence_score >= 55 || trust >= 85) && (facility.known_staff && facility.known_staff.length > 0);
}

function getFacilityBadge(facility) {
    const isElite = isFacilityElite(facility);
    const vector = facility.reputation_vector || {};
    const keys = Object.keys(vector);
    
    const activeKeys = keys.filter(k => vector[k] > 0);
    const avg = activeKeys.length > 0 ? (activeKeys.reduce((sum, k) => sum + vector[k], 0) / activeKeys.length) : 0;
    
    if (isElite) {
        return {
            text: "⭐ نخبة صحية",
            colorClass: "badge-elite text-white elite-pulse"
        };
    }
    
    if (facility.rating === null || facility.rating === 0 || facility.review_count === 0 || (facility.confidence_score !== undefined && facility.confidence_score <= 15) || avg <= 50) {
        return {
            text: "⏳ قيد المراجعة",
            colorClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
        };
    }
    
    if (avg >= 75) {
        return {
            text: "🟢 تصنيف جيد",
            colorClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
        };
    }
    
    return {
        text: "⚪ تصنيف أساسي",
        colorClass: "bg-slate-100/80 text-slate-700 dark:text-slate-400 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800"
    };
}

const SYNONYM_MAP = {
  "عام": "general", "عامة": "general", "عائلي": "family_medicine",
  "اسنان": "dentistry", "أسنان": "dentistry", "سن": "dentistry", "تقويم": "dentistry",
  "جلدية": "dermatology", "جلد": "dermatology", "بشره": "dermatology", "حساسية": "dermatology",
  "باطنة": "internal_medicine", "باطني": "internal_medicine",
  "نساء": "obgyn", "ولادة": "obgyn", "نسائيه": "obgyn",
  "اطفال": "pediatrics", "أطفال": "pediatrics", "طفل": "pediatrics",
  "عيون": "ophthalmology", "نظر": "ophthalmology", "بصر": "ophthalmology",
  "انف": "ent", "اذن": "ent", "حنجرة": "ent", "أنف": "ent",
  "عظام": "orthopedics", "مفاصل": "orthopedics",
  "مخ": "neurology", "اعصاب": "neurology", "أعصاب": "neurology",
  "نفسية": "psychiatry", "نفسي": "psychiatry",
  "تحاليل": "lab", "مختبر": "lab", "فحوصات": "lab",
  "اشعة": "radiology", "أشعة": "radiology", "تصوير": "radiology",
  "طوارئ": "emergency", "اسعاف": "emergency",
  "علاج طبيعي": "physiotherapy", "علاج": "physiotherapy", "طبيعي": "physiotherapy",
  "سكري": "endocrinology", "غدد": "endocrinology",
  "قلب": "cardiology", "شرايين": "cardiology", "ضغط": "cardiology",
  "جهاز هضمي": "gastroenterology", "هضمي": "gastroenterology", "منظار": "gastroenterology",
  "مسالك": "urology", "بولية": "urology", "بروستاتا": "urology"
};

function normalize(text) { 
    if (!text) return '';
    return text.toString().toLowerCase()
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/[ىئ]/g, 'ي')
        .trim(); 
}

function smartSearch(facilities, currentArea, query, activeFilter, onlyElite) {
    let filtered = facilities.filter(f => f.area === currentArea && f.hard_blocked !== true);
    
    let filterToUse = activeFilter;
    let eliteFilter = onlyElite;
    
    if (activeFilter === 'elite') {
        eliteFilter = true;
        filterToUse = 'all';
    }
    
    if(filterToUse !== 'all'){
        if(filterToUse === 'general_medicine'){
            filtered = filtered.filter(f => f.normalized_specialization?.some(s => ['general', 'family_medicine'].includes(s)));
        } else if(filterToUse === 'dentistry'){
            filtered = filtered.filter(f => f.normalized_specialization?.includes('dentistry'));
        } else if(filterToUse === 'dermatology'){
            filtered = filtered.filter(f => f.normalized_specialization?.includes('dermatology'));
        } else if(filterToUse === 'physiotherapy'){
            filtered = filtered.filter(f => f.normalized_specialization?.includes('physiotherapy'));
        } else if(filterToUse === 'internal_medicine'){
            filtered = filtered.filter(f => f.normalized_specialization?.includes('internal_medicine'));
        } else if(filterToUse === 'obgyn'){
            filtered = filtered.filter(f => f.normalized_specialization?.includes('obgyn'));
        } else if(filterToUse === 'pediatrics'){
            filtered = filtered.filter(f => f.normalized_specialization?.includes('pediatrics'));
        } else if(filterToUse === 'ophthalmology'){
            filtered = filtered.filter(f => f.normalized_specialization?.includes('ophthalmology'));
        } else if(filterToUse === 'ent'){
            filtered = filtered.filter(f => f.normalized_specialization?.includes('ent'));
        } else if(filterToUse === 'orthopedics'){
            filtered = filtered.filter(f => f.normalized_specialization?.includes('orthopedics'));
        } else if(filterToUse === 'emergency'){
            filtered = filtered.filter(f => f.normalized_specialization?.includes('emergency'));
        } else if(filterToUse === 'lab_radiology'){
            filtered = filtered.filter(f => f.normalized_specialization?.some(s => ['lab', 'radiology'].includes(s)));
        }
    }
    
    if (eliteFilter) {
        filtered = filtered.filter(f => isFacilityElite(f));
    }
    
    if(query && query.trim() !== ""){
        const words = query.split(/\s+/).filter(w => w.length >= 2 || /^\d$/.test(w));
        const inferredCats = new Set();
        words.forEach(w => { 
            let norm = normalize(w); 
            if(SYNONYM_MAP[norm]) inferredCats.add(SYNONYM_MAP[norm]); 
        });
        filtered = filtered.filter(f => {
            let match = false;
            for(let w of words){
                let nw = normalize(w);
                if(normalize(f.facility_name).includes(nw) ||
                   f.known_staff?.some(s => normalize(s).includes(nw)) ||
                   f.medical_keywords?.some(k => normalize(k).includes(nw)) ||
                   f.service_categories?.some(c => normalize(c).includes(nw)) ||
                   normalize(f.text_guidance).includes(nw) ||
                   normalize(f.phone).includes(nw) ||
                   normalize(f.inferred_strength).includes(nw)){
                    match = true; break;
                }
            }
            let catMatch = inferredCats.size === 0 ? false : f.normalized_specialization?.some(c => inferredCats.has(c));
            return match || catMatch;
        });
    }
    return filtered.sort((a,b) => (b.confidence_score||0) - (a.confidence_score||0));
}

// Export for Node.js testing environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        isFacilityElite,
        getFacilityBadge,
        smartSearch,
        normalize,
        SYNONYM_MAP
    };
}
