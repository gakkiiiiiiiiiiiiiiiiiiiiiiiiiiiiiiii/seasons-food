import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const outDir = new URL('../public/assets/season-bg/', import.meta.url)
mkdirSync(outDir, { recursive: true })

const palette = {
  navy: '#17243F',
  blue: '#398DEA',
  royal: '#2D6BD2',
  mint: '#8FE6BC',
  cyan: '#6CB3C7',
  cream: '#F3F9F0',
  sand: '#E3C5A7',
  pink: '#C07DBB',
  leaf: '#7CCF95',
  lime: '#BEEA86',
  amber: '#F5B65B',
  coral: '#F08A72',
  violet: '#8C72D6'
}

const seasons = [
  { file: '01-xiaohan.svg', mood: 'winter', subject: 'snowdrop' },
  { file: '02-lichun.svg', mood: 'spring', subject: 'peach' },
  { file: '03-jingzhe.svg', mood: 'spring', subject: 'sprout' },
  { file: '04-qingming.svg', mood: 'spring', subject: 'rain' },
  { file: '05-lixia.svg', mood: 'summer', subject: 'lotus' },
  { file: '06-mangzhong.svg', mood: 'summer', subject: 'grain' },
  { file: '07-xiaoshu.svg', mood: 'summer', subject: 'melon' },
  { file: '08-liqiu.svg', mood: 'autumn', subject: 'leaf' },
  { file: '09-bailu.svg', mood: 'autumn', subject: 'pear' },
  { file: '10-hanlu.svg', mood: 'autumn', subject: 'persimmon' },
  { file: '11-lidong.svg', mood: 'winter', subject: 'frost' },
  { file: '12-daxue.svg', mood: 'winter', subject: 'snow' }
]

