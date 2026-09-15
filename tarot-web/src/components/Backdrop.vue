<script setup lang="ts">
// 全局氛围背景（08 §五）：星尘呼吸 + 星云薄雾 + 星座连线 + 流星 + 仪式回应层。
// 纪律：零图片资产（星座为内联 SVG 代码绘制）；只动 opacity/transform（例外：星座入场
// stroke-dashoffset 描画为一次性 SVG 属性动画，播完即静止，已记入 08）；坐标手写固定（不随机）
</script>

<template>
  <div class="backdrop" aria-hidden="true">
    <div class="nebula nebula-a"></div>
    <div class="nebula nebula-b"></div>
    <div class="sky"></div>
    <!-- 洗牌蓄力星（sky-charge）：第三层快呼吸亮星，只在洗牌 stage 淡入 -->
    <div class="charge-sky"></div>

    <!-- 星座骨架（08 §五·修订）：双鱼（月亮牌 XVIII 对应，右上）/ 水瓶（星星牌 XVII 对应，左下） -->
    <svg class="constellation c-pisces" viewBox="0 0 100 78">
      <g class="clines">
        <polyline points="6,40 22,62 44,68" />
        <polyline points="60,10 76,16 68,32" />
        <line x1="68" y1="32" x2="48" y2="46" />
        <line x1="48" y1="46" x2="44" y2="68" />
      </g>
      <g class="cnodes">
        <circle cx="6" cy="40" r="1.2" />
        <circle cx="22" cy="62" r="1.1" />
        <circle cx="44" cy="68" r="1.3" />
        <circle cx="60" cy="10" r="1.1" />
        <circle cx="76" cy="16" r="1.2" />
        <circle cx="68" cy="32" r="1" />
        <circle class="lead" cx="48" cy="46" r="1.8" />
      </g>
    </svg>
    <svg class="constellation c-aquarius" viewBox="0 0 100 70">
      <g class="clines">
        <polyline points="8,22 26,38 14,54 34,64" />
        <polyline points="56,12 70,20 60,36" />
        <line x1="26" y1="38" x2="56" y2="12" />
      </g>
      <g class="cnodes">
        <circle cx="8" cy="22" r="1.1" />
        <circle cx="26" cy="38" r="1.2" />
        <circle cx="14" cy="54" r="1" />
        <circle cx="34" cy="64" r="1.1" />
        <circle class="lead" cx="56" cy="12" r="1.7" />
        <circle cx="70" cy="20" r="1.2" />
        <circle cx="60" cy="36" r="1.1" />
      </g>
    </svg>

    <!-- 流星（08 §五·修订）：3 条错周期，负延迟让首屏大概率见到一条；只在顶部 30% 内活动
         +4 条蓄力流星（sky-charge 限定，短周期）：洗牌态密度 ~1.4s 一颗，常态/降级不渲染 -->
    <div class="meteors">
      <i
        class="meteor"
        style="--mx: 8vw; --my: 7vh; --deg: 38deg; --dx: 1.05rem; --dy: 0.82rem; --period: 11s; --delay: -3s"
      ></i>
      <i
        class="meteor"
        style="--mx: 56vw; --my: 4vh; --deg: 42deg; --dx: 0.9rem; --dy: 0.81rem; --period: 14s; --delay: -9s"
      ></i>
      <i
        class="meteor"
        style="--mx: 30vw; --my: 20vh; --deg: 35deg; --dx: 0.8rem; --dy: 0.56rem; --period: 17s; --delay: -13s"
      ></i>
      <i
        class="meteor charge"
        style="--mx: 18vw; --my: 14vh; --deg: 40deg; --dx: 0.95rem; --dy: 0.8rem; --period: 7.5s; --delay: -2s"
      ></i>
      <i
        class="meteor charge"
        style="--mx: 72vw; --my: 16vh; --deg: 36deg; --dx: 1rem; --dy: 0.73rem; --period: 8s; --delay: -5s"
      ></i>
      <i
        class="meteor charge"
        style="--mx: 44vw; --my: 6vh; --deg: 43deg; --dx: 0.88rem; --dy: 0.82rem; --period: 8.5s; --delay: -7s"
      ></i>
      <i
        class="meteor charge"
        style="--mx: 86vw; --my: 24vh; --deg: 33deg; --dx: 1rem; --dy: 0.65rem; --period: 9s; --delay: -3.5s"
      ></i>
    </div>

    <div class="glow-gold"></div>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

