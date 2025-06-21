import { Trade } from "../types/trade";

export interface TradeIssue {
  type: 'error' | 'warning';
  message: string;
}

export function validateTrade(trade: Trade): TradeIssue[] {
  const issues: TradeIssue[] = [];

  // Calculate total bought quantity
  const totalBoughtQty = (trade.initialQty || 0) +
    (trade.pyramid1Qty || 0) +
    (trade.pyramid2Qty || 0);

  // Calculate total exit quantity
  const totalExitQty = (trade.exit1Qty || 0) +
    (trade.exit2Qty || 0) +
    (trade.exit3Qty || 0);

  // 1. Exit qty > Bought qty (ERROR) - but only if there are actual exits
  if (totalExitQty > 0 && totalExitQty > totalBoughtQty) {
    issues.push({
      type: 'error',
      message: `Exit quantity (${totalExitQty}) cannot be greater than bought quantity (${totalBoughtQty}). Please check your pyramid and exit quantities.`
    });
  }

  // 2. Pyramid quantities without prices (WARNING)
  if ((trade.pyramid1Qty || 0) > 0 && !(trade.pyramid1Price || 0) > 0) {
    issues.push({
      type: 'warning',
      message: 'Pyramid 1 has quantity but no price specified'
    });
  }

  if ((trade.pyramid2Qty || 0) > 0 && !(trade.pyramid2Price || 0) > 0) {
    issues.push({
      type: 'warning',
      message: 'Pyramid 2 has quantity but no price specified'
    });
  }

  // 3. Exit quantities without prices (WARNING)
  if ((trade.exit1Qty || 0) > 0 && !(trade.exit1Price || 0) > 0) {
    issues.push({
      type: 'warning',
      message: 'Exit 1 has quantity but no price specified'
    });
  }

  if ((trade.exit2Qty || 0) > 0 && !(trade.exit2Price || 0) > 0) {
    issues.push({
      type: 'warning',
      message: 'Exit 2 has quantity but no price specified'
    });
  }

  if ((trade.exit3Qty || 0) > 0 && !(trade.exit3Price || 0) > 0) {
    issues.push({
      type: 'warning',
      message: 'Exit 3 has quantity but no price specified'
    });
  }

  // 2. Open qty but no exit details (WARNING)
  const hasOpenQty = trade.openQty > 0;
  const noExitDetails = !trade.exit1Qty && !trade.exit2Qty && !trade.exit3Qty;
  if (hasOpenQty && noExitDetails) {
    issues.push({
      type: 'warning',
      message: `Trade has open quantity (${trade.openQty}) but no exit details entered`
    });
  }

  // 3. All exited but status not updated (WARNING)
  const allExited = trade.openQty === 0 && totalExitQty > 0;
  const statusNotUpdated = trade.positionStatus === "Open";
  if (allExited && statusNotUpdated) {
    issues.push({
      type: 'warning',
      message: 'All quantity exited but status still marked as "Open"'
    });
  }

  // 4. Has exit details but wrong status (WARNING)
  const hasExits = totalExitQty > 0;
  const wrongPartialStatus = hasExits && trade.openQty > 0 && trade.positionStatus === "Open";
  if (wrongPartialStatus) {
    issues.push({
      type: 'warning',
      message: 'Trade has partial exits but status not marked as "Partial"'
    });
  }

  return issues;
} 