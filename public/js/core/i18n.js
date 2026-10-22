/** CARX — i18n: EN/AR dictionaries + DOM translation (RTL aware). */

import { state, savePrefs } from "./state.js";
import { $$ } from "./utils.js";

export const TEX = {
  en: {
    skip: "Skip to content",
    n1: "Collection", n2: "Configurator", n3: "Engineering", n4: "Showrooms",
    n5: "Build story", n6: "Telemetry",
    heroT1: "BMW", heroT2: "M5", heroT3: "E34.",
    heroSub: "The legendary BMW M5 E34 — S38 3.8 L inline-six, 315 PS, 250 km/h. Configure paint, wheels, roof and trim on a real GLB model, in your browser.",
    stat1: "3.8 L I6", stat2: "PS",
    ctaCfg: "Open configurator", ctaStory: "The build, layer by layer",
    drag: "drag to rotate", plCap: "Entering the studio",
    st1t: "A real car, in your browser.",
    st1p: "The E34 M5 loads as a true Draco-compressed GLB — 4.5 MB of real geometry, materials and textures — streamed straight into the studio viewport.",
    st2t: "Studio light on real surfaces.",
    st2p: "A PMREM environment, key/rim/fill lights and a contact shadow read the loaded model as a physical object, not a screenshot.",
    st3t: "Paint that follows your choice.",
    st3p: "Selections tint the model's real paint material live — rims, brake calipers and the roof skin change with the wheel, trim and roof you pick.",
    st4t: "A signature in one stroke.",
    st4p: "Scroll lifts the car into the story with callouts and parallax — the same engine, the same real model, from hero to newsletter.",
    co0: "Hand-assembled 3.8 L inline-six, 315 PS at 6,900 rpm.",
    co1: "Dog-leg five-speed, built for the autobahn, not the spreadsheet.",
    co2: "Forged 17″ wheels — three finishes, live on the model.",
    co3: "The wagon nobody ordered new — and everybody wants now.",
    colK: "The Garage", colT: "The legend. One philosophy.",
    colS: "A single real-world model — the BMW M5 E34 Touring — loaded as a true GLB. Every choice repaints it live; every build gets a shareable key.",
    cfgK: "Configurator", cfgT: "Make it unmistakably yours.",
    cfgS: "Paint tints the real body material, wheels re-finish the rims, trims recolour the brake calipers and the roof grows a carbon or panorama skin. Prices are fictional.",
    cfgHint: "drag on the canvas edge &middot; pinch to zoom",
    perfK: "Telemetry", perfT: "Numbers, honestly rounded.",
    pL1: "Tank range (km)", pL2: "0–100 (s)", pL3: "V-max (km/h)", pL4: "Power (PS)",
    engK: "Engineering", engT: "Four chapters of the build.",
    e1t: "Compressed reality",
    e1p: "The 27 MB source GLB is Draco-compressed and its textures re-encoded to WebP — 4.5 MB on the wire, loaded once with real progress reporting.",
    e2t: "Studio lighting",
    e2p: "PMREM environment, key/rim/fill directional lights, hemisphere, contact shadow and drifting dust — all relit when you switch the theme.",
    e3t: "Live materials",
    e3p: "Paint, rims and calipers are mapped to the model's real material slots and transition with a colour lerp — no model reloads.",
    e4t: "Procedural roof skin",
    e4p: "Carbon and panorama roofs are generated at runtime: the roof surface is raycast from above and re-skinned with a procedural carbon weave or dark glass.",
    shK: "Showrooms", shT: "Visit the imaginary network.",
    shS: "These ateliers do not exist — which keeps them immaculate.",
    nlK: "Dispatch", nlT: "Letters from the wind tunnel.",
    nlS: "One e-mail per fictional quarter. Unsubscribe with one click — the token is real, the letters are not.",
    nlPh: "you@studio.example", nlGo: "Join",
    nlOk: "You are on the list. One click unsubscribes — the token is real.",
    nlBad: "That address does not parse. Fictional servers are strict.",
    footStudio: "Studio", footMore: "More", footLegal: "Legal",
    footA: "Atelier demo. Your build lives in this browser and — if you check out — in the studio's order book.",
    fPrivacy: "Privacy (privacy-light)", fTerms: "Terms (fictional)", fAdmin: "Admin",
    fDisc: "The BMW M5 E34 model is loaded from a compressed GLB file. All prices and configurations are demonstrative fiction. No real vehicles are sold.",
    cardCta: "Configure", baseP: "Base vehicle", plPaint: "Paint", plWheels: "Wheels",
    plRoof: "Roof", plTrim: "Trim", totalP: "Total (fictional)",
    finger: "Build key", addCart: "Add to cart", share: "Copy share link",
    copied: "Share link copied", selT: "Loaded: ", added: "Added to cart.",
    cartT: "Your build queue", cartEmpty: "Your queue is empty — configure something.",
    subT: "Subtotal", checkout: "Send order to the atelier", clear: "Clear queue",
    minus: "&#8722;", remove: "Remove",
    modalT: "Atelier order (demo)", mTitle: "Complete the paperwork",
    fName: "Name", fPhone: "Phone", kCity: "City (optional)", fEmail: "E-mail (optional)",
    payT: "Demo order", payP: "This is a simulation. No payment gateway is contacted, no card data is ever requested. The order is stamped in the studio's order book so the team can follow up.",
    payGo: "Stamp my order", sim1: "Contacting the atelier ledger…", sim2: "Stamping your build…",
    doneT: "Order stamped", doneP: "Your build is in the order book. The team will follow up on the phone number you left.",
    doneBtn: "Back to the studio",
    orderLookup: "Look up an order", orderFound: "Found", orderNotFound: "No order with that code.",
    curC: "Currency: ", themeL: "Theme switched.", toastWebgl: "No WebGL here — showing the paper model.",
    kindC: "Coupe", kindG: "Grand tourer", kindR: "Roadster", kindW: "Touring",
    or: "or", per: "each",
    garageT: "My garage", garageEmpty: "No saved builds yet — press the house button in the configurator.",
    garageSave: "Save current build", garageSaved: "Build saved to your garage.",
    garageLoad: "Load", garageDel: "Delete", garageCmp: "Compare", garageName: "Name this build",
    kioskOn: "Kiosk mode", kioskExit: "tap to exit",
    shotOk: "Screenshot saved.", shotFail: "Screenshot unavailable here.",
    leadCta: "Ask the atelier to call me", leadOk: "The atelier will call you back.",
    leadBad: "Leave a phone or an e-mail first.",
    offline: "Offline — using the cached studio.",
    nlK2: "", wheelLive: "live on model", trimLive: "calipers + lip",
  },
  ar: {
    skip: "تخطَّ إلى المحتوى",
    n1: "المجموعة", n2: "التهيئة", n3: "الهندسة", n4: "المعارض",
    n5: "قصة البناء", n6: "الأرقام",
    heroT1: "BMW", heroT2: "M5", heroT3: "E34.",
    heroSub: "الأسطورة BMW M5 E34 — محرك S38 سداسي 3.8 لتر، 315 حصان، 250 كم/س. هيّئ الطلاء والعجلات والسقف والتشطيب على نموذج GLB حقيقي داخل متصفحك.",
    stat1: "3.8 لتر سداسي", stat2: "حصان",
    ctaCfg: "افتح التهيئة", ctaStory: "البناء، طبقةً طبقة",
    drag: "اسحب للتدوير", plCap: "دخول الأتيليه",
    st1t: "سيارة حقيقية، في متصفحك.",
    st1p: "يُحمَّل إم5 إي34 كملف GLB حقيقي مضغوط بـ Draco — 4.5 ميجابايت من الهندسة والخامات والملمس — مباشرة إلى منصة الاستوديو.",
    st2t: "ضوء استوديو على أسطح حقيقية.",
    st2p: "بيئة PMREM مع إضاءة رئيسية وحاشية وتعبئة وظل ملامسة تجعل النموذج المحمَّل يبدو جسماً حقيقياً لا لقطة.",
    st3t: "طلاء يتبع اختيارك.",
    st3p: "يغيّر اختيارك مادة الطلاء الحقيقية للنموذج فوراً — والجنوط ومقابس الفرملة وجلد السقف تتبدل مع العجلة والتشطيب والسقف.",
    st4t: "توقيعٌ في ضربةٍ واحدة.",
    st4p: "التمرير يرفع السيارة داخل القصة مع البطاقات والبارالاكس — نفس المحرك، نفس النموذج الحقيقي، من البطل حتى النشرة.",
    co0: "محرك سداسي 3.8 لتر يُجمَّع يدوياً، 315 حصاناً عند 6900 دورة.",
    co1: "ناقل خماسي بتنسيق الكلب — صُنع للطريق السريع لا للجدول.",
    co2: "جنوط مطروقة 17 بوصة — ثلاث خامات، تتغير حياً على النموذج.",
    co3: "عربة التورينغ التي لم يطلبها أحد يوماً — والجميع يريدها الآن.",
    colK: "الجارَج", colT: "الأسطورة. فلسفة واحدة.",
    colS: "طراز واحد حقيقي — BMW M5 E34 تورينغ — محمّل كملف GLB حقيقي. كل اختيار يعيد طلاؤه فوراً، وكل تهيئة تحصل على مفتاح قابل للمشاركة.",
    cfgK: "التهيئة", cfgT: "اجعله لا يُشبِهك ولا يُشبِه غيرك.",
    cfgS: "الطلاء يلوّن مادة الهيكل الحقيقية، والعجلات تُعيد تشطيب الجنوط، والتشطيب يغيّر لون مقابس الفرملة، والسقف ينمو عليه جلد كاربون أو زجاج بانوراما. الأسعار خيالية.",
    cfgHint: "اسحب من حواف المنصة &middot; واقرّب بإصبعين",
    perfK: "الأرقام", perfT: "أرقام، مقرّبة بصدق.",
    pL1: "المدى (كم)", pL2: "0–100 (ث)", pL3: "السرعة القصوى (كم/س)", pL4: "القوة (حصان)",
    engK: "الهندسة", engT: "أربعة فصول من البناء.",
    e1t: "واقعٌ مضغوط",
    e1p: "ملف GLB الأصلي بحجم 27 ميجابايت يُضغط بـ Draco وتُعاد صياغة خاماته بـ WebP — 4.5 ميجابايت على الشبكة، يُحمَّل مرة واحدة بتقدّم حقيقي.",
    e2t: "إضاءة الاستوديو",
    e2p: "بيئة PMREM وضوء رئيس وحاشية وتعبئة وظل ملامسة وغبار ناعم — كلها تُعاد إضاءتها عند تبديل السمة.",
    e3t: "مواد حية",
    e3p: "الطلاء والجنوط والمقابس مربوطة بخانات المواد الحقيقية للنموذج وتتحول بتدرّج لوني — بلا إعادة تحميل للنموذج.",
    e4t: "جلد سقف توليدي",
    e4p: "أسطح الكاربون والبانوراما تُولَّد وقت التشغيل: يُمسح السقف شعاعياً من الأعلى ويُعاد تكسوته بنسيج كاربون أو زجاج داكن.",
    shK: "المعارض", shT: "تفضّل بزيارة الشبكة المتخيَّلة.",
    shS: "هذه الأتيليهات غير موجودة أصلاً — وهذا سرّ رونقها الدائم.",
    nlK: "النشرة", nlT: "رسائل من نفق الريح.",
    nlS: "بريد واحد لكل ربع سنة خيالي. إلغاء الاشتراك بنقرة واحدة — الرمز حقيقي والرسائل خيالية.",
    nlPh: "you@studio.example", nlGo: "انضم",
    nlOk: "أنت على القائمة. بنقرة واحدة تُلغي الاشتراك — والرمز حقيقي.",
    nlBad: "هذا العنوان لا يُقَرَّأ. خوادمنا الخيالية صارمة.",
    footStudio: "الاستوديو", footMore: "المزيد", footLegal: "قانوني",
    footA: "استعراض أتيليه. تهيئةك تعيش في هذا المتصفح — وعند إتمام الطلب، في سجل طلبات الأتيليه.",
    fPrivacy: "الخصوصية (خفيفة)", fTerms: "الشروط (خيالية)", fAdmin: "الإدارة",
    fDisc: "نموذج BMW M5 E34 يُحمَّل من ملف GLB مضغوط. جميع الأسعار والتهيئات خيالية للعرض. لا تُباع مركبات حقيقية.",
    cardCta: "هيّئ", baseP: "السيارة الأساسية", plPaint: "الطلاء", plWheels: "العجلات",
    plRoof: "السقف", plTrim: "التشطيب", totalP: "الإجمالي (خيالي)",
    finger: "مفتاح التهيئة", addCart: "أضف إلى السلة", share: "انسخ رابط المشاركة",
    copied: "نُسخ رابط المشاركة", selT: "حُمّل: ", added: "أُضيف إلى السلة.",
    cartT: "قائمة طلباتك", cartEmpty: "قائمتك فارغة — هيّئ شيئاً.",
    subT: "المجموع الفرعي", checkout: "أرسل الطلب إلى الأتيليه", clear: "إفراغ القائمة",
    minus: "&#8722;", remove: "إزالة",
    modalT: "طلب الأتيليه (تجريبي)", mTitle: "أكمل الأوراق",
    fName: "الاسم", fPhone: "الهاتف", kCity: "المدينة (اختياري)", fEmail: "البريد (اختياري)",
    payT: "طلب تجريبي", payP: "هذه محاكاة. لا تُستخدم أي بوابة دفع ولا تُطلب بيانات بطاقات إطلاقاً. يُختم الطلب في سجل الأتيليه ليتواصل معك الفريق.",
    payGo: "اختم طلبي", sim1: "جارٍ الاتصال بسجل الأتيليه…", sim2: "جارٍ ختم تهيئتك…",
    doneT: "أُختم الطلب", doneP: "تهيئتك في سجل الطلبات، وسيتواصل معك الفريق على رقم الهاتف الذي تركته.",
    doneBtn: "عُد إلى الأتيليه",
    orderLookup: "ابحث عن طلب", orderFound: "تم العثور على", orderNotFound: "لا يوجد طلب بهذا الرمز.",
    curC: "العملة: ", themeL: "بدّلنا السمة.", toastWebgl: "لا توجد WebGL هنا — نعرض نموذج الورق.",
    kindC: "كوبيه", kindG: "جراند تورر", kindR: "رودستر", kindW: "تورينغ",
    or: "أو", per: "للوحدة",
    garageT: "جارَجاتي", garageEmpty: "لا تهيئة محفوظة بعد — اضغط زر المنزل في المُهيّئ.",
    garageSave: "احفظ التهيئة الحالية", garageSaved: "حُفظت التهيئة في الجارَج.",
    garageLoad: "حمّل", garageDel: "احذف", garageCmp: "قارن", garageName: "سمِّ هذه التهيئة",
    kioskOn: "وضع الكيوسك", kioskExit: "انقر للخروج",
    shotOk: "حُفظت الصورة.", shotFail: "التصوير غير متاح هنا.",
    leadCta: "اطلب من الأتيليه الاتصال بي", leadOk: "سيتصل بك الأتيليه قريباً.",
    leadBad: "اترك رقماً أو بريداً أولاً.",
    offline: "غير متصل — نستخدم النسخة المخزّنة.",
    nlK2: "", wheelLive: "على النموذج", trimLive: "المقابس + الحافة",
  },
};

export function t(k) {
  const d = TEX[state.prefs.lang] || TEX.en;
  return d[k] != null ? d[k] : (TEX.en[k] != null ? TEX.en[k] : k);
}

export function applyLang() {
  const lang = state.prefs.lang;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  $$("[data-ix]").forEach((n) => { const v = t(n.getAttribute("data-ix")); if (v != null) n.innerHTML = v; });
  $$("[data-ix-ph]").forEach((n) => { const v = t(n.getAttribute("data-ix-ph")); if (v != null) n.setAttribute("placeholder", v); });
  const ls = document.getElementById("langSel");
  if (ls) ls.value = lang;
  document.title = lang === "ar"
    ? "CARX ATELIER — ستوديو BMW M5 E34"
    : "CARX ATELIER — BMW M5 E34 Studio";
}

export function setLang(lang) {
  state.prefs.lang = lang === "ar" ? "ar" : "en";
  savePrefs();
  applyLang();
  document.dispatchEvent(new CustomEvent("carx:lang"));
}

export function toggleLang() { setLang(state.prefs.lang === "ar" ? "en" : "ar"); }
