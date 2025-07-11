import { fetchPostReferences } from '@lens-protocol/client/actions';
import { formatDistanceToNowStrict } from 'date-fns'
import React from 'react'
import {
  Theme, Size, ThemeColor, Profile
} from './types'

import { StorageClient } from "@lens-chain/storage-client";
import { postId, PostReferenceType, PublicClient, SessionClient } from '@lens-protocol/client';

export const storageClient = StorageClient.create();

export const getComments = async (slug: string, lensClient: PublicClient): Promise<any> => {
  try {
    const result = await fetchPostReferences(lensClient, {
      referencedPost: postId(slug),
      referenceTypes: [PostReferenceType.CommentOn],
    });

    if (result.isErr()) {
      console.error(result.error);
      return [];
    }

    // items: Array<AnyPost>
    const { items, pageInfo } = result.value;

    return items;
  } catch (error) {
    return [];
  }
};

export const backgroundColorMap: Record<Theme, ThemeColor> = {
  default: ThemeColor.darkGray,
  light: ThemeColor.lightGray,
  dark: ThemeColor.lightBlack,
  green: ThemeColor.green,
  mint: ThemeColor.mint,
  peach: ThemeColor.peach,
  lavender: ThemeColor.lavender,
  blonde: ThemeColor.blonde,
}

export const foregroundColorMap: Record<Theme, ThemeColor> = {
  default: ThemeColor.lightGray,
  light: ThemeColor.darkGray,
  dark: ThemeColor.lightGray,
  green: ThemeColor.mint,
  mint: ThemeColor.darkGray,
  peach: ThemeColor.darkGray,
  lavender: ThemeColor.darkGray,
  blonde: ThemeColor.darkGray
}

const sizeMap: Record<Size, string> = {
  small: '12px',
  medium: '16px',
  large: '18px',
}

export const dimensionsMap: Record<Size, Record<string, number>> = {
  small: { width: 25.5, height: 16.5 },
  medium: { width: 34, height: 22 },
  large: { width: 51, height: 33 }
}

export function getContainerStyle(theme: Theme, size: Size) {
  let appendedStyles = {
    backgroundColor: backgroundColorMap[theme],
    padding: '6px 13px 6px 9px'
  }
  if (size === Size.large) {
    appendedStyles.padding = '8px 18px 8px 13px'
  }
  if (size === Size.small) {
    appendedStyles.padding = '6px 13px 6px 9px'
  }
  return {
    ...styles.buttonContainer,
    ...appendedStyles
  }
}

export function getTextStyle(theme: Theme, size: Size) {
  let appendedStyles = {
    color: foregroundColorMap[theme],
    fontSize: sizeMap[size]
  }
  return {
    ...styles.text,
    ...appendedStyles
  }
}

export function returnIpfsPathOrUrl(uri?: string, ipfsGateway: string = 'https://cloudflare-ipfs.com/ipfs/') {
  if (!uri) return ""
  if (uri.startsWith('ipfs://')) {
    return uri.replace('ipfs://', ipfsGateway)
  } else if (uri.startsWith('ar://')) {
    return uri.replace('ar://', 'https://arweave.net/')
  } else {
    return uri
  }
}

export function formatProfilePictures(profiles: Profile[]) {
  return profiles.map(profile => {
    let { picture, coverPicture } = profile
    if (picture && picture.__typename === 'MediaSet') {
      if (picture.original) {
        picture.original.url = returnIpfsPathOrUrl(picture.original.url)
      }
    }
    if (picture && picture.__typename === 'NftImage') {
      if (picture.uri) {
        picture.uri = returnIpfsPathOrUrl(picture.uri)
      }
    }
    if (coverPicture && coverPicture.__typename === 'MediaSet') {
      if (coverPicture.original.url) {
        coverPicture.original.url = returnIpfsPathOrUrl(coverPicture.original.url)
      }
    }
    if (coverPicture && coverPicture.__typename === 'NftImage') {
      if (coverPicture.uri) {
        coverPicture.uri = returnIpfsPathOrUrl(coverPicture.uri)
      }
    }
    return profile
  })
}

export function formatProfilePicture(profile: any) {
  const _profile = JSON.parse(JSON.stringify(profile))
  let { picture, coverPicture } = _profile.metadata || {} // TODO: need to handle higher up with `rawURI`

  if (picture?.optimized?.uri) {
    picture.url = returnIpfsPathOrUrl(picture.optimized.uri)
  } else if (picture?.raw?.uri) {
    picture.url = returnIpfsPathOrUrl(picture.raw.uri)
  } else {
    picture = { url: "" }
  }

  if (coverPicture?.optimized?.uri) {
    coverPicture.url = returnIpfsPathOrUrl(coverPicture.optimized.uri)
  } else if (coverPicture?.raw?.uri) {
    coverPicture.url = returnIpfsPathOrUrl(coverPicture.raw.uri)
  } else {
    coverPicture = { url: "" }
  }

  if (!_profile.metadata) _profile.metadata = {}
  _profile.metadata.picture = picture
  _profile.metadata.coverPicutre = coverPicture

  return _profile
}

