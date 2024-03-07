import { useEffect, useState, useMemo } from 'react'
import { css } from '@emotion/css'
import {
  Environment,
  LensClient,
  production,
  PublicationOperationsFragment,
  ProfileFragment,
} from "@lens-protocol/client";
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import { ThemeColor, Theme } from './types'
import { formatDistance } from 'date-fns'
import { isEmpty } from 'lodash/lang';
import {
  MessageIcon, MirrorIcon, HeartIcon, ShareIcon
} from './icons'
import {
  formatProfilePicture,
  returnIpfsPathOrUrl,
  systemFonts,
  getSubstring,
  formatHandleColors,
  getDisplayName,
} from './utils'
import ReactPlayer from 'react-player'
import { AudioPlayer } from './AudioPlayer'
import { useSupportedActionModule } from './hooks/useSupportedActionModule';
import Spinner from './components/Spinner';
import ActModal from './components/ActModal';
import { MintNFTCard } from './components/MintNFTCard';
import { BountyInfo } from './components/BountyInfo';
import { WalletClient } from 'viem';
import { Toast } from './types';
import { VerifiedBadgeIcon } from "./icons"
import { useGetOwnedMadFiBadge } from './hooks/useGetOwnedBadge';
import { ActionHandler } from '@madfi/lens-oa-client';

