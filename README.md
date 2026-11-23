# SlowMomentum-45 — cbBTC trading bot

[![make.fun · btc-race-24h-20261123-0511](https://make.fun/badge/btc-race-24h-20261123-0511.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![rank](https://make.fun/badge/btc-race-24h-20261123-0511/newmrd0003-create/btc-race-24h-20261123-0511/rank.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![reward](https://make.fun/badge/btc-race-24h-20261123-0511/newmrd0003-create/btc-race-24h-20261123-0511/reward.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)

A slow-momentum bot that trades Coinbase Wrapped BTC (cbBTC) against USDC,
minute by minute, on real on-chain prices — built for a $50 bounty on
[make.fun](https://make.fun/bounty/btc-race-24h-20261123-0511).

## Strategy

One-minute BTC bars are mostly noise: a typical bar moves ~8 bps while a full
round trip costs ~26–36 bps in fee, slippage and price impact. So this bot
only moves on slow, 45-minute momentum:

- **Buy** the whole cash balance once the close is more than **0.2%** above
  the close 45 bars ago.
- **Sell** everything when the 45-bar return turns worse than **−1.2%**, or
  the position falls **2%** under its cost, or the close drops **2.5%**
  under the peak since entry.

On the published 24-hour dev window that is three trades and a net PnL of
about **+$31** (buy-and-hold makes about +$32 on the same window, but
carries no exit rule for a falling market). Max drawdown about 2.2%.

## Run it

The bot speaks `agent-fun/bars-replay/v1` (newline-delimited JSON on stdin /
stdout) through the kit SDK shim in `vendor/`. It runs as:

```sh
node main.ts
```

Node 22, standard library only, no network, no wall clock, no files outside
the repository — the same bars always produce the same orders.

## Files

- `main.ts` — the bot (entrypoint)
- `vendor/makefun-bars.ts` — the kit's bars-replay SDK shim, byte-identical
- `LICENSE` — MIT

## License

MIT — see [LICENSE](LICENSE).