export function getDisplayName(profile: any) {
  return profile.metadata?.name || profile.username?.localName;
}

export function configureMirrorAndIpfsUrl(items: any[]) {
  return items.map(item => {
    if (item.profileSet) return item
    let { profile } = item
    if (item.__typename === 'Mirror') {
      if (item.mirrorOf) {
        item.originalProfile = profile
        item.stats = item.mirrorOf.stats
        profile = item.mirrorOf.profile
      }
    }
    if (profile.picture && profile.picture.__typename === 'MediaSet' && profile.picture.original) {
      const url = returnIpfsPathOrUrl(profile.picture.original.url)
      if (url) {
        profile.picture.original.url = url
      } else {
        profile.missingAvatar = true
      }
    } else {
      profile.missingAvatar = true
    }

    item.profile = profile
    item.profileSet = true
    return item
  })
}

export const systemFonts = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";'

const pastels = [
  '#F2C4DE',
  '#71B1D9',
  '#AED8F2',
  '#F2DEA2',
  '#F2CDC4',
  '#ABD3DB',
  '#C2E6DF',
  '#D1EBD8',
  '#E5F5DC',
  '#FFFFE1',
  '#F2D0D9',
  '#F2F2F2',
  '#B8C6D9',
  '#8596A6',
  '#F2D9D0',
  '#A9B5D9',
  '#F2A477',
  '#F29472',
  '#F2C4C4',
  '#F2F2F2'
]

export function getRandomColor() {
  return pastels[Math.floor(Math.random() * pastels.length)]
}

export function getSubstring(string, length = 130) {
  if (!string) return ''
  if (string.length <= length) {
    return string
  } else {
    return `${string.substring(0, length)}...`
  }
}

/* takes a string of text and returns the same text with HTML + styling to highlight the handles */
export function formatHandleColors(text: string) {
  let color = ThemeColor.lightGreen
  text = text.replaceAll('.lens', '')
  text = text.replace(/(https\S+)/g, (match, url) => {
    const displayUrl = url.length > 40 ? url.substring(0, 37) + '...' : url
    return `<a style="color: ${color};" href="${url}" target="_blank" rel="noopener noreferrer">${displayUrl}</a>`
  })
  text = text.replace(/@(\w+)/g, `<span style="color: ${color};">@$1</span>`)
  text = text.replace(/\n/g, '<br>')
  return text
}

/* takes an array of handles, returns a commma separated string */
export function formatHandleList(handles) {
  handles = handles.join(', ')
  handles = handles.replaceAll('.lens', '')
  return handles
}

export const formatCustomDate = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 60) {
    return `${diffInMinutes}m`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h`;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
}

export const formatCustomDistance = (timestamp: number): string => {
  const timeAgo = formatDistanceToNowStrict(new Date(timestamp * 1000), { addSuffix: false });

  // Convert to shorthand
  return timeAgo
    .replace(" seconds", "s")
    .replace(" second", "s")
    .replace(" minutes", "m")
    .replace(" minute", "m")
    .replace(" hours", "h")
    .replace(" hour", "h")
    .replace(" days", "d")
    .replace(" day", "d")
    .replace(" weeks", "w")
    .replace(" week", "w")
    .replace(" months", "mo")
    .replace(" month", "mo")
    .replace(" years", "y")
    .replace(" year", "y");
}

const styles = {
  buttonContainer: {
    outline: 'none',
    border: 'none',
    borderRadius: 50,
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer'
  },
  text: {
    margin: '0px 0px 0px 6px',
    padding: 0,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"'
  }
}

export const getHashFromUri = (uriOrHash: string) =>
  typeof uriOrHash === "string" && uriOrHash.startsWith("ipfs://") ? uriOrHash.split("ipfs://")[1] : uriOrHash;

export const defaultIpfsGatewayURL = (uriOrHash: string): string => `https://gw.ipfs-lens.dev/ipfs/${uriOrHash}`;

export const ipfsOrNotWithDefaultGateway = (uriOrHash?: string) =>
  uriOrHash?.startsWith("ipfs://") ? defaultIpfsGatewayURL(getHashFromUri(uriOrHash)) : uriOrHash;

export function polygonScanUrl({ isPolygon, address, tx }: { address?: string, isPolygon: boolean, tx?: string }) {
  return address
    ? `https://${!isPolygon ? "mumbai." : ""}polygonscan.com/address/${address}`
    : `https://${!isPolygon ? "mumbai." : ""}polygonscan.com/tx/${tx}`
}

export const FARCASTER_BANNER_URL = "https://link.storjshare.io/raw/jxz2u2rv37niuhe6d5xpf2kvu7eq/misc%2Ffarcaster.png";

export const DEFAULT_LENS_PROFILE_IMAGE = "https://app.onbons.ai/default.png";
