<script lang="ts">
  const pieces = Array.from({ length: 40 }, (_, i) => i);
  const colors = ['#D12329', '#ffffff', '#231F20', '#ff5a5f', '#C8860B'];
  function styleFor(i: number): string {
    const left = (i * 53) % 100;
    const delay = (i % 10) * 35;
    const dur = 950 + (i % 6) * 130;
    const col = colors[i % colors.length];
    const rot = (i * 47) % 360;
    return `left:${left}%;background:${col};animation-delay:${delay}ms;animation-duration:${dur}ms;transform:rotate(${rot}deg)`;
  }
</script>
<div class="confetti" aria-hidden="true">
  {#each pieces as i}<span style={styleFor(i)}></span>{/each}
</div>
<style>
  .confetti{position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:50}
  .confetti span{position:absolute;top:-14px;width:8px;height:13px;border-radius:2px;opacity:.92;
    animation-name:fall;animation-timing-function:cubic-bezier(.3,.6,.4,1);animation-fill-mode:forwards}
  @keyframes fall{to{transform:translateY(108vh) rotate(600deg);opacity:0}}
  @media (prefers-reduced-motion: reduce){.confetti{display:none}}
</style>
