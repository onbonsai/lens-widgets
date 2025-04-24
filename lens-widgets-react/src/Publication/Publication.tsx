import { useEffect, useState, useRef } from 'react'
import { css } from '@emotion/css'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import { ThemeColor, Theme } from '../types'
import { isEmpty } from 'lodash/lang';
import {
  MessageIcon, MirrorIcon, HeartIcon, ShareIcon, VideoCameraSlashIcon
} from '../icons'
import {
  getSubstring,
  formatHandleColors,
  getDisplayName,
} from '../utils'
import { AudioPlayer } from '../AudioPlayer'
import { useSupportedActionModule } from '../hooks/useSupportedActionModule';
import Spinner from '../components/Spinner';
import { WalletClient } from 'viem';
import { Toast } from '../types';
import { VerifiedBadgeIcon } from "../icons"
import { getButtonStyle } from "../Profile"
import { NewHeartIcon } from '../icons/NewHeartIcon';
import { NewMessageIcon } from '../icons/NewMessageIcon';
import { NewShareIcon } from '../icons/NewShareIcon';
import { NewColllectIcon } from '../icons/NewCollectIcon'
import { PublicClient, testnet, staging } from "@lens-protocol/client";
import { evmAddress, postId, txHash } from "@lens-protocol/client";
import { fetchPost } from "@lens-protocol/client/actions";
import { storageClient, DEFAULT_LENS_PROFILE_IMAGE, formatCustomDate } from '../utils'

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
  onCollectButtonClick,
  hideFollowButton = true,
  hideCommentButton = false,
  hideQuoteButton = false,
  hideShareButton = false,
  hideCollectButton = false,
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
  profileNameStyleOverride,
  dateNameStyleOverride,
  heartIconOverride,
  messageIconOverride,
  shareIconOverride,
  actButtonContainerStyleOverride,
  profileMaxWidth = '200px',
  usernameMaxWidth = '150px',
  fullVideoHeight = false,
  playVideo = true,
  hideVideoControls = false,
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
  onCollectButtonClick?: (e) => void,
  hideFollowButton?: boolean,
  hideCommentButton?: boolean,
  hideQuoteButton?: boolean,
  hideShareButton?: boolean,
  hideCollectButton?: boolean,
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
  profileNameStyleOverride?: string,
  dateNameStyleOverride?: string,
  shareContainerStyleOverride?: (color, backgroundColor) => string,
  heartIconOverride?: boolean,
  messageIconOverride?: boolean,
  shareIconOverride?: boolean,
  actButtonContainerStyleOverride?: (color, backgroundColor, disabled?: boolean) => string,
  profileMaxWidth?: string,
  usernameMaxWidth?: string,
  fullVideoHeight?: boolean,
  playVideo?: boolean,
  hideVideoControls?: boolean,
}) {
  let [publication, setPublication] = useState<any>(publicationData)
  let [showFullText, setShowFullText] = useState(false)
  let [openActModal, setOpenActModal] = useState(false)
  const [withPlaybackError, setWithPlaybackError] = useState<boolean>(false)
  const [assetUrl, setAssetUrl] = useState<string>("")
  const videoRef = useRef<HTMLVideoElement>(null);

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
    if (videoRef.current) {
      if (playVideo) {
        videoRef.current.play().catch(error => {
          console.error("Video autoplay prevented: ", error);
        });
      } else {
        videoRef.current.pause();
      }
    }
  }, [playVideo, assetUrl]);

  useEffect(() => {
    const resolveAssetUrl = async () => {
      if (publication.metadata.__typename === "ImageMetadata") {
        const url = publication.metadata.image.item.startsWith("lens://")
          ? await storageClient.resolve(publication.metadata.image.item)
          : publication.metadata.image.item;
        setAssetUrl(url);
      } else if (publication.metadata.__typename === "VideoMetadata") {
        const url = publication.metadata.video.item.startsWith("lens://")
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
    if (onProfileClick && publication.author.username?.localName) {
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
  const activeImageContainerStyle = imageContainerStyleOverride ?? imageContainerStyle;
  const activeReactionsContainerStyle = reactionsContainerStyleOverride ?? reactionsContainerStyle;
  const activeReactionContainerStyle = reactionContainerStyleOverride ?? reactionContainerStyle;
  const activeShareContainerStyle = shareContainerStyleOverride ?? shareContainerStyle;
  const activeActContainerStyle = actButtonContainerStyleOverride ?? actButtonContainerStyle;
  const activeProfileNameStyle = profileNameStyleOverride ?? profileNameStyle;
  const activeDateStyle = dateNameStyleOverride ?? dateStyle;

  // misc
  const isAuthenticated = !!authenticatedProfile?.address;
  const renderActButton = walletClient && isAuthenticated && ((isActionModuleSupported && !isLoadingActionModuleState && !actionModuleHandler?.panicked) || actHandledExternally);
  const renderActLoading = walletClient && isAuthenticated && (isActionModuleSupported && isLoadingActionModuleState && !actionModuleHandler?.panicked && !actHandledExternally);


  let cover; // TODO: handle audio cover


  const PostProfileAndTextContent = (props: { isTop?: boolean }) => (
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
          <img
            src={publication.author?.metadata?.picture || DEFAULT_LENS_PROFILE_IMAGE}
            className={activeProfilePictureStyle}
          />
        </div>
        <div className={profileDetailsContainerStyle(color)}>
          <div className="flex items-center gap-x-2 w-fit">
            <p onClick={onProfilePress} className={profileNameStyle(profileMaxWidth)}>{getDisplayName(author)}</p>
            <p onClick={onProfilePress} className={usernameStyle(usernameMaxWidth)}>@{author.username?.localName}</p>
            <div className="flex items-center">
              <span className="mx-2 text-sm opacity-60">•</span>
            </div>
            <p
              className={timestampStyle}
            >
              {formatCustomDate(publication.timestamp)}
            </p>
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
            : formatHandleColors(getSubstring(publication.metadata.content, 250))}
        </ReactMarkdown>
        {publication.metadata.content.length > 250 && (
          <div style={{ display: 'flex', marginRight: 5 }}>
            <button className={showMoreStyle} onClick={(event) => {
              event.stopPropagation()
              setShowFullText(!showFullText)
            }}>
              {showFullText ? 'Show Less' : 'Show More'}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div
      className={publicationContainerStyle(backgroundColor, onClick ? true : false, containerBorderRadius, publication.metadata?.__typename === "VideoMetadata" || publication.metadata?.__typename === "LiveStreamMetadata")}
    >
      <PostProfileAndTextContent isTop />
      <div>
        {!isLoadingActionModuleState && !actionModuleHandler?.mintableNFT && (
          <>
            {
              publication.metadata?.__typename === "ImageMetadata" && (
                <div className={activeImageContainerStyle}>
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
                <div className={videoContainerStyle(fullVideoHeight)}>
                  <video
                    ref={videoRef}
                    src={assetUrl}
                    controls={!hideVideoControls && !withPlaybackError}
                    muted
                    autoPlay={playVideo}
                    onError={() => {
                      if (!withPlaybackError) setWithPlaybackError(true);
                    }}
                    className={videoStyle}
                    crossOrigin="anonymous"
                    playsInline
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
                  className={activeReactionContainerStyle(reactionTextColor, reactionBgColor, isAuthenticated && onCommentButtonClick && operations?.canComment, false)}
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
                  {(publication.stats.mirrors + publication.stats.quotes > 0) ? <p>{publication.stats.mirrors + publication.stats.quotes}</p> : null}
                </div>
              )}
              {!hideCollectButton && (
                <div
                  className={activeReactionContainerStyle(reactionTextColor, reactionBgColor, isAuthenticated && onCollectButtonClick, operations?.hasCollected)}
                  onClick={onCollectButtonClick}
                >
                  <NewColllectIcon fillColor={!operations?.hasCollected ? reactionTextColor : ThemeColor.transparent} outlineColor={reactionTextColor} />
                  {(publication.stats.collects > 0) ? <p>{publication.stats.collects}</p> : null}
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
              {!hideShareButton && (
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
    </div>
  )
}

const showMoreStyle = css`
  color: ${ThemeColor.lightGreen};
  font-size: 14px;
  padding-top: 4px;
  transition: opacity 0.2s ease;
  &:hover {
    opacity: 0.6;
  }
  margin-left: auto;
  display: block;
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

const videoContainerStyle = (fullVideoHeight: boolean = false) => css`
  position: relative;
  width: 100%;
  height: ${fullVideoHeight ? 'auto' : '480px'};
  background-color: black;
`

const audioContainerStyle = css`
margin-top: 14px;
`

const videoStyle = css`
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
`
const mediaImageStyle = css`
  width: 100%;
  height: auto;
  display: block;
  object-fit: contain;
  max-height: 100%;
`

const markdownStyle = (color, fontSize, bottomMargin?: string) => css`
  color: ${color};
  overflow: hidden;
  li {
    font-size: ${fontSize || '16px'};
  }
  p {
    font-size: ${fontSize || '16px'};
    margin-bottom: ${bottomMargin ?? '5px'};
  }
`

const profileContainerStyle = (isMirror, padding?: string) => css`
  display: flex;
  align-items: center;
  padding: ${padding ?? (isMirror ? '2px 0 0 0' : '6px 0 0 0')};
`
const system = css`
  font-family: inherit !important;
`

const profileNameStyle = (profileMaxWidth) => css`
  font-weight: 600;
  font-size: 16px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: ${profileMaxWidth};
`

const usernameStyle = (usernameMaxWidth) => css`
  opacity: 0.6;
  font-size: 14px;
  color: inherit;
  line-height: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: ${usernameMaxWidth};
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

const publicationContainerStyle = (color, onClick: boolean, containerBorderRadius?: string, isVideo = false) => css`
  width: ${isVideo ? 'fit-content' : '100%'};
  min-width: 350px;
  background-color: ${color};
  cursor: ${onClick ? 'pointer' : 'default'};
  border-radius: ${containerBorderRadius ?? '18px'};
  @media (max-width: 510px) {
    width: 100%;
    min-width: unset;
    max-width: 510px;
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

const timestampStyle = css`
  opacity: 0.6;
  flex-grow: 1;
  font-size: 14px;
  color: inherit;
  cursor: help;
`

const activeProfileNameStyle = css`
  font-weight: 600;
  font-size: 16px;
  flex-grow: 1;
`