/* L3 星云薄雾：静态 radial-gradient 软边（不 blur，零重绘），克制档低透明度 */
.nebula {
  position: absolute;
  border-radius: 50%;
}
.nebula-a {
  width: 92vw;
  height: 58vh;
  left: -26vw;
  top: 5vh;
  background: radial-gradient(closest-side, rgba(94, 74, 148, 0.13), transparent 70%);
}
.nebula-b {
  width: 82vw;
  height: 54vh;
  right: -22vw;
  bottom: -10vh;
  background: radial-gradient(closest-side, rgba(41, 60, 110, 0.11), transparent 70%);
}

/* L2 星尘：两档星点（亮 25 / 暗 35）由伪元素多重 box-shadow 承载，错相呼吸（只动 opacity）。
   父层 .sky 的 opacity 留给 sky-flare 全局增亮用，避免与 keyframe 冲突 */
.sky {
  position: absolute;
  inset: 0;
  opacity: 0.6;
  transition: opacity var(--dur-slow) ease;
}
.sky::before,
.sky::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 1px;
  height: 1px;
  border-radius: 50%;
  background: transparent;
}
.sky::before {
  box-shadow:
    4vw 9vh 1px 0.5px rgba(240, 217, 140, 0.85),
    12vw 3vh 0 0.5px rgba(240, 217, 140, 0.7),
    21vw 14vh 1px 0.5px rgba(240, 217, 140, 0.8),
    30vw 6vh 0 0.5px rgba(240, 217, 140, 0.6),
    38vw 21vh 1.5px 0.5px rgba(240, 217, 140, 0.9),
    47vw 4vh 0 0.5px rgba(240, 217, 140, 0.65),
    55vw 17vh 1px 0.5px rgba(240, 217, 140, 0.75),
    63vw 8vh 0 0.5px rgba(240, 217, 140, 0.6),
    71vw 19vh 1.5px 0.5px rgba(240, 217, 140, 0.85),
    79vw 5vh 0 0.5px rgba(240, 217, 140, 0.7),
    87vw 15vh 1px 0.5px rgba(240, 217, 140, 0.8),
    95vw 10vh 0 0.5px rgba(240, 217, 140, 0.6),
    8vw 31vh 0 0.5px rgba(240, 217, 140, 0.6),
    18vw 40vh 1px 0.5px rgba(240, 217, 140, 0.8),
    27vw 33vh 0 0.5px rgba(240, 217, 140, 0.65),
    36vw 44vh 1.5px 0.5px rgba(240, 217, 140, 0.85),
    46vw 36vh 0 0.5px rgba(240, 217, 140, 0.7),
    56vw 47vh 1px 0.5px rgba(240, 217, 140, 0.75),
    66vw 39vh 0 0.5px rgba(240, 217, 140, 0.6),
    76vw 50vh 1px 0.5px rgba(240, 217, 140, 0.8),
    86vw 42vh 0 0.5px rgba(240, 217, 140, 0.65),
    6vw 62vh 1px 0.5px rgba(240, 217, 140, 0.75),
    16vw 71vh 0 0.5px rgba(240, 217, 140, 0.6),
    26vw 64vh 1px 0.5px rgba(240, 217, 140, 0.8),
    37vw 74vh 0 0.5px rgba(240, 217, 140, 0.65);
  animation: twinkleA 14s ease-in-out infinite alternate;
}
.sky::after {
  box-shadow:
    2vw 7vh 0 0 rgba(155, 147, 168, 0.55),
    7vw 22vh 0.5px 0 rgba(155, 147, 168, 0.5),
    14vw 11vh 0 0 rgba(155, 147, 168, 0.45),
    19vw 28vh 0 0 rgba(155, 147, 168, 0.5),
    25vw 8vh 0.5px 0 rgba(155, 147, 168, 0.4),
    32vw 25vh 0 0 rgba(155, 147, 168, 0.55),
    41vw 13vh 0 0 rgba(155, 147, 168, 0.45),
    44vw 34vh 0.5px 0 rgba(155, 147, 168, 0.5),
    52vw 9vh 0 0 rgba(155, 147, 168, 0.4),
    59vw 27vh 0 0 rgba(155, 147, 168, 0.55),
    67vw 14vh 0.5px 0 rgba(155, 147, 168, 0.45),
    74vw 30vh 0 0 rgba(155, 147, 168, 0.5),
    82vw 12vh 0 0 rgba(155, 147, 168, 0.4),
    90vw 26vh 0.5px 0 rgba(155, 147, 168, 0.5),
    96vw 19vh 0 0 rgba(155, 147, 168, 0.45),
    3vw 45vh 0 0 rgba(155, 147, 168, 0.45),
    11vw 56vh 0.5px 0 rgba(155, 147, 168, 0.5),
    23vw 49vh 0 0 rgba(155, 147, 168, 0.4),
    29vw 68vh 0 0 rgba(155, 147, 168, 0.5),
    34vw 58vh 0.5px 0 rgba(155, 147, 168, 0.45),
    43vw 79vh 0 0 rgba(155, 147, 168, 0.4),
    49vw 55vh 0 0 rgba(155, 147, 168, 0.5),
    58vw 66vh 0.5px 0 rgba(155, 147, 168, 0.45),
    62vw 85vh 0 0 rgba(155, 147, 168, 0.4),
    69vw 58vh 0 0 rgba(155, 147, 168, 0.5),
    77vw 71vh 0.5px 0 rgba(155, 147, 168, 0.45),
    84vw 62vh 0 0 rgba(155, 147, 168, 0.4),
    92vw 76vh 0 0 rgba(155, 147, 168, 0.5),
    97vw 68vh 0.5px 0 rgba(155, 147, 168, 0.45),
    5vw 88vh 0 0 rgba(155, 147, 168, 0.4),
    13vw 95vh 0 0 rgba(155, 147, 168, 0.45),
    48vw 90vh 0 0 rgba(155, 147, 168, 0.4),
    72vw 92vh 0 0 rgba(155, 147, 168, 0.45),
    89vw 86vh 0 0 rgba(155, 147, 168, 0.4);
  animation: twinkleB 19s ease-in-out infinite alternate;
}
@keyframes twinkleA {
  from { opacity: 0.5; }
  to { opacity: 1; }
}
@keyframes twinkleB {
  from { opacity: 1; }
  to { opacity: 0.45; }
}

