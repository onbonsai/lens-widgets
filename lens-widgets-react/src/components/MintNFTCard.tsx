import { useMemo } from 'react';
import { formatEther } from 'viem';
import { MintableNFT } from '../../packages/lens-oa-client/actions';
import { getChainInfo } from '../../packages/lens-oa-client/actions/utils/zora';
import { ipfsOrNotWithDefaultGateway } from '../utils';

export const MintNFTCard = ({ metadata, isDarkTheme, imageHeight, priceWei }: { metadata?: MintableNFT, isDarkTheme: boolean, imageHeight?: `${string}px`, priceWei?: string }) => {
  if (!metadata?.name) return null;

  const chainInfo = metadata.chainId ? getChainInfo(metadata.chainId) : undefined;
  const descriptionOrPrice = useMemo(() => {
    return priceWei
      ? `${parseFloat(formatEther(BigInt(priceWei))).toFixed(5)} ETH`
      : metadata.description;
  }, [priceWei, metadata]);

  return (
    <div className="w-full">
      <img className={`h-[${imageHeight || '400px'}] w-full rounded-t-xl object-cover`} src={ipfsOrNotWithDefaultGateway(metadata.image)} />
      <div
        className="flex justify-between border-t border-b px-3 py-4 border-dark-grey"
        style={{ backgroundColor: isDarkTheme ? '#3a3b3c' : '#f0f2f5' }}
      >
        <div className="flex items-center space-x-2">
          {chainInfo && (
            <span className="relative">
              <img className="h-5 w-5" src={chainInfo.logo} />
              <div className="absolute left-full top-0 ml-1 opacity-0 hover:opacity-100 transition-opacity">
                <span className="rounded-md whitespace-nowrap px-2 py-1 ml-6 bg-black">{chainInfo.name}</span>
              </div>
            </span>
          )}
          <span className="w-48 overflow-hidden whitespace-nowrap text-ellipsis font-bold">{metadata.name}</span>
        </div>
        <div className="flex justify-end">
          <div className="w-48">
            {/* TODO: the only way `textAlign` was applied, bad root config? */}
            <p style={{ textAlign: "right" }} className="overflow-hidden whitespace-nowrap text-ellipsis mr-2">
              {descriptionOrPrice}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};