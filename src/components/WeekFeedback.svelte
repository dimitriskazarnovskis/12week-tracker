<script lang="ts">
  import type { WeekFeedbackText } from '../lib/motivation';
  let { feedback, onClose }: { feedback: WeekFeedbackText; onClose: () => void } = $props();
</script>
<div class="scrim">
  <div class="pop" class:great={feedback.tone === 'great'} role="dialog" aria-modal="true" aria-label={feedback.title} tabindex="-1">
    <div class="ttl">{feedback.title}</div>
    <p class="tx">{feedback.text}</p>
    <div class="tip">💡 Совет недели: {feedback.tip}</div>
    <button class="btn" onclick={onClose}>{feedback.button}</button>
  </div>
</div>
<style>
  .scrim{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:24px;z-index:100}
  .pop{background:var(--surface);border-radius:18px;padding:22px 18px;max-width:340px;width:100%;display:flex;flex-direction:column;gap:10px;
    text-align:center;border:1px solid var(--line);animation:pop .25s ease-out}
  .pop.great{border-color:#2E8B57}
  .ttl{font-size:19px;font-weight:800;color:var(--ink);line-height:1.25}
  .tx{font-size:14px;line-height:1.55;color:var(--body)}
  .tip{font-size:13px;line-height:1.5;color:var(--body);background:var(--red-soft);border-radius:11px;padding:11px 13px;text-align:left}
  .btn{margin-top:4px;padding:13px;border-radius:11px;border:none;background:var(--red);color:#fff;font:800 14px Montserrat,sans-serif;cursor:pointer}
  @keyframes pop{from{transform:scale(.92);opacity:0}to{transform:scale(1);opacity:1}}
</style>