/* 洗牌蓄力星（sky-charge）：第三层 ~20 颗金亮星（含 3 颗光晕大星），
   快呼吸 6s——不动已有两层（改时长会跳相位），蓄力星本身就是"闪耀变强"的一部分。
   常态 opacity 0 不显，sky-charge 下淡入 */
.charge-sky {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 1.1s ease;
  pointer-events: none;
}
.charge-sky::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 1px;
  height: 1px;
  border-radius: 50%;
  background: transparent;
  box-shadow:
    5vw 5vh 1px 0.5px rgba(248, 236, 180, 0.9),
    11vw 18vh 0 0.5px rgba(248, 236, 180, 0.7),
    16vw 36vh 1px 0.5px rgba(248, 236, 180, 0.8),
    24vw 10vh 0 0.5px rgba(248, 236, 180, 0.65),
    28vw 27vh 1.5px 1px rgba(252, 242, 200, 0.95),
    34vw 55vh 0 0.5px rgba(248, 236, 180, 0.7),
    40vw 30vh 1px 0.5px rgba(248, 236, 180, 0.85),
    48vw 12vh 0 0.5px rgba(248, 236, 180, 0.6),
    52vw 44vh 1px 0.5px rgba(248, 236, 180, 0.8),
    60vw 22vh 2px 1.5px rgba(252, 242, 200, 0.95),
    64vw 51vh 0 0.5px rgba(248, 236, 180, 0.65),
    69vw 8vh 1px 0.5px rgba(248, 236, 180, 0.8),
    78vw 34vh 0 0.5px rgba(248, 236, 180, 0.7),
    82vw 14vh 1px 0.5px rgba(248, 236, 180, 0.85),
    90vw 42vh 0 0.5px rgba(248, 236, 180, 0.65),
    94vw 28vh 1.5px 1px rgba(252, 242, 200, 0.9),
    3vw 48vh 0 0.5px rgba(248, 236, 180, 0.6),
    21vw 62vh 1px 0.5px rgba(248, 236, 180, 0.75),
    45vw 72vh 0 0.5px rgba(248, 236, 180, 0.65),
    58vw 84vh 1px 0.5px rgba(248, 236, 180, 0.7);
  animation: twinkleC 6s ease-in-out infinite alternate;
  animation-delay: -2s; /* 与 A/B 错相 */
}
@keyframes twinkleC {
  from { opacity: 0.55; }
  to { opacity: 1; }
}

