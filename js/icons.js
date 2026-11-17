// 직접 그린 아이콘 (이모지 대신 사용). icon('이름', 크기px) → SVG 문자열
const ICON_SVG = {
  // 로그인 로고 : 막대그래프 카드
  chart: `<rect x="4" y="4" width="40" height="40" rx="12" fill="#3182F6"/>
    <rect x="12" y="25" width="6" height="11" rx="2" fill="#fff" opacity=".7"/>
    <rect x="21" y="17" width="6" height="19" rx="2" fill="#fff"/>
    <rect x="30" y="12" width="6" height="24" rx="2" fill="#fff" opacity=".85"/>`,

  // 관리자 로고 : 칠판과 그래프
  teacher: `<rect x="4" y="6" width="40" height="28" rx="6" fill="#00A661"/>
    <polyline points="11,26 18,19 24,23 33,13" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="33" cy="13" r="2.6" fill="#fff"/>
    <rect x="22" y="34" width="4" height="6" fill="#8B95A1"/><rect x="14" y="40" width="20" height="3.5" rx="1.75" fill="#8B95A1"/>`,

  // 데이터 6개
  penguins: `<ellipse cx="24" cy="27" rx="13" ry="16" fill="#333D4B"/>
    <ellipse cx="24" cy="30" rx="8.5" ry="12" fill="#fff"/>
    <circle cx="20" cy="18" r="2" fill="#fff"/><circle cx="28" cy="18" r="2" fill="#fff"/>
    <circle cx="20.4" cy="18.3" r="1" fill="#191F28"/><circle cx="28.4" cy="18.3" r="1" fill="#191F28"/>
    <path d="M21 22 L27 22 L24 26 Z" fill="#FF8A00"/>
    <ellipse cx="18.5" cy="43" rx="4" ry="1.8" fill="#FF8A00"/><ellipse cx="29.5" cy="43" rx="4" ry="1.8" fill="#FF8A00"/>
    <path d="M11.5 24 Q6 31 10 37" fill="none" stroke="#333D4B" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M36.5 24 Q42 31 38 37" fill="none" stroke="#333D4B" stroke-width="3.5" stroke-linecap="round"/>`,
  gapminder: `<circle cx="24" cy="24" r="19" fill="#3182F6"/>
    <path d="M12 15 q5 -4 10 -1 q2 5 -3 8 q-2 4 -7 2 q-3 -5 0 -9z" fill="#5BD08F"/>
    <path d="M27 11 q7 0 10 6 q-3 3 -7 2 q-3 -1 -4 -4z" fill="#5BD08F"/>
    <path d="M25 24 q7 -2 11 3 q0 7 -6 11 q-5 -2 -5 -8 q-2 -3 0 -6z" fill="#5BD08F"/>
    <ellipse cx="24" cy="24" rx="8" ry="19" fill="none" stroke="#fff" stroke-width="1.2" opacity=".45"/>
    <line x1="5" y1="24" x2="43" y2="24" stroke="#fff" stroke-width="1.2" opacity=".45"/>`,
  co2: `<circle cx="34" cy="10" r="5" fill="#D1D6DB"/><circle cx="39" cy="7" r="3.5" fill="#E5E8EB"/>
    <rect x="30" y="13" width="7" height="16" rx="1.5" fill="#8B95A1"/>
    <path d="M5 42 V24 L15 30 V24 L25 30 V24 L35 30 V42 Z" fill="#6B7684"/>
    <rect x="5" y="40" width="38" height="4" rx="2" fill="#4E5968"/>
    <rect x="10" y="34" width="5" height="5" rx="1" fill="#FFD43B"/><rect x="19" y="34" width="5" height="5" rx="1" fill="#FFD43B"/><rect x="28" y="34" width="5" height="5" rx="1" fill="#FFD43B"/>`,
  titanic: `<rect x="17" y="9" width="5" height="10" rx="1" fill="#F04452"/><rect x="25" y="9" width="5" height="10" rx="1" fill="#F04452"/>
    <rect x="17" y="9" width="5" height="3" fill="#191F28"/><rect x="25" y="9" width="5" height="3" fill="#191F28"/>
    <rect x="11" y="18" width="25" height="8" rx="2" fill="#fff" stroke="#D1D6DB" stroke-width="1.5"/>
    <path d="M5 26 H43 L38 36 H10 Z" fill="#333D4B"/>
    <circle cx="16" cy="30.5" r="1.4" fill="#fff"/><circle cx="22" cy="30.5" r="1.4" fill="#fff"/><circle cx="28" cy="30.5" r="1.4" fill="#fff"/><circle cx="34" cy="30.5" r="1.4" fill="#fff"/>
    <path d="M3 41 q5 -4 10 0 t10 0 t10 0 t10 0" fill="none" stroke="#3182F6" stroke-width="3" stroke-linecap="round"/>`,
  fastfood: `<path d="M7 21 Q7 7 24 7 Q41 7 41 21 Z" fill="#F5A524"/>
    <ellipse cx="17" cy="13" rx="1.5" ry="1" fill="#FFF4DB"/><ellipse cx="25" cy="11" rx="1.5" ry="1" fill="#FFF4DB"/><ellipse cx="31" cy="15" rx="1.5" ry="1" fill="#FFF4DB"/>
    <path d="M5 23 q3.8 3 7.6 0 t7.6 0 t7.6 0 t7.6 0 t7.6 0" fill="none" stroke="#5BD08F" stroke-width="3.5" stroke-linecap="round"/>
    <rect x="6" y="26" width="36" height="5" rx="1.5" fill="#FFD43B"/>
    <rect x="6" y="30" width="36" height="6" rx="3" fill="#8B4A2B"/>
    <path d="M7 37 H41 Q41 43 34 43 H14 Q7 43 7 37 Z" fill="#F5A524"/>`,
  songs: `<path d="M19 33 V11 L39 7 V29" fill="none" stroke="#7B61FF" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M19 11 L39 7 V13 L19 17 Z" fill="#7B61FF"/>
    <ellipse cx="14" cy="34" rx="6" ry="4.6" fill="#7B61FF" transform="rotate(-18 14 34)"/>
    <ellipse cx="34" cy="30" rx="6" ry="4.6" fill="#A99BFF" transform="rotate(-18 34 30)"/>`,

  // 테스트(연습) 사이트 데이터 6개
  iris: `<path d="M24 44 V26" stroke="#00A661" stroke-width="3" stroke-linecap="round"/>
    <path d="M24 36 q-8 -1 -11 -8 q8 0 11 8z" fill="#5BD08F"/>
    <path d="M24 24 C17 22 14 14 18 7 C22 10 24 16 24 24 Z" fill="#7B61FF"/>
    <path d="M24 24 C31 22 34 14 30 7 C26 10 24 16 24 24 Z" fill="#7B61FF"/>
    <path d="M24 24 C18 26 9 24 6 17 C12 15 19 18 24 24 Z" fill="#A99BFF"/>
    <path d="M24 24 C30 26 39 24 42 17 C36 15 29 18 24 24 Z" fill="#A99BFF"/>
    <circle cx="24" cy="21" r="2.6" fill="#FFD43B"/>`,
  healthexp: `<path d="M24 42 C12 33 5 26 5 17 a9.5 9.5 0 0 1 19 -3 a9.5 9.5 0 0 1 19 3 C43 26 36 33 24 42 Z" fill="#F04452"/>
    <polyline points="8,22 16,22 19,16 24,29 28,19 31,22 40,22" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>`,
  quakes: `<rect x="4" y="8" width="40" height="32" rx="7" fill="#333D4B"/>
    <polyline points="8,24 13,24 16,20 19,28 22,13 26,35 29,18 32,26 35,22 40,24" fill="none" stroke="#FF8A00" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  tips: `<path d="M10 5 H32 V42 l-3.7 -2.5 -3.7 2.5 -3.6 -2.5 -3.7 2.5 -3.6 -2.5 -3.7 2.5 Z" fill="#fff" stroke="#D1D6DB" stroke-width="2" stroke-linejoin="round"/>
    <rect x="14" y="11" width="14" height="2.6" rx="1.3" fill="#B0B8C1"/><rect x="14" y="17" width="10" height="2.6" rx="1.3" fill="#B0B8C1"/><rect x="14" y="23" width="12" height="2.6" rx="1.3" fill="#B0B8C1"/>
    <circle cx="34" cy="32" r="9.5" fill="#FFD43B" stroke="#F5A524" stroke-width="2"/>
    <text x="34" y="36.5" text-anchor="middle" font-size="12" font-weight="700" font-family="sans-serif" fill="#B7791F">$</text>`,
  mpg: `<path d="M8 28 L12 17 Q13.5 13 18 13 H30 Q34.5 13 36 17 L40 28 Z" fill="#3182F6"/>
    <path d="M15 18 Q16 16 18 16 H23 V24 H13.5 Z M26 16 H30 Q32 16 33 18 L34.5 24 H26 Z" fill="#CDE3FF"/>
    <rect x="5" y="25" width="38" height="11" rx="4" fill="#1B64DA"/>
    <circle cx="14" cy="36" r="5" fill="#333D4B"/><circle cx="14" cy="36" r="2" fill="#D1D6DB"/>
    <circle cx="34" cy="36" r="5" fill="#333D4B"/><circle cx="34" cy="36" r="2" fill="#D1D6DB"/>
    <rect x="6" y="28" width="5" height="3" rx="1.5" fill="#FFD43B"/><rect x="37" y="28" width="5" height="3" rx="1.5" fill="#F04452"/>`,
  flights: `<g transform="rotate(-35 24 24)">
    <path d="M22 4 Q24 2 26 4 L27 20 L44 28 V32 L27 27 L26 38 L31 42 V45 L24 43 L17 45 V42 L22 38 L21 27 L4 32 V28 L21 20 Z" fill="#3182F6"/>
    <path d="M23 6 Q24 5 25 6 L25.5 14 H22.5 Z" fill="#CDE3FF"/></g>`,

  // 상태
  done: `<circle cx="24" cy="25" r="16" fill="#00A661"/>
    <polyline points="16,25 22,31 33,19" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="7" cy="11" r="2.2" fill="#FFD43B"/><rect x="38" y="5" width="4" height="4" rx="1" fill="#3182F6" transform="rotate(20 40 7)"/>
    <circle cx="43" cy="20" r="1.8" fill="#F04452"/><rect x="4" y="35" width="4" height="4" rx="1" fill="#7B61FF" transform="rotate(-15 6 37)"/>`,
  lock: `<path d="M15 21 V15 a9 9 0 0 1 18 0 V21" fill="none" stroke="#8B95A1" stroke-width="4"/>
    <rect x="9" y="20" width="30" height="23" rx="6" fill="#4E5968"/>
    <circle cx="24" cy="29.5" r="3.2" fill="#fff"/><rect x="22.6" y="30" width="2.8" height="7" rx="1.4" fill="#fff"/>`,
  warning: `<path d="M24 6 L44 41 H4 Z" fill="#FF8A00" stroke="#FF8A00" stroke-width="3" stroke-linejoin="round"/>
    <rect x="22" y="17" width="4" height="13" rx="2" fill="#fff"/><circle cx="24" cy="35" r="2.3" fill="#fff"/>`,
  screen: `<rect x="4" y="8" width="40" height="27" rx="5" fill="#3182F6"/>
    <rect x="20" y="35" width="8" height="5" fill="#8B95A1"/><rect x="13" y="40" width="22" height="3.5" rx="1.75" fill="#8B95A1"/>
    <polyline points="11,19 11,14 16,14" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    <polyline points="32,14 37,14 37,19" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    <polyline points="11,24 11,29 16,29" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    <polyline points="32,29 37,29 37,24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  error: `<circle cx="24" cy="24" r="19" fill="#F04452"/>
    <rect x="22" y="13" width="4" height="15" rx="2" fill="#fff"/><circle cx="24" cy="34" r="2.4" fill="#fff"/>`,
  map: `<path d="M24 44 C24 44 10 29 10 19 a14 14 0 0 1 28 0 C38 29 24 44 24 44 Z" fill="#F04452"/>
    <circle cx="24" cy="19" r="5.5" fill="#fff"/>`,
  check: `<circle cx="24" cy="24" r="20" fill="#00A661"/>
    <polyline points="14,24 21,31 34,17" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`,
};

function icon(name, size = 48, cls = '') {
  return `<svg class="ico ${cls}" width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true">${ICON_SVG[name] || ''}</svg>`;
}
// 문서 안의 <i data-icon="이름" data-size="크기"></i> 를 아이콘으로 바꿈
function fillIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon, Number(el.dataset.size) || 48); });
}
