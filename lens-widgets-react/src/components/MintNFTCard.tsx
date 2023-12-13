import React from 'react';
import { MintableNFT } from '../actions';
import { getZoraChainInfo } from '../actions/utils/zora';

const MintNFTCard = ({ metadata, isDarkTheme }: { metadata?: MintableNFT, isDarkTheme: boolean }) => {
  if (!metadata) return null;

  const chainInfo = metadata.chainId ? getZoraChainInfo(metadata.chainId) : undefined;

  return (
    <div className="">
      <img className="h-[400px] w-full rounded-t-xl object-cover" src={metadata.image} />
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
          <span>{metadata.name}</span>
        </div>
        <div className="flex justify-end">
          <div className="w-48">
            {/* TODO: the only way `textAlign` was applied, bad root config? */}
            <p style={{ textAlign: "right"}} className="overflow-hidden whitespace-nowrap text-ellipsis">
              {metadata.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MintNFTCard;