/* L2b 星座骨架（08 §五·修订）：金线极淡（0.22）+ 节点略亮于星尘；
   入场 stroke-dashoffset 一次性描画 ~1.6s（"星空显影"，纪律显式例外），之后常驻静止 */
.constellation {
  position: absolute;
  overflow: visible;
}
.c-pisces {
  right: 3vw;
  top: 8vh;
  width: 1.05rem;
}
.c-aquarius {
  left: 4vw;
  bottom: 13vh;
  width: 0.88rem;
}
.clines * {
  fill: none;
  stroke: var(--gold);
  stroke-width: 1;
  stroke-linecap: round;
  stroke-opacity: 0.22;
  stroke-dasharray: 140;
  stroke-dashoffset: 140;
  animation: drawLine 1.6s ease-out forwards;
  transition: stroke-opacity var(--dur-slow) ease; /* sky-flare 增亮联动 */
  animation-delay: var(--ld, 0.45s);
}
.c-pisces .clines * {
  --ld: 0.45s;
}
.c-aquarius .clines * {
  --ld: 0.7s;
}
.clines *:nth-of-type(2) { animation-delay: calc(var(--ld, 0.45s) + 0.18s); }
.clines *:nth-of-type(3) { animation-delay: calc(var(--ld, 0.45s) + 0.36s); }
.clines *:nth-of-type(4) { animation-delay: calc(var(--ld, 0.45s) + 0.54s); }
@keyframes drawLine {
  to { stroke-dashoffset: 0; }
}
.cnodes circle {
  fill: var(--gold-bright);
  opacity: 0; /* twinkle delay 到点前不显，delay 后 0.25→0.75 呼吸（点亮感） */
  animation: nodeTwinkle 4.6s ease-in-out infinite alternate;
  animation-delay: var(--nd, 1.5s);
}
.c-pisces .cnodes circle { --nd: 1.5s; }
.c-aquarius .cnodes circle { --nd: 1.8s; }
.cnodes circle:nth-child(2n) {
  animation-delay: calc(var(--nd, 1.5s) + 1.6s); /* 偶数节点错相 */
}
.cnodes .lead {
  fill: #f8f0d0;
  filter: drop-shadow(0 0 3px rgba(240, 217, 140, 0.8));
}
@keyframes nodeTwinkle {
  from { opacity: 0.25; }
  to { opacity: 0.75; }
}

/* L2c 流星（08 §五·修订）：头亮尾暗渐变线 + 头部光点，rotate 与 translate 同向；
   周期前 ~15%（约 1.4s）在途，其余时间 opacity 0 静默 */
