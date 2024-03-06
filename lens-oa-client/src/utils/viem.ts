import {
  decodeEventLog,
  encodeAbiParameters,
  getAddress,
  parseAbiParameters,
} from "viem";

/**
 * return a decoded event object from `transactionReceipt`
 */
export const getEventFromReceipt = ({
  transactionReceipt,
  contractAddress,
  abi,
  eventName
}) => {
  const logs = contractAddress
    ? transactionReceipt.logs.filter(({ address }) => getAddress(address) === getAddress(contractAddress))
    : transactionReceipt.logs;

  return logs
    .map((l) => {
      try {
        return decodeEventLog({ abi, data: l.data, topics: l.topics });
      } catch { return {}; }
    })
    .find((event) => event.eventName === eventName);
};

export const encodeAbi = (types: string[], values: any[]) => {
  return encodeAbiParameters(
    parseAbiParameters(types.join(',')),
    values
  );
};
