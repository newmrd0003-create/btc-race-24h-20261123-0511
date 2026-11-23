// SlowMomentum-45 — a slow-momentum bot for Coinbase Wrapped BTC (cbBTC) on
// 1-minute Orca Whirlpool bars, built for make.fun's btc-race-24h-20261123-0511.
//
// The idea, in one paragraph: one-minute BTC bars are mostly noise (a typical
// bar moves ~8 bps while a full round trip costs ~26-36 bps in fee, slippage
// and price impact), so any rule that trades the fast wiggle bleeds out. This
// bot only moves on slow, 45-minute momentum: it buys the whole cash balance
// once the close has risen more than 0.2% over the last 45 bars, then sits
// still and lets the trend run. It only sells on a real break — the 45-bar
// return turning worse than -1.2%, the position falling 2% under its cost, or
// the close dropping 2.5% under the peak since entry. On the published dev
// window that is three trades: in early, out once on a pullback, back in,
// and it keeps almost all of a buy-and-hold gain while carrying an exit
// rule for a falling race window. No shorts, no leverage, full size only.
//
// Deterministic by construction: the only inputs are the bars the harness
// sends, all arithmetic is float64 in a fixed order, and there is no clock,
// no network, no randomness and no file access. The same bars always give
// the same orders.
//
// Protocol: agent-fun/bars-replay/v1 via the kit SDK shim in vendor/.
// Runs as `node /bot/main.ts` (Node 22, erasable TypeScript only).

import { runBars, type BarsState, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
/** Momentum lookback, in bars (minutes). */
const LOOKBACK = 45;
/** Enter when the close is this far above the close LOOKBACK bars ago. */
const BUY_RETURN = 0.002;
/** Exit when the close is this far below the close LOOKBACK bars ago. */
const SELL_RETURN = -0.012;
/** Exit when the position is worth less than this fraction of its cost. */
const COST_STOP = 0.02;
/** Exit when the close falls this far under the peak close since entry. */
const TRAIL_DROP = 0.025;
/** 1% past the close the order was decided on; a fill past it is refused. */
const MAX_SLIPPAGE_BPS = 100;

/** Closes seen so far, in USDC (bar.c is raw at price_scale 5). */
const closes: number[] = [];
/** Highest close since the current entry. */
let peakClose = 0;

/** The close's return over the last LOOKBACK bars, or null while too young. */
function momentum(): number | null {
  const n = closes.length;
  if (n <= LOOKBACK) return null;
  return closes[n - 1] / closes[n - 1 - LOOKBACK] - 1;
}

await runBars({
  onBatch(state: BarsState, batch) {
    for (const bar of batch.bars) {
      if (bar.symbol === SYMBOL) closes.push(Number(bar.c) / 1e5);
    }
    // Warm-up batches cannot trade; there is no warm-up here, but keep the guard.
    if (state.warmingUp) return [];
    const r = momentum();
    if (r === null) return [];

    const held = state.positions.get(SYMBOL);
    if (held !== undefined) {
      const close = closes[closes.length - 1];
      if (close > peakClose) peakClose = close;
      const value = state.value(SYMBOL, held.qty);
      const underCost = value * 100n < held.cost * 98n;
      const trailedOff = close < peakClose * (1 - TRAIL_DROP);
      if (r < SELL_RETURN || underCost || trailedOff) {
        const sell: SellInput = { side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS };
        return [sell];
      }
      return [];
    }

    if (r > BUY_RETURN) {
      const cash = state.cash;
      if (cash < BigInt(state.hello.fees.min_notional_quote_units)) return [];
      peakClose = closes[closes.length - 1];
      const buy: BuyInput = { side: 'buy', symbol: SYMBOL, notional_quote_units: cash, max_slippage_bps: MAX_SLIPPAGE_BPS };
      return [buy];
    }
    return [];
  },
});