.meteor {
  position: absolute;
  left: var(--mx);
  top: var(--my);
  width: 0.7rem;
  height: 1px;
  border-radius: 1px;
  background: linear-gradient(90deg, transparent, rgba(248, 244, 230, 0.9));
  opacity: 0;
  animation: meteorFly var(--period) linear infinite;
  animation-delay: var(--delay);
  will-change: transform, opacity;
}
.meteor::after {
  content: '';
  position: absolute;
  right: -1px;
  top: 50%;
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: #fff8e0;
  box-shadow: 0 0 5px 1px rgba(255, 246, 210, 0.85);
  transform: translateY(-50%);
}
@keyframes meteorFly {
  0% { transform: translate(0, 0) rotate(var(--deg)); opacity: 0; }
  3% { opacity: 1; }
  9% { opacity: 0.85; }
  15% { transform: translate(var(--dx), var(--dy)) rotate(var(--deg)); opacity: 0; }
  100% { transform: translate(var(--dx), var(--dy)) rotate(var(--deg)); opacity: 0; }
}

/* 洗牌蓄力回应（sky-charge）：进洗牌 stage 挂 body——蓄力流星解禁、蓄力星淡入、
   主星尘层增亮。--charge（0-1）由 DrawView 随蓄力进度同步到 body，
   按住时星空渐进亮至 0.95（与 riffle 摆幅同源）；松手达标接 sky-flare（0.5 线在后面，胜出） */
.meteor.charge {
  display: none;
}
body.sky-charge .backdrop .meteor.charge {
  display: block;
}
body.sky-charge .backdrop .sky {
  opacity: calc(0.8 + var(--charge, 0) * 0.15);
}
body.sky-charge .backdrop .charge-sky {
  opacity: calc(0.75 + var(--charge, 0) * 0.2);
}
body.sky-charge .backdrop .clines * {
  stroke-opacity: 0.38;
}

/* 仪式回应（08 §五）：洗牌达标 / 成阵聚拢瞬间，body.sky-flare 星尘整体增亮（星座线随增一档） */
body.sky-flare .backdrop .sky {
  opacity: 1;
}
body.sky-flare .backdrop .clines * {
  stroke-opacity: 0.5;
}

/* 结果揭晓（08 §五）：翻完全牌 body.sky-gold，顶部透出微金 */
.glow-gold {
  position: absolute;
  inset: 0;
  background: radial-gradient(90% 38% at 50% -4%, rgba(212, 175, 55, 0.1), transparent 62%);
  opacity: 0;
  transition: opacity 1.5s ease;
}
body.sky-gold .backdrop .glow-gold {
  opacity: 1;
}

/* 低端机降级（M2）：关掉持续动画层——流星、星尘呼吸、节点闪烁、蓄力星闪烁。
   保留星座描画与 sky-flare 增亮：前者一次性、后者短时，成本极低而仪式感不能丢。 */
body.low-end .meteor,
body.low-end .meteor.charge {
  display: none;
}
body.low-end .sky::before,
body.low-end .sky::after,
body.low-end .charge-sky::before {
  animation: none;
}
body.low-end .sky::after {
  opacity: 0.5;
}
body.low-end .cnodes circle {
  animation: none;
  opacity: 0.5;
}

/* 降级（08 §三）：流星本质是运动，静止无意义 → 不渲染；星座跳过描画直接显示 */
@media (prefers-reduced-motion: reduce) {
  .meteor,
  body.sky-charge .backdrop .meteor.charge {
    display: none; /* 特异性需盖过 sky-charge 的 display:block */
  }
  .clines * {
    animation: none;
    stroke-dashoffset: 0;
  }
  .cnodes circle {
    animation: none;
    opacity: 0.55;
  }
  .charge-sky::before {
    animation: none; /* 星不闪，静态微亮常驻 */
  }
  body.sky-charge .backdrop .charge-sky {
    opacity: 0.7;
  }
}
</style>
