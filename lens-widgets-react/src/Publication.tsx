import { ReactNode, useEffect, useState } from 'react'
import { css } from '@emotion/css'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import { ThemeColor, Theme } from './types'
import { formatDistance } from 'date-fns'
import { isEmpty } from 'lodash/lang';
import {
  MessageIcon, MirrorIcon, HeartIcon, ShareIcon, VideoCameraSlashIcon
} from './icons'
import {
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
import { WalletClient } from 'viem';
import { Toast } from './types';
import { VerifiedBadgeIcon } from "./icons"
import { getButtonStyle } from "./Profile"
import { NewHeartIcon } from './icons/NewHeartIcon';
import { NewMessageIcon } from './icons/NewMessageIcon';
import { NewShareIcon } from './icons/NewShareIcon';
import { PublicClient, testnet, staging } from "@lens-protocol/client";
import { evmAddress, postId, txHash } from "@lens-protocol/client";
import { fetchPost } from "@lens-protocol/client/actions";
import { storageClient } from './utils'

export function Publication({
  publicationId,
  onClick,
  onProfileClick,
  publicationData,
  theme = Theme.default,
  ipfsGateway,
  fontSize,
  environment,
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
  actButtonContainerStyleOverride,
}: {
  publicationId?: string,
  publicationData?: any,
  onClick?: (e) => void,
  onProfileClick?: (e, handleLocalName) => void,
  theme?: Theme,
  ipfsGateway?: string,
  fontSize?: string,
  environment?: any,
  authenticatedProfile?: any,
  walletClient?: WalletClient,
  renderActButtonWithCTA?: string,
  onActButtonClick?: (e, actionModuleHandler?: any) => void,
  onCommentButtonClick?: (e, actionModuleHandler?: any) => void,
  onMirrorButtonClick?: (e, actionModuleHandler?: any) => void,
  onLikeButtonClick?: (e, p) => void,
  onShareButtonClick?: (e) => void,
  hideFollowButton?: boolean,
  hideCommentButton?: boolean,
  hideQuoteButton?: boolean,
  hideShareButton?: boolean,
  followButtonDisabled: boolean,
  followButtonBackgroundColor?: string,
  operations?: any,
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
  actButtonContainerStyleOverride?: (color, backgroundColor, disabled?: boolean) => string,
}) {
  let [publication, setPublication] = useState<any>(publicationData)
  let [showFullText, setShowFullText] = useState(false)
  let [openActModal, setOpenActModal] = useState(false)
  const [withPlaybackError, setWithPlaybackError] = useState<boolean>(false);

  const [assetUrl, setAssetUrl] = useState<string>("");

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

  useEffect(() => {
    const resolveAssetUrl = async () => {
      if (publication.metadata.__typename === "ImageMetadata") {
        const url = publication.metadata.image.item.startsWith("lens://")
          ? await storageClient.resolve(publication.metadata.image.item)
          : publication.metadata.image.item;
        setAssetUrl(url);
      } else if (publication.metadata.__typename === "VideoMetadata") {
        const url = publication.metadata.image.item.startsWith("lens://")
          ? await storageClient.resolve(publication.metadata.video.item)
          : publication.metadata.video.item;
        setAssetUrl(url);
      }
    }
    if (publication) {
      resolveAssetUrl();
    }
  }, [publication]);

  async function fetchPublication() {
    try {
      const lensClient = PublicClient.create({
        environment,
      });
      const result = await fetchPost(lensClient, {
        post: postId(publicationId!),
      });
      if (result.isErr()) {
        return console.error(result.error);
      }
      setPublication(result.value);
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
      onProfileClick(e, publication.author.username.localName);
    } else {
      // if (profile) {
      //   const { localName, namespace } = profile.handle
      //   const URI = `https://share.lens.xyz/u/${localName}.${namespace}`
      //   window.open(URI, '_blank')
      // }
    }
  }

  function _onActButtonClick(e) {
    // if (actionModuleHandler?.disabled) return;

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
  const { author } = publication

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
  const activeActContainerStyle = actButtonContainerStyleOverride ?? actButtonContainerStyle;

  // misc
  const isAuthenticated = !!authenticatedProfile?.address;
  const renderActButton = walletClient && isAuthenticated && ((isActionModuleSupported && !isLoadingActionModuleState && !actionModuleHandler?.panicked) || actHandledExternally);
  const renderActLoading = walletClient && isAuthenticated && (isActionModuleSupported && isLoadingActionModuleState && !actionModuleHandler?.panicked && !actHandledExternally);


  let cover; // TODO: handle audio cover

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
              publication.author?.metadata?.picture ? (
                <img
                  src={publication.author?.metadata?.picture}
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
                  <p className={profileNameStyle}>{getDisplayName(author)}</p>
                  {renderMadFiBadge && <span className="mt-1"><VerifiedBadgeIcon height={20} /></span>}
                </div>
                {/* conditional due to bounties */}
                {publication.timestamp && (
                  <p className={dateStyle}> {formatDistance(new Date(publication.timestamp), new Date())} ago</p>
                )}
              </div>
              {/* TODO: add follow button */}
              {/* <div style={getButtonContainerStyle(hideFollowButton)}>
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
              </div> */}
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
      {!isLoadingActionModuleState && !actionModuleHandler?.mintableNFT && (
        <>
          {
            publication.metadata?.__typename === "ImageMetadata" && (
              <div className={actiiveImageContainerStyle}>
                <img
                  className={activeMediaImageStyle}
                  src={assetUrl}
                  onClick={onPublicationPress}
                />
              </div>
            )
          }
          {
            (publication.metadata?.__typename === "VideoMetadata" || publication.metadata?.__typename === "LiveStreamMetadata") && (
              <div className={videoContainerStyle}>
                <ReactPlayer
                  className={videoStyle}
                  url={assetUrl}
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
            publication.metadata?.__typename === "AudioMetadata" && (
              <div className={audioContainerStyle}>
                <AudioPlayer
                  url={assetUrl}
                  theme={theme}
                  cover={cover}
                  profile={publication.by}
                />
              </div>
            )
          }
        </>
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
              {heartIconOverride ? <NewHeartIcon fillColor={!operations?.hasUpvoted ? ThemeColor.transparent : ThemeColor.red} outlineColor={!operations?.hasUpvoted ? reactionTextColor : ThemeColor.red} /> : <HeartIcon color={!operations?.hasUpvoted ? reactionTextColor : ThemeColor.red} />}
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
                <p>{publication.stats.mirrors + publication.stats.quotes}</p>
              </div>
            )}
            {renderActButton && (
              <div
                className={activeActContainerStyle(reactionTextColor, actButttonBgColor, actionModuleHandler?.disabled)}
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