export function Publication({
  publicationId,
  onClick,
  onProfileClick,
  publicationData,
  theme = Theme.default,
  ipfsGateway,
  fontSize,
  environment = production,
  authenticatedProfile,
  walletClient,
  renderActButtonWithCTA,
  onActButtonClick,
  onCommentButtonClick,
  onMirrorButtonClick,
  onLikeButtonClick,
  onShareButtonClick,
  hideCommentButton = false,
  hideQuoteButton = false,
  hideShareButton = false,
  operations,
  focusedOpenActionModuleName,
  useToast,
  rpcURLs,
  appDomainWhitelistedGasless,
  renderMadFiBadge = false,
  handlePinMetadata,
}: {
  publicationId?: string,
  publicationData?: any,
  onClick?: (e) => void,
  onProfileClick?: (e) => void,
  theme?: Theme,
  ipfsGateway?: string,
  fontSize?: string,
  environment?: Environment,
  authenticatedProfile?: ProfileFragment | null,
  walletClient?: WalletClient,
  renderActButtonWithCTA?: string,
  onActButtonClick?: (e, actionModuleHandler?: ActionHandler) => void,
  onCommentButtonClick?: (e, actionModuleHandler?: ActionHandler) => void,
  onMirrorButtonClick?: (e, actionModuleHandler?: ActionHandler) => void,
  onLikeButtonClick?: (e, p) => void,
  onShareButtonClick?: (e) => void,
  hideCommentButton?: boolean,
  hideQuoteButton?: boolean,
  hideShareButton?: boolean,
  operations?: PublicationOperationsFragment,
  focusedOpenActionModuleName?: string // in case a post has multiple action modules
  useToast?: Toast // ex: react-hot-toast to render notifs
  rpcURLs?: { [chainId: number]: string },
  appDomainWhitelistedGasless?: boolean,
  renderMadFiBadge?: boolean,
  handlePinMetadata?: (content: string, files: any[]) => Promise<string> // to upload post content on bounties
}) {
  let [publication, setPublication] = useState<any>(publicationData)
  let [showFullText, setShowFullText] = useState(false)
  let [openActModal, setOpenActModal] = useState(false)

  const {
    isActionModuleSupported,
    actionModuleHandler,
    isLoading: isLoadingActionModuleState,
  } = useSupportedActionModule(
    environment,
    publication,
    authenticatedProfile?.id,
    walletClient,
    rpcURLs,
    focusedOpenActionModuleName
  );

  const {
    ownsBadge,
    verified
  } = useGetOwnedMadFiBadge(
    environment.name === 'production',
    publication?.by?.sponsor,
    publication?.by?.ownedBy?.address
  );

  const actHandledExternally = renderActButtonWithCTA && onActButtonClick;

  const shouldRenderBadge = useMemo(() => {
    return renderMadFiBadge && ownsBadge && verified;
  }, [renderMadFiBadge, ownsBadge, verified]);

  useEffect(() => {
    if (!publicationData) {
      fetchPublication();
    } else {
      setPublication(publicationData)
    }
  }, [publicationId])

  async function fetchPublication() {
    try {
      const lensClient = new LensClient({ environment });
      const pub = await lensClient.publication.fetch({ forId: publicationId });
      setPublication(pub);
    } catch (err) {
      console.log('error fetching publication: ', err)
    }
  }
  function onPublicationPress(e) {
    if (onClick) {
      onClick(e)
    } else {
      // const pubId = publicationId || publicationData.id;
      // const URI = `https://share.lens.xyz/p/${pubId}`;
      // window.open(URI, '_blank')
    }
  }

  function onProfilePress(e) {
    if (onProfileClick) {
      onProfileClick(e)
    } else {
      // if (profile) {
      //   const { localName, namespace } = profile.handle
      //   const URI = `https://share.lens.xyz/u/${localName}.${namespace}`
      //   window.open(URI, '_blank')
      // }
    }
  }

  function _onActButtonClick(e) {
    if (actionModuleHandler?.disabled) return;

    if (isActionModuleSupported && !actHandledExternally) {
      e.preventDefault();
      e.stopPropagation();
      setOpenActModal(true);
    } else if (actHandledExternally) {
      onActButtonClick(e, actionModuleHandler);
    }
  }

  function onCommentPress(e) {
    if (onCommentButtonClick) {
      onCommentButtonClick(e, actionModuleHandler);
    }
  }

  function onMirrorPress(e) {
    if (onMirrorButtonClick) {
      onMirrorButtonClick(e, actionModuleHandler);
    }
  }

  if (!publication) return null
  let isMirror = false
  if (publication.mirrorOf) {
    isMirror = true
    const { mirrorOf, ...original} = publication
    publication = publication.mirrorOf
    publication.original = original
  }
  publication.profile = formatProfilePicture(publication.by)
  const { profile } = publication

  // theming
  const isDarkTheme = theme === Theme.dark
  const color = isDarkTheme ? ThemeColor.white : ThemeColor.darkGray
  const backgroundColor = isDarkTheme ? ThemeColor.lightBlack : ThemeColor.white
  const reactionBgColor = isDarkTheme ? ThemeColor.darkGray : ThemeColor.lightGray
  const actButttonBgColor = isDarkTheme ? ThemeColor.darkGray : ThemeColor.lightGray
  const reactionTextColor = isDarkTheme ? ThemeColor.lightGray : ThemeColor.darkGray

  // misc
  const isAuthenticated = !!authenticatedProfile?.id;
  const renderActButton = walletClient && isAuthenticated && ((isActionModuleSupported && !isLoadingActionModuleState && !actionModuleHandler?.panicked) || actHandledExternally);
  const renderActLoading = walletClient && isAuthenticated && (isActionModuleSupported && isLoadingActionModuleState && !actionModuleHandler?.panicked && !actHandledExternally);

  let media, cover
  if (publication.metadata.asset) {
    media = publication.metadata.asset
    if (media.__typename === "PublicationMetadataMediaImage") {
      media.type = 'image'
      media.original = { url: returnIpfsPathOrUrl(media.image.optimized?.uri || media.image.raw?.uri, ipfsGateway) }
    }
    if (media.__typename === "PublicationMetadataMediaVideo") {
      media.type = 'video'
      media.original = { url: returnIpfsPathOrUrl(media.video.optimized?.uri || media.video.raw?.uri, ipfsGateway) }
    }
    if (media.__typename === "PublicationMetadataMediaAudio") {
      media.type = 'audio'
      media.original = { url: returnIpfsPathOrUrl(media.audio.optimized?.uri || media.audio.raw?.uri, ipfsGateway) }
    }
    if (media.cover) {
      cover = returnIpfsPathOrUrl(media.cover?.optimized?.uri || media.cover.raw?.uri, ipfsGateway)
    }
  }

  return (
    <div
      className={publicationContainerStyle(backgroundColor, onClick ? true : false)}
    >
      <div
       onClick={onPublicationPress}
       className={topLevelContentStyle}
      >
         {/* {
            isMirror && (
              <div className={mirroredByContainerStyle}>
                <MirrorIcon color={ThemeColor.mediumGray} />
                <p>mirrored by {getDisplayName(publication.original.by)}</p>
              </div>
            )
          } */}
        <div className={profileContainerStyle(isMirror, !!onProfileClick)} onClick={onProfilePress}>
          <div>
            {
             publication.by?.metadata?.picture?.optimized?.uri ||
             publication.by?.metadata?.picture?.image.optimized?.uri  ? (
                <img
                  src={
                    publication.by.metadata.picture.__typename === 'NftImage' ?
                    publication.by.metadata.picture?.image.optimized?.uri : publication.by.metadata.picture?.optimized?.uri
                  }
                  className={profilePictureStyle}
                />
              ) : (
                <div
                  className={profilePictureStyle}
                />
              )
            }
          </div>
          <div className={profileDetailsContainerStyle(color)}>
            <div className="flex gap-x-2">
              <p className={profileNameStyle}>{getDisplayName(profile)}</p>
              {shouldRenderBadge && <span className="mt-1"><VerifiedBadgeIcon height={20} /></span>}
            </div>
            {/* conditional due to bounties */}
            {publication.createdAt && (
              <p className={dateStyle}> {formatDistance(new Date(publication.createdAt), new Date())} ago</p>
            )}
          </div>
        </div>
        <div className={textContainerStyle}>
          <ReactMarkdown
            className={markdownStyle(color,fontSize)}
            rehypePlugins={[rehypeRaw]}
          >
            {showFullText
              ? formatHandleColors(publication.metadata.content)
              : formatHandleColors(getSubstring(publication.metadata.content, 339))}
          </ReactMarkdown>
        {publication.metadata.content.length > 339 && (
          <button className={showMoreStyle} onClick={(event) => {
            event.stopPropagation()
            setShowFullText(!showFullText)
          }}>
            {showFullText ? 'Show Less' : 'Show More'}
          </button>
        )}
        </div>
      </div>
      {/* Render a NFT preview component OR the media content */}
      {!isLoadingActionModuleState && actionModuleHandler?.mintableNFT && (
        <div className={nftContainerStyle}>
          <MintNFTCard
            metadata={actionModuleHandler?.mintableNFTMetadata}
            isDarkTheme={isDarkTheme}
          />
        </div>
      )}
      {!isLoadingActionModuleState && !actionModuleHandler?.mintableNFT && (
        <>
          {
            publication.metadata?.__typename === "ImageMetadataV3" && (
              <div className={imageContainerStyle}>
                <img
                  className={mediaImageStyle}
                  src={publication.metadata.asset.image.optimized?.uri || returnIpfsPathOrUrl(publication.metadata.asset.image.raw.uri)}
                  onClick={onPublicationPress}
                />
              </div>
            )
          }
          {
            publication.metadata?.__typename === "VideoMetadataV3" && (
              <div className={videoContainerStyle}>
                <ReactPlayer
                  className={videoStyle}
                  url={media.original.url}
                  controls
                />
              </div>
            )
          }
          {
            publication.metadata?.__typename === "AudioMetadataV3" && (
              <div className={audioContainerStyle}>
                <AudioPlayer
                  url={media.original.url}
                  theme={theme}
                  cover={cover}
                  profile={publication.by}
                />
              </div>
            )
          }
        </>
      )}
      {/* Render Bounty info */}
      {/* @ts-expect-error */}
      {!isLoadingActionModuleState && !!actionModuleHandler?.publicationBounty && (
        <div className={bountyInfoContainerStyle}>
          <BountyInfo
            isDarkTheme={isDarkTheme}
            // @ts-expect-error
            bounty={actionModuleHandler!.publicationBounty?.bounty}
            // @ts-expect-error
            paymentToken={actionModuleHandler!.paymentToken}
          />
        </div>
      )}
      <div
        className={reactionsContainerStyle}
        onClick={onPublicationPress}
      >
        {!isEmpty(publication.stats) && (
          <>
            <div
              className={reactionContainerStyle(reactionTextColor, reactionBgColor, isAuthenticated && onLikeButtonClick, operations?.hasUpvoted)}
              onClick={(e) => { if (onLikeButtonClick) onLikeButtonClick(e, publication) }}
            >
              <HeartIcon color={!operations?.hasUpvoted ? reactionTextColor : ThemeColor.red} />
              <p>{publication.stats.upvotes > 0 ? publication.stats.upvotes : null}</p>
            </div>
            {!hideCommentButton && (
              <div
                className={reactionContainerStyle(reactionTextColor, reactionBgColor, isAuthenticated && onCommentButtonClick, false)}
                onClick={onCommentPress}
              >
                <MessageIcon color={reactionTextColor} />
                <p>{publication.stats.comments > 0 ? publication.stats.comments : null}</p>
              </div>
            )}
            {!hideQuoteButton && (
              <div
                className={reactionContainerStyle(reactionTextColor, reactionBgColor, isAuthenticated && onMirrorButtonClick, operations?.hasMirrored)}
                onClick={onMirrorPress}
              >
                <MirrorIcon color={!operations?.hasMirrored ? reactionTextColor : ThemeColor.lightGreen} />
                <p>{publication.stats.mirrors + publication.stats.quotes > 0 ? publication.stats.mirrors + publication.stats.quotes : null}</p>
              </div>
            )}
            {renderActButton && (
              <div
                className={actButtonContainerStyle(reactionTextColor, actButttonBgColor, actionModuleHandler?.disabled)}
                onClick={_onActButtonClick}
              >
                <p>{actHandledExternally ? renderActButtonWithCTA : actionModuleHandler?.getActButtonLabel()}</p>
              </div>
            )}
            {renderActLoading && (
              <div className={shareContainerStyle(reactionTextColor, reactionBgColor)}>
                <Spinner customClasses="h-6 w-6" color={color} />
              </div>
            )}
            {!(renderActButton || renderActLoading) && !hideShareButton && (
              <div
                className={shareContainerStyle(reactionTextColor, reactionBgColor)}
                onClick={onShareButtonClick}
              >
                <ShareIcon color={reactionTextColor} />
              </div>
            )}
          </>
        )}
      </div>
      {renderActButton && actionModuleHandler && (
        <ActModal
          handler={actionModuleHandler}
          openActModal={openActModal}
          setOpenActModal={setOpenActModal}
          style={{ backgroundColor, color }}
          publication={publication}
          walletClient={walletClient}
          isDarkTheme={isDarkTheme}
          countOpenActions={publication.stats.countOpenActions}
          toast={useToast}
          appDomainWhitelistedGasless={appDomainWhitelistedGasless}
          onActButtonClick={onActButtonClick}
          handlePinMetadata={handlePinMetadata}
          signless={authenticatedProfile?.signless}
        />
      )}
    </div>
  )
}

