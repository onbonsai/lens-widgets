import { ReactNode, useEffect, useState } from 'react'
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
  MessageIcon, MirrorIcon, HeartIcon, ShareIcon, VideoCameraSlashIcon
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
import { ActionHandler } from '@madfi/lens-oa-client';
import { getButtonStyle } from "./Profile"
import { NewHeartIcon } from './icons/NewHeartIcon';
import { NewMessageIcon } from './icons/NewMessageIcon';
import { NewShareIcon } from './icons/NewShareIcon';

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
  hideFollowButton = true,
  hideCommentButton = false,
  hideQuoteButton = false,
  hideShareButton = false,
  followButtonDisabled = false,
  followButtonBackgroundColor,
  operations,
  focusedOpenActionModuleName,
  useToast,
  rpcURLs,
  appDomainWhitelistedGasless,
  renderMadFiBadge = false,
  handlePinMetadata,
  isFollowed = false,
  onFollowPress,
  profilePictureStyleOverride,
  profileContainerStyleOverride,
  textContainerStyleOverride,
  containerBorderRadius,
  containerPadding,
  profilePadding,
  backgroundColorOverride,
  mediaImageStyleOverride,
  imageContainerStyleOverride,
  reactionsContainerStyleOverride,
  reactionContainerStyleOverride,
  markdownStyleBottomMargin,
  shareContainerStyleOverride,
  heartIconOverride,
  messageIconOverride,
  shareIconOverride,
}: {
  publicationId?: string,
  publicationData?: any,
  onClick?: (e) => void,
  onProfileClick?: (e, handleLocalName) => void,
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
  hideFollowButton?: boolean,
  hideCommentButton?: boolean,
  hideQuoteButton?: boolean,
  hideShareButton?: boolean,
  followButtonDisabled: boolean,
  followButtonBackgroundColor?: string,
  operations?: PublicationOperationsFragment,
  focusedOpenActionModuleName?: string // in case a post has multiple action modules
  useToast?: Toast // ex: react-hot-toast to render notifs
  rpcURLs?: { [chainId: number]: string },
  appDomainWhitelistedGasless?: boolean,
  renderMadFiBadge?: boolean,
  handlePinMetadata?: (content: string, files: any[]) => Promise<string> // to upload post content on bounties
  isFollowed?: boolean,
  onFollowPress?: (event, profileId) => void,
  profilePictureStyleOverride?: string,
  profileContainerStyleOverride?: (isMirror, padding?: string) => string,
  textContainerStyleOverride?: string,
  containerBorderRadius?: string,
  containerPadding?: string,
  profilePadding?: string,
  backgroundColorOverride?: string,
  mediaImageStyleOverride?: string,
  imageContainerStyleOverride?: string,
  reactionsContainerStyleOverride?: string,
  reactionContainerStyleOverride?: (color, backgroundColor, isAuthenticatedAndWithHandler, hasReacted) => string,
  markdownStyleBottomMargin?: string,
  shareContainerStyleOverride?: (color, backgroundColor) => string,
  heartIconOverride?: boolean,
  messageIconOverride?: boolean,
  shareIconOverride?: boolean,
}) {
  let [publication, setPublication] = useState<any>(publicationData)
  let [showFullText, setShowFullText] = useState(false)
  let [openActModal, setOpenActModal] = useState(false)
  const [withPlaybackError, setWithPlaybackError] = useState<boolean>(false);

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

  const actHandledExternally = renderActButtonWithCTA && onActButtonClick;

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
      onProfileClick(e, publication.by?.handle.localName);
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
    const { mirrorOf, ...original } = publication
    publication = publication.mirrorOf
    publication.original = original
  }
  publication.profile = formatProfilePicture(publication.by)
  const { profile } = publication

  // theming
  const isDarkTheme = theme === Theme.dark
  const color = isDarkTheme ? ThemeColor.white : ThemeColor.darkGray
  const backgroundColor = backgroundColorOverride ?? (isDarkTheme ? ThemeColor.lightBlack : ThemeColor.white)
  const reactionBgColor = isDarkTheme ? ThemeColor.darkGray : ThemeColor.lightGray
  const actButttonBgColor = isDarkTheme ? ThemeColor.darkGray : ThemeColor.lightGray
  const reactionTextColor = isDarkTheme ? ThemeColor.lightGray : ThemeColor.darkGray

  // style overrides
  const activeProfilePictureStyle = profilePictureStyleOverride ?? profilePictureStyle;
  const activeProfileContainerStyle = profileContainerStyleOverride ?? profileContainerStyle;
  const activeTextContainerStyle = textContainerStyleOverride ?? textContainerStyle;
  const activeMediaImageStyle = mediaImageStyleOverride ?? mediaImageStyle;
  const actiiveImageContainerStyle = imageContainerStyleOverride ?? imageContainerStyle;
  const activeReactionsContainerStyle = reactionsContainerStyleOverride ?? reactionsContainerStyle;
  const activeReactionContainerStyle = reactionContainerStyleOverride ?? reactionContainerStyle;
  const activeShareContainerStyle = shareContainerStyleOverride ?? shareContainerStyle;

  // misc
  const isAuthenticated = !!authenticatedProfile?.id;
  const renderActButton = walletClient && isAuthenticated && ((isActionModuleSupported && !isLoadingActionModuleState && !actionModuleHandler?.panicked) || actHandledExternally);
  const renderActLoading = walletClient && isAuthenticated && (isActionModuleSupported && isLoadingActionModuleState && !actionModuleHandler?.panicked && !actHandledExternally);


  let media, cover
  if (publication.metadata.asset) {
    media = publication.metadata.asset || {};
    if (media.__typename === "PublicationMetadataMediaImage") {
      media.type = 'image'
      media.original = { url: returnIpfsPathOrUrl(media.image?.optimized?.uri || media.image.raw?.uri, ipfsGateway) }
    }
    if (media.__typename === "PublicationMetadataMediaVideo") {
      media.type = 'video'
      media.original = { url: returnIpfsPathOrUrl(media.video?.optimized?.uri || media.video.raw?.uri, ipfsGateway) }
    }
    if (media.__typename === "PublicationMetadataMediaAudio") {
      media.type = 'audio'
      media.original = { url: returnIpfsPathOrUrl(media.audio?.optimized?.uri || media.audio.raw?.uri, ipfsGateway) }
    }
    if (media.cover) {
      cover = returnIpfsPathOrUrl(media.cover?.optimized?.uri || media.cover.raw?.uri, ipfsGateway)
    }
  }

  if (publication.metadata.__typename === "LiveStreamMetadataV3") {
    media = {
      type: "livestream",
      original: { url: publication.metadata.liveURL }
    };
  }

  return (
    <div
      className={publicationContainerStyle(backgroundColor, onClick ? true : false, containerBorderRadius)}
    >
      <div
        onClick={onPublicationPress}
        className={topLevelContentStyle(containerPadding)}
      >
        {/* {
            isMirror && (
              <div className={mirroredByContainerStyle}>
                <MirrorIcon color={ThemeColor.mediumGray} />
                <p>mirrored by {getDisplayName(publication.original.by)}</p>
              </div>
            )
          } */}
        <div className={activeProfileContainerStyle(isMirror, profilePadding)}>
          <div className={onProfileClick ? 'cursor-pointer' : 'cursor-default'} onClick={onProfilePress}>
            {
              publication.by?.metadata?.picture?.optimized?.uri ||
                publication.by?.metadata?.picture?.image?.optimized?.uri ? (
                <img
                  src={
                    publication.by.metadata.picture.__typename === 'NftImage' ?
                      publication.by.metadata.picture?.image?.optimized?.uri : publication.by.metadata?.picture?.optimized?.uri
                  }
                  className={activeProfilePictureStyle}
                />
              ) : (
                <div
                  className={activeProfilePictureStyle}
                />
              )
            }
          </div>
          <div className={profileDetailsContainerStyle(color)}>
            <div className="flex justify-between w-full">
              <div>
                <div className="flex gap-x-2">
                  <p className={profileNameStyle}>{getDisplayName(profile)}</p>
                  {renderMadFiBadge && <span className="mt-1"><VerifiedBadgeIcon height={20} /></span>}
                </div>
                {/* conditional due to bounties */}
                {publication.createdAt && (
                  <p className={dateStyle}> {formatDistance(new Date(publication.createdAt), new Date())} ago</p>
                )}
              </div>
              <div style={getButtonContainerStyle(hideFollowButton)}>
                <button
                  disabled={followButtonDisabled || isFollowed}
                  onClick={(e) => onFollowPress ? onFollowPress(e, publication.by.id) : undefined}
                  style={
                    getButtonStyle(
                      theme,
                      !followButtonDisabled ? followButtonBackgroundColor : ThemeColor.darkGray,
                      undefined, // followButtonTextColor
                      followButtonDisabled || isFollowed
                    )
                  }
                >{!isFollowed ? "Follow" : "Following"}</button>
              </div>
            </div>
          </div>
        </div>
        <div className={activeTextContainerStyle}>
          <ReactMarkdown
            className={markdownStyle(color, fontSize, markdownStyleBottomMargin)}
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
              <div className={actiiveImageContainerStyle}>
                <img
                  className={activeMediaImageStyle}
                  src={publication.metadata.asset?.image?.optimized?.uri || returnIpfsPathOrUrl(publication.metadata.asset.image.raw.uri)}
                  onClick={onPublicationPress}
                />
              </div>
            )
          }
          {
            (publication.metadata?.__typename === "VideoMetadataV3" || publication.metadata?.__typename === "LiveStreamMetadataV3") && (
              <div className={videoContainerStyle}>
                <ReactPlayer
                  className={videoStyle}
                  url={media.original.url}
                  controls={!withPlaybackError}
                  onError={() => {
                    if (!withPlaybackError) setWithPlaybackError(true);
                  }}
                  muted
                  playing={true}
                />
                {publication.metadata?.__typename === "LiveStreamMetadataV3" && !withPlaybackError && (
                  <div className={liveContainerStyle}>
                    <div className={liveDotStyle} />
                    LIVE
                  </div>
                )}
                {publication.metadata?.__typename === "LiveStreamMetadataV3" && withPlaybackError && (
                  <div className={endedContainerStyle}>
                    <VideoCameraSlashIcon color={reactionTextColor} />
                    <p>Stream Ended</p>
                  </div>
                )}
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
        className={activeReactionsContainerStyle}
        onClick={onPublicationPress}
      >
        {!isEmpty(publication.stats) && (
          <>
            <div
              className={activeReactionContainerStyle(reactionTextColor, reactionBgColor, isAuthenticated && onLikeButtonClick, operations?.hasUpvoted)}
              onClick={(e) => { if (onLikeButtonClick) onLikeButtonClick(e, publication) }}
            >
              {heartIconOverride ? <NewHeartIcon color={!operations?.hasUpvoted ? reactionTextColor : ThemeColor.red} /> : <HeartIcon color={!operations?.hasUpvoted ? reactionTextColor : ThemeColor.red} />}
              {publication.stats.upvotes > 0 && <p>{publication.stats.upvotes > 0 ? publication.stats.upvotes : null}</p>}
            </div>
            {!hideCommentButton && (
              <div
                className={activeReactionContainerStyle(reactionTextColor, reactionBgColor, isAuthenticated && onCommentButtonClick, false)}
                onClick={onCommentPress}
              >
                {messageIconOverride ? <NewMessageIcon color={reactionTextColor} /> : <MessageIcon color={reactionTextColor} />}
                {publication.stats.comments > 0 && <p>{publication.stats.comments > 0 ? publication.stats.comments : null}</p>}
              </div>
            )}
            {!hideQuoteButton && (
              <div
                className={activeReactionContainerStyle(reactionTextColor, reactionBgColor, isAuthenticated && onMirrorButtonClick, operations?.hasMirrored)}
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
              <div className={activeShareContainerStyle(reactionTextColor, reactionBgColor)}>
                <Spinner customClasses="h-6 w-6" color={color} />
              </div>
            )}
            {!(renderActButton || renderActLoading) && !hideShareButton && (
              <div
                className={activeShareContainerStyle(reactionTextColor, reactionBgColor)}
                onClick={onShareButtonClick}
              >
                {shareIconOverride ? < NewShareIcon color={reactionTextColor} /> : <ShareIcon color={reactionTextColor} />}
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

const topLevelContentStyle = (padding?: string) => css`
  padding: ${padding ?? '12px 18px 0px'};
`

const imageContainerStyle = css`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
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

const markdownStyle = (color, fontSize, bottomMargin?: string) => css`
  color: ${color};
  overflow: hidden;
  li {
    font-size: ${fontSize || '14px'};
  }
  p {
    font-size: ${fontSize || '14px'};
    margin-bottom: ${bottomMargin ?? '5px'};
  }
`

const profileContainerStyle = (isMirror, padding?: string) => css`
  display: flex;
  align-items: center;
  padding: ${padding ?? (isMirror ? '2px 0 0 0' : '6px 0 0 0')};
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
  min-width: 42px;
  min-height: 42px;
  max-width: 42px;
  max-height: 42px;
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

const publicationContainerStyle = (color, onClick: boolean, containerBorderRadius?: string) => css`
  max-width: 510px;
  width: 100%;
  background-color: ${color};
  cursor: ${onClick ? 'pointer' : 'default'};
  border-radius: ${containerBorderRadius ?? '18px'};
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
  width: 100%;
  p {
    margin: 0;
    color: ${color};
  }
`

const liveContainerStyle = css`
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
  display: flex;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.25);
  padding: 5px 10px;
  border-radius: 5px;
  color: white;
  font-weight: bold;
`

const liveDotStyle = css`
  width: 10px;
  height: 10px;
  background-color: red;
  border-radius: 50%;
  margin-right: 5px;
  animation: flash 3s linear infinite;

  @keyframes flash {
    0% { opacity: 1; }
    50% { opacity: 0.25; }
    100% { opacity: 1; }
  }
`

const endedContainerStyle = css`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.25);
  padding: 5px 10px;
  border-radius: 5px;
  color: white;
  font-weight: bold;
  gap: 5px; // Adjust as needed for space between icon and text
`;

function getButtonContainerStyle(hidden) {
  return {
    display: 'flex',
    flex: 1,
    justifyContent: 'flex-end',
    visibility: hidden ? 'hidden' : 'visible' as any
  }
}