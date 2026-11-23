// 직접 그린 아이콘 (이모지 대신 사용). icon('이름', 크기px) → SVG 문자열
const ICON_SVG = {
  // 로고 : 헌장 문서 + 방패
  charter: `<rect x="6" y="4" width="30" height="38" rx="7" fill="#3182F6"/>
    <rect x="12" y="12" width="16" height="3.2" rx="1.6" fill="#fff"/><rect x="12" y="19" width="12" height="3.2" rx="1.6" fill="#fff" opacity=".75"/>
    <rect x="12" y="26" width="9" height="3.2" rx="1.6" fill="#fff" opacity=".55"/>
    <path d="M35 21 L44 24.5 V31 C44 37.5 39.5 41.5 35 43 C30.5 41.5 26 37.5 26 31 V24.5 Z" fill="#00A661" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/>
    <polyline points="31,31.5 34,34.5 39.5,28.5" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>`,
  // 관리 화면 로고 : 문서와 펜
  teacher: `<rect x="5" y="5" width="30" height="38" rx="7" fill="#00A661"/>
    <rect x="11" y="13" width="18" height="3.2" rx="1.6" fill="#fff"/><rect x="11" y="20" width="14" height="3.2" rx="1.6" fill="#fff" opacity=".75"/>
    <rect x="11" y="27" width="10" height="3.2" rx="1.6" fill="#fff" opacity=".55"/>
    <g transform="rotate(40 36 30)"><rect x="32.5" y="14" width="7" height="24" rx="2" fill="#FFD43B"/><path d="M32.5 38 H39.5 L36 44 Z" fill="#333D4B"/><rect x="32.5" y="14" width="7" height="4" rx="1.5" fill="#F04452"/></g>`,
  solo: `<circle cx="24" cy="16" r="8" fill="#3182F6"/><path d="M9 42 C9 32 15.5 27 24 27 C32.5 27 39 32 39 42 Z" fill="#3182F6"/>`,
  group: `<circle cx="15" cy="17" r="6" fill="#90C2FF"/><path d="M4 40 C4 32 8.5 27.5 15 27.5 C21.5 27.5 26 32 26 40 Z" fill="#90C2FF"/>
    <circle cx="31" cy="15" r="7" fill="#3182F6"/><path d="M18 42 C18 33 23.5 27 31 27 C38.5 27 44 33 44 42 Z" fill="#3182F6"/>`,
  check: `<circle cx="24" cy="24" r="20" fill="#00A661"/><polyline points="15,24.5 21.5,31 33.5,18" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>`,
  lock: `<path d="M15 21 V15 a9 9 0 0 1 18 0 V21" fill="none" stroke="#8B95A1" stroke-width="4"/>
    <rect x="9" y="20" width="30" height="23" rx="6" fill="#8B95A1"/><circle cx="24" cy="30" r="3" fill="#fff"/><rect x="22.5" y="31" width="3" height="6" rx="1.5" fill="#fff"/>`,
  warning: `<path d="M24 6 L44 41 H4 Z" fill="#FF8A00" stroke="#FF8A00" stroke-width="3" stroke-linejoin="round"/>
    <rect x="22" y="17" width="4" height="13" rx="2" fill="#fff"/><circle cx="24" cy="35" r="2.4" fill="#fff"/>`,
  sparkle: `<path d="M22 6 C23.5 16 27 19.5 37 21 C27 22.5 23.5 26 22 36 C20.5 26 17 22.5 7 21 C17 19.5 20.5 16 22 6 Z" fill="#7B61FF"/>
    <path d="M37 30 C37.7 34.5 39.5 36.3 44 37 C39.5 37.7 37.7 39.5 37 44 C36.3 39.5 34.5 37.7 30 37 C34.5 36.3 36.3 34.5 37 30 Z" fill="#A99BFF"/>`,
  star: `<path d="M24 5 L29.6 17.3 L43 18.7 L33 27.8 L35.8 41 L24 34.3 L12.2 41 L15 27.8 L5 18.7 L18.4 17.3 Z" fill="#FFC342" stroke="#FFC342" stroke-width="2" stroke-linejoin="round"/>`,
  starOff: `<path d="M24 5 L29.6 17.3 L43 18.7 L33 27.8 L35.8 41 L24 34.3 L12.2 41 L15 27.8 L5 18.7 L18.4 17.3 Z" fill="none" stroke="#B0B8C1" stroke-width="3" stroke-linejoin="round"/>`,
  qr: `<rect x="5" y="5" width="15" height="15" rx="3" fill="none" stroke="#191F28" stroke-width="3.5"/><rect x="10.5" y="10.5" width="4" height="4" fill="#191F28"/>
    <rect x="28" y="5" width="15" height="15" rx="3" fill="none" stroke="#191F28" stroke-width="3.5"/><rect x="33.5" y="10.5" width="4" height="4" fill="#191F28"/>
    <rect x="5" y="28" width="15" height="15" rx="3" fill="none" stroke="#191F28" stroke-width="3.5"/><rect x="10.5" y="33.5" width="4" height="4" fill="#191F28"/>
    <rect x="28" y="28" width="6" height="6" fill="#191F28"/><rect x="37" y="37" width="6" height="6" fill="#191F28"/><rect x="37" y="28" width="6" height="4" fill="#191F28"/><rect x="28" y="38" width="5" height="5" fill="#191F28"/>`,
  copy: `<rect x="15" y="13" width="24" height="29" rx="5" fill="none" stroke="currentColor" stroke-width="4"/><path d="M10 34 V10 a4 4 0 0 1 4 -4 H30" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>`,
};

function icon(name, size = 48, cls = '') {
  return `<svg class="ico ${cls}" width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true">${ICON_SVG[name] || ''}</svg>`;
}
function fillIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon, Number(el.dataset.size) || 48); });
}
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