function svgWrap(id, mood, body) {
  const moodStops = {
    spring: ['#F3F9F0', '#8FE6BC', '#C07DBB'],
    summer: ['#F3F9F0', '#6CB3C7', '#8FE6BC'],
    autumn: ['#F8F0D8', '#E3C5A7', '#F5B65B'],
    winter: ['#F3F9F0', '#6CB3C7', '#8C72D6']
  }[mood]

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="512" viewBox="0 0 1024 512" fill="none">
  <defs>
    <radialGradient id="${id}-glow" cx="70%" cy="40%" r="52%">
      <stop offset="0" stop-color="${moodStops[1]}" stop-opacity=".46"/>
      <stop offset=".48" stop-color="${moodStops[2]}" stop-opacity=".16"/>
      <stop offset="1" stop-color="${moodStops[0]}" stop-opacity="0"/>
    </radialGradient>
    <filter id="${id}-soft" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8"/>
    </filter>
    <filter id="${id}-grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency=".95" numOctaves="3" seed="${id.length + 17}"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer>
        <feFuncA type="table" tableValues="0 .08"/>
      </feComponentTransfer>
    </filter>
    <linearGradient id="${id}-stroke" x1="460" y1="80" x2="930" y2="430" gradientUnits="userSpaceOnUse">
      <stop stop-color="${palette.navy}" stop-opacity=".72"/>
      <stop offset=".45" stop-color="${palette.cyan}" stop-opacity=".72"/>
      <stop offset="1" stop-color="${palette.pink}" stop-opacity=".54"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="512" fill="url(#${id}-glow)" opacity=".86"/>
  <g opacity=".98" transform="translate(-156 -54) scale(1.22)">${body}</g>
  <rect width="1024" height="512" filter="url(#${id}-grain)" opacity=".58"/>
</svg>`
}

const line = (d, color = `url(#ID-stroke)`, w = 9, opacity = 1) =>
  `<path d="${d}" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}"/>`

const fill = (d, color, opacity = 1) =>
  `<path d="${d}" fill="${color}" opacity="${opacity}"/>`

const ellipse = (cx, cy, rx, ry, color, opacity = 1, extra = '') =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${color}" opacity="${opacity}" ${extra}/>`

function flower(cx, cy, color, scale = 1) {
  return `<g transform="translate(${cx} ${cy}) scale(${scale})">
    ${ellipse(0, -20, 15, 26, color, .72, 'transform="rotate(0)"')}
    ${ellipse(21, -4, 15, 26, color, .72, 'transform="rotate(58)"')}
    ${ellipse(13, 22, 15, 26, color, .72, 'transform="rotate(136)"')}
    ${ellipse(-13, 22, 15, 26, color, .72, 'transform="rotate(224)"')}
    ${ellipse(-21, -4, 15, 26, color, .72, 'transform="rotate(302)"')}
    ${ellipse(0, 2, 10, 10, palette.amber, .86)}
  </g>`
}

function leaf(cx, cy, rotate = 0, scale = 1, color = palette.mint) {
  return `<g transform="translate(${cx} ${cy}) rotate(${rotate}) scale(${scale})">
    ${fill('M0 0 C42 -42 88 -42 118 0 C83 30 40 34 0 0Z', color, .5)}
    ${line('M10 -1 C44 0 75 0 110 0', palette.navy, 4, .34)}
  </g>`
}

function snowflake(cx, cy, scale = 1) {
  return `<g transform="translate(${cx} ${cy}) scale(${scale})" opacity=".68">
    ${line('M-30 0H30', palette.cyan, 4, .68)}
    ${line('M0 -30V30', palette.cyan, 4, .68)}
    ${line('M-22 -22L22 22', palette.violet, 3, .46)}
    ${line('M22 -22L-22 22', palette.violet, 3, .46)}
  </g>`
}

function scene(subject) {
  const idColor = 'url(#ID-stroke)'
  const ground = `${line('M530 410 C610 376 704 382 772 420 C838 458 910 452 964 414', palette.sand, 11, .55)}
    ${line('M548 432 C628 408 712 414 788 444 C858 472 914 464 960 440', palette.mint, 4, .28)}`

  const scenes = {
    snowdrop: `${ground}
      ${snowflake(690, 110, 1.1)}${snowflake(850, 152, .75)}
      ${line('M710 382 C708 304 730 246 786 198', idColor, 7, .62)}
      ${line('M800 372 C786 300 806 238 858 184', idColor, 7, .62)}
      ${leaf(668, 318, -18, .62, palette.cyan)}${leaf(812, 296, 24, .58, palette.mint)}
      ${ellipse(784, 184, 34, 48, palette.cream, .72, 'transform="rotate(-24 784 184)"')}
      ${ellipse(850, 164, 30, 44, palette.cream, .66, 'transform="rotate(18 850 164)"')}`,
    peach: `${ground}
      ${line('M576 386 C654 286 734 220 888 150', idColor, 8, .52)}
      ${line('M640 326 C712 316 770 284 832 222', palette.cyan, 4, .38)}
      ${flower(642, 306, palette.pink, 1)}${flower(742, 248, palette.pink, .9)}${flower(846, 178, '#F7B7C8', .95)}
      ${leaf(698, 292, 26, .44, palette.mint)}${leaf(792, 228, -18, .4, palette.lime)}`,
    sprout: `${ground}
      ${line('M742 398 C724 338 730 276 760 220', idColor, 8, .56)}
      ${line('M792 398 C808 324 798 260 762 204', idColor, 7, .44)}
      ${leaf(646, 272, -20, .72, palette.mint)}${leaf(770, 236, 14, .78, palette.leaf)}
      ${leaf(808, 304, 34, .6, palette.lime)}
      ${line('M600 180 C672 126 780 124 850 174', palette.blue, 5, .28)}
      ${line('M820 86 C786 128 766 156 756 198', palette.violet, 5, .35)}`,
    rain: `${ground}
      ${line('M560 374 C636 292 712 222 868 146', idColor, 7, .44)}
      ${leaf(664, 304, 12, .48, palette.mint)}${leaf(790, 226, -18, .44, palette.leaf)}
      ${line('M654 94 C640 126 626 158 614 190', palette.blue, 5, .42)}
      ${line('M746 72 C728 116 710 154 690 198', palette.cyan, 5, .42)}
      ${line('M846 108 C826 144 810 178 794 214', palette.violet, 4, .34)}
      ${ellipse(730, 190, 96, 42, palette.cream, .24, 'filter="url(#ID-soft)"')}`,
    lotus: `${ground}
      ${line('M650 390 C680 332 712 288 760 246', idColor, 8, .42)}
      ${ellipse(760, 242, 58, 22, palette.mint, .52, 'transform="rotate(-12 760 242)"')}
      ${ellipse(838, 254, 54, 20, palette.leaf, .42, 'transform="rotate(18 838 254)"')}
      ${flower(780, 188, '#F1A7CF', 1.05)}
      ${line('M560 332 C650 300 786 304 916 338', palette.blue, 5, .22)}
      ${line('M586 356 C682 334 800 338 930 364', palette.cyan, 4, .24)}`,
    grain: `${ground}
      ${line('M712 396 C704 300 720 214 766 110', idColor, 7, .46)}
      ${line('M810 392 C802 300 816 216 858 120', idColor, 7, .42)}
      ${[0,1,2,3,4].map((n) => ellipse(748 + n * 6, 176 + n * 28, 18, 32, palette.sand, .62, `transform="rotate(-34 ${748 + n * 6} ${176 + n * 28})"`)).join('')}
      ${[0,1,2,3,4].map((n) => ellipse(836 + n * 6, 176 + n * 28, 18, 32, palette.lime, .45, `transform="rotate(32 ${836 + n * 6} ${176 + n * 28})"`)).join('')}
      ${leaf(654, 326, -26, .58, palette.mint)}${leaf(846, 332, 24, .5, palette.leaf)}`,
    melon: `${ground}
      ${line('M562 304 C668 210 808 210 936 300', idColor, 6, .38)}
      ${line('M588 318 C702 252 804 260 918 334', palette.cyan, 4, .32)}
      ${ellipse(780, 294, 86, 58, palette.lime, .62, 'transform="rotate(-7 780 294)"')}
      ${line('M714 284 C752 318 808 322 852 286', palette.navy, 5, .22)}
      ${leaf(650, 226, -20, .54, palette.mint)}${leaf(886, 244, 28, .5, palette.leaf)}`,
    leaf: `${ground}
      ${leaf(616, 260, -34, 1, palette.amber)}${leaf(748, 226, 12, .86, palette.coral)}${leaf(864, 282, 34, .72, palette.sand)}
      ${line('M560 180 C650 250 730 324 900 374', palette.violet, 4, .22)}
      ${ellipse(780, 248, 150, 96, palette.amber, .12, 'filter="url(#ID-soft)"')}`,
    pear: `${ground}
      ${line('M774 138 C758 178 750 214 750 250', idColor, 6, .42)}
      ${ellipse(762, 288, 78, 96, '#DDEB9D', .7)}
      ${ellipse(748, 236, 48, 54, '#EAF2B2', .62)}
      ${leaf(790, 150, 16, .42, palette.mint)}
      ${snowflake(632, 176, .45)}${snowflake(884, 214, .36)}
      ${ellipse(740, 300, 120, 108, palette.mint, .12, 'filter="url(#ID-soft)"')}`,
    persimmon: `${ground}
      ${line('M622 158 C704 112 812 116 884 178', idColor, 6, .42)}
      ${ellipse(760, 286, 76, 70, palette.coral, .72)}
      ${ellipse(764, 260, 54, 36, palette.amber, .34)}
      ${leaf(718, 218, -30, .38, palette.leaf)}${leaf(790, 216, 28, .36, palette.mint)}
      ${line('M604 118 C652 86 718 80 780 108', palette.pink, 4, .28)}`,
    frost: `${ground}
      ${line('M586 348 C690 276 748 206 830 116', idColor, 7, .44)}
      ${line('M690 278 C736 294 780 302 836 298', palette.cyan, 4, .35)}
      ${snowflake(664, 182, .58)}${snowflake(800, 126, .44)}${snowflake(882, 246, .38)}
      ${leaf(752, 250, 12, .34, '#D8E8FB')} ${leaf(830, 190, -18, .3, palette.mint)}`,
    snow: `${ground}
      ${line('M750 400 C748 308 750 218 762 120', idColor, 8, .5)}
      ${leaf(654, 220, -14, .52, '#DCEAFB')} ${leaf(688, 290, -26, .5, palette.cyan)}
      ${leaf(804, 206, 22, .5, '#DCEAFB')} ${leaf(836, 292, 30, .48, palette.mint)}
      ${snowflake(610, 138, .5)}${snowflake(902, 172, .5)}${snowflake(766, 96, .36)}
      ${ellipse(760, 390, 168, 36, palette.cream, .42)}`
  }

  return scenes[subject].replaceAll('url(#ID-stroke)', 'url(#season-stroke)').replaceAll('filter="url(#ID-soft)"', 'filter="url(#season-soft)"')
}

for (const item of seasons) {
  const safeId = `s${item.file.replace(/\W+/g, '-')}`
  const body = scene(item.subject)
    .replaceAll('url(#season-stroke)', `url(#${safeId}-stroke)`)
    .replaceAll('filter="url(#season-soft)"', `filter="url(#${safeId}-soft)"`)
  const svg = svgWrap(safeId, item.mood, body)
  writeFileSync(join(outDir.pathname, item.file), svg)
}

console.log(`Generated ${seasons.length} poetic healing season SVGs in ${outDir.pathname}`)