const showMoreStyle = css`
  color: ${ThemeColor.lightGreen};
  font-size: 14px;
  padding-top: 4px;
  padding-bottom: 4px;
  transition: opacity 0.2s ease;
  &:hover {
    opacity: 0.6;
  }
`

const textContainerStyle = css`
  padding-top: 22px;
`

const topLevelContentStyle = css`
  padding: 12px 18px 0px;
`

const imageContainerStyle = css`
  position: relative;
  width: 100%;
  overflow: hidden;
  max-height: 480px;
  margin-top: 14px;
`

const nftContainerStyle = css`
  position: relative;
  width: 100%;
  overflow: hidden;
  max-height: 600px;
  margin-top: 14px;
`

const bountyInfoContainerStyle = css`
  position: relative;
  width: 100%;
  overflow: hidden;
  max-height: 200px;
`

const videoContainerStyle = css`
  padding-top: 56.25% !important;
  height: 0px !important;
  position: relative !important;
  margin-top: 14px;
`

const audioContainerStyle = css`
margin-top: 14px;
`

const videoStyle = css`
  width: 100% !important;
  height: 100% !important;
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
`

const mediaImageStyle = css`
  width: 100%;
  height: auto;
  display: block;
`

const markdownStyle = (color, fontSize) => css`
  color: ${color};
  overflow: hidden;
  li {
    font-size: ${fontSize || '14px'};
  }
  p {
    font-size: ${fontSize || '14px'};
    margin-bottom: 5px;
  }
`

const profileContainerStyle = (isMirror, profileClickable) => css`
  display: flex;
  align-items: center;
  padding-top: ${isMirror ? '2px' : '6px'};
  cursor: ${profileClickable ? 'pointer' : 'default'}
`
const system = css`
  font-family: ${systemFonts} !important
`

const profileNameStyle = css`
  font-weight: 600;
  font-size: 16px;
`

const profilePictureStyle = css`
  width: 42px;
  height: 42px;
  border-radius: 20px;
  object-fit: cover;
  background-color: #dddddd;
`

const reactionsContainerStyle = css`
  position: relative;
  padding: 0px 18px 18px;
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  margin-top: 15px;
  gap: 10px;
  cursor: default;
`

const mirroredByContainerStyle = css`
  display: flex;
  margin-bottom: 5px;
  height: 30px;
  align-items: center;
  p {
    margin: 0;
    color: ${ThemeColor.mediumGray};
    font-size: 14px;
    margin-left: 10px;
    margin-top: -2px;
  }
`

const reactionContainerStyle = (color, backgroundColor, isAuthenticatedAndWithHandler, hasReacted) => css`
  background-color: transparent;
  &:hover {
    background-color: ${isAuthenticatedAndWithHandler && !hasReacted ? backgroundColor : 'transparent'};
  }
  display: flex;
  border-radius: 24px;
  padding: 12px 16px 10px 16px;
  margin-right: 10px;
  p {
    color: ${color};
    font-size: 12px;
    opacity: .75;
    margin: 0;
    margin-left: 4px;
  }
  cursor: ${isAuthenticatedAndWithHandler && !hasReacted ? 'pointer' : 'default'};
`

