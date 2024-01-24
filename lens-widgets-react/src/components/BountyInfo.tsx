import { useMemo } from 'react';
import { formatUnits } from 'viem';
import { Bounty } from '../actions/handlers/PublicationBountyAction';

export const BountyInfo = ({ bounty, isDarkTheme, paymentToken }: { bounty: Bounty, isDarkTheme: boolean, paymentToken: { symbol, decimals } }) => {
  const bountyAmountOrNull = useMemo(() => {
    return bounty?.open && !!paymentToken
      ? `Budget | ${parseFloat(formatUnits(BigInt(bounty.budget), paymentToken.decimals)).toFixed(2)} ${paymentToken.symbol}`
      : null;
  }, [bounty, paymentToken]);

  return (
    <div className="w-full">
      <div
        className="flex justify-between border-t border-b px-3 py-4 border-dark-grey"
        style={{ backgroundColor: isDarkTheme ? '#3a3b3c' : '#f0f2f5' }}
      >
        <div className="flex items-center space-x-2">
          <span className="w-48 overflow-hidden whitespace-nowrap text-ellipsis font-bold">Content Bounty 💸</span>
        </div>
        <div className="flex justify-end">
          <div className="w-52">
            {/* TODO: the only way `textAlign` was applied, bad root config? */}
            <p style={{ textAlign: "right" }} className="overflow-hidden whitespace-nowrap text-ellipsis mr-2">
              {bountyAmountOrNull}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};