const shareContainerStyle = (color, backgroundColor) => css`
  background-color: transparent;
  &:hover {
    background-color: ${backgroundColor}
  }
  display: flex;
  border-radius: 24px;
  padding: 12px 16px 10px 16px;
  margin-right: 10px;
  position: absolute;
  right: 5px;
  top: 0px;
  p {
    color: ${color};
    font-size: 12px;
    opacity: .75;
    margin: 0;
    margin-left: 4px;
  }
  cursor: pointer;
`

const actButtonContainerStyle = (color, backgroundColor, disabled?: boolean) => css`
  background-color: ${backgroundColor};
  display: flex;
  border-radius: 16px;
  padding: 10px;
  padding-left: 14px;
  padding-right: 14px;
  margin-right: 14px;
  position: absolute;
  right: 5px;
  p {
    color: ${color};
    font-size: 14px;
    opacity: 1;
    margin: 0;
  }
  cursor: ${!disabled ? 'pointer' : 'default'};
`

const publicationContainerStyle = (color, onClick: boolean) => css`
  max-width: 510px;
  width: 100%;
  background-color: ${color};
  cursor: ${onClick ? 'pointer': 'default'};
  border-radius: 18px;
  @media (max-width: 510px) {
    width: 100%
  }
  * {
    ${system};
  }
`

const dateStyle = css`
  font-size: 12px;
  color: ${ThemeColor.darkGray};
  opacity: .75;
`

const profileDetailsContainerStyle = color => css`
  display: flex;
  flex-direction: column;
  margin-left: 10px;
  p {
    margin: 0;
    color: ${color};
  }
`