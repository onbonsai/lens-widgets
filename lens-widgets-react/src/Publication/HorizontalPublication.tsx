import { ReactNode, useEffect, useRef, useState } from 'react'
import { css } from '@emotion/css'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import { ThemeColor, Theme } from '../types'
import { formatDistance } from 'date-fns'
import { isEmpty } from 'lodash/lang'
import {
  MirrorIcon,
  VideoCameraSlashIcon
} from '../icons'
import {
  systemFonts,
  getSubstring,
  formatHandleColors,
  getDisplayName,
} from '../utils'
import ReactPlayer from 'react-player'
import { AudioPlayer } from '../AudioPlayer'
import { useSupportedActionModule } from '../hooks/useSupportedActionModule'
import Spinner from '../components/Spinner'
import { WalletClient } from 'viem'
import { Toast } from '../types'
import { NewHeartIcon } from '../icons/NewHeartIcon'
import { NewMessageIcon } from '../icons/NewMessageIcon'
import { NewShareIcon } from '../icons/NewShareIcon'
import { NewColllectIcon } from '../icons/NewCollectIcon'
import { PublicClient } from '@lens-protocol/client'
import { postId } from '@lens-protocol/client'
import { fetchPost } from '@lens-protocol/client/actions'
import { storageClient, DEFAULT_LENS_PROFILE_IMAGE } from '../utils'

export function HorizontalPublication({
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
  hideCollectButton= false,
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
  nestedWidget,
}: {
  publicationId?: string
  publicationData?: any
  onClick?: (e) => void
  onProfileClick?: (e, handleLocalName) => void
  theme?: Theme
  ipfsGateway?: string
  fontSize?: string
  environment?: any
  authenticatedProfile?: any
  walletClient?: WalletClient
  renderActButtonWithCTA?: string
  onActButtonClick?: (e, actionModuleHandler?: any) => void
  onCommentButtonClick?: (e, actionModuleHandler?: any) => void
  onMirrorButtonClick?: (e, actionModuleHandler?: any) => void
  onLikeButtonClick?: (e, p) => void
  onShareButtonClick?: (e) => void
  onCollectButtonClick?: (e) => void
  hideFollowButton?: boolean
  hideCommentButton?: boolean
  hideQuoteButton?: boolean
  hideShareButton?: boolean
  hideCollectButton?: boolean
  followButtonDisabled: boolean
  followButtonBackgroundColor?: string
  operations?: any
  focusedOpenActionModuleName?: string // in case a post has multiple action modules
  useToast?: Toast // ex: react-hot-toast to render notifs
  rpcURLs?: { [chainId: number]: string }
  appDomainWhitelistedGasless?: boolean
  renderMadFiBadge?: boolean
  handlePinMetadata?: (content: string, files: any[]) => Promise<string> // to upload post content on bounties
  isFollowed?: boolean
  onFollowPress?: (event, profileId) => void
  nestedWidget?: ReactNode
}) {
  const [publication, setPublication] = useState<any>(publicationData)
  const [showFullText, setShowFullText] = useState(false)
  const [openActModal, setOpenActModal] = useState(false)
  const [withPlaybackError, setWithPlaybackError] = useState<boolean>(false)
  const [assetUrl, setAssetUrl] = useState<string>("")

  const [leftColumnHeight, setLeftColumnHeight] = useState<number>(0)
  const imageRef = useRef<HTMLImageElement | HTMLIFrameElement | null>(null)

  const measureImageHeight = () => {
    requestAnimationFrame(() => {
      if (imageRef.current) {
        setLeftColumnHeight(imageRef.current.clientHeight)
      }
    })
  }

  const handleImageLoad = () => {
    measureImageHeight()
  }

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
  )

  const actHandledExternally = renderActButtonWithCTA && onActButtonClick

  useEffect(() => {
    if (!publicationData) {
      fetchPublication()
    } else {
      setPublication(publicationData)
    }
  }, [publicationId])

  useEffect(() => {
    window.addEventListener('resize', measureImageHeight)
    return () => {
      window.removeEventListener('resize', measureImageHeight)
    }
  }, [])

  useEffect(() => {
    if (!publication) return

    const resolveAssetUrl = async () => {
      if (publication.metadata.__typename === 'ImageMetadata') {
        const url = publication.metadata.image.item.startsWith('lens://')
          ? await storageClient.resolve(publication.metadata.image.item)
          : publication.metadata.image.item
        setAssetUrl(url)
      } else if (publication.metadata.__typename === 'VideoMetadata') {
        const url = publication.metadata.image.item.startsWith('lens://')
          ? await storageClient.resolve(publication.metadata.video.item)
          : publication.metadata.video.item
        setAssetUrl(url)
      }
    }
    resolveAssetUrl()
  }, [publication])

  async function fetchPublication() {
    try {
      const lensClient = PublicClient.create({ environment })
      const result = await fetchPost(lensClient, { post: postId(publicationId!) })
      if (result.isErr()) {
        return console.error(result.error)
      }
      setPublication(result.value)
    } catch (err) {
      console.log('error fetching publication: ', err)
    }
  }

  function onPublicationPress(e) {
    if (onClick) {
      onClick(e)
    }
  }

  function onProfilePress(e) {
    onProfileClick?.(e, publication.author.username.localName)
  }

  function _onActButtonClick(e) {
    if (isActionModuleSupported && !actHandledExternally) {
      e.preventDefault()
      e.stopPropagation()
      setOpenActModal(true)
    } else if (actHandledExternally) {
      onActButtonClick?.(e, actionModuleHandler)
    }
  }

  function onCommentPress(e) {
    onCommentButtonClick?.(e, actionModuleHandler)
  }

  function onMirrorPress(e) {
    onMirrorButtonClick?.(e, actionModuleHandler)
  }

  if (!publication) return null

  let isMirror = false
  if (publication.mirrorOf) {
    isMirror = true
    const { mirrorOf, ...original } = publication
    setPublication(publication.mirrorOf)
    publication.original = original
  }

  const { author } = publication

  // theming
  const isDarkTheme = theme === Theme.dark
  const color = isDarkTheme ? ThemeColor.white : ThemeColor.darkGray
  const backgroundColor = isDarkTheme ? ThemeColor.lightBlack : ThemeColor.white
  const reactionBgColor = isDarkTheme ? ThemeColor.darkGray : ThemeColor.lightGray
  const actButttonBgColor = isDarkTheme ? ThemeColor.darkGray : ThemeColor.lightGray
  const reactionTextColor = isDarkTheme ? ThemeColor.lightGray : ThemeColor.darkGray

  const isAuthenticated = !!authenticatedProfile?.address
  const renderActButton =
    walletClient &&
    isAuthenticated &&
    ((isActionModuleSupported && !isLoadingActionModuleState && !actionModuleHandler?.panicked) ||
      actHandledExternally)

  const renderActLoading =
    walletClient &&
    isAuthenticated &&
    (isActionModuleSupported && isLoadingActionModuleState && !actionModuleHandler?.panicked && !actHandledExternally)

  let cover // TODO: handle audio cover

  function getCanvasUrl(publication: any): string | null {
    if (!publication?.metadata?.attributes) return null

    const isCanvas = publication.metadata.attributes.find(attr => attr.key === 'isCanvas')
    if (!isCanvas) return null

    const apiUrl = publication.metadata.attributes.find(attr => attr.key === 'apiUrl')
    if (!apiUrl?.value) return null

    return `${apiUrl.value}/post/${publication.id}/canvas`
  }

  const PostProfileAndTextContent = () => (
    <div onClick={onPublicationPress} className={topLevelContentStyle}>
      <div className={profileContainerStyle(isMirror)}>
        <div
          className={onProfileClick ? 'cursor-pointer' : 'cursor-default'}
          onClick={onProfilePress}
        >
          <img
            src={author?.metadata?.picture || DEFAULT_LENS_PROFILE_IMAGE}
            className={profilePictureStyle}
          />
        </div>
        <div className={profileDetailsContainerStyle(color)}>
          <div className="flex justify-between w-full">
            <div>
              <div className="flex gap-x-2">
                <p className={profileNameStyle}>{getDisplayName(author)}</p>
              </div>
              {publication.timestamp && (
                <p className={dateStyle}>
                  {formatDistance(new Date(publication.timestamp), new Date())} ago
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className={textContainerStyle}>
        <ReactMarkdown
          className={markdownStyle(color, fontSize)}
          rehypePlugins={[rehypeRaw]}
        >
          {showFullText
            ? formatHandleColors(publication.metadata.content)
            : formatHandleColors(getSubstring(publication.metadata.content, 1000))}
        </ReactMarkdown>
        {publication.metadata.content.length > 1000 && (
          <div style={{ display: 'flex', marginRight: 5 }}>
            <button
              className={showMoreStyle}
              onClick={(event) => {
                event.stopPropagation()
                setShowFullText(!showFullText)
              }}
            >
              {showFullText ? 'Show Less' : 'Show More'}
            </button>
          </div>
        )}
      </div>
      {nestedWidget}
    </div>
  )

  return (
    <div
      className={publicationContainerStyle(backgroundColor)}
      style={{ height: leftColumnHeight > 0 ? leftColumnHeight : 'auto', minHeight: '40vh' }}
    >
      <div className={leftColumnStyle}>
        {!isLoadingActionModuleState && !actionModuleHandler?.mintableNFT && (
          <>
            <div></div>
            {getCanvasUrl(publication) ? (
              <div className={iframeContainerStyle}>
                {operations?.hasCollected ? (
                  <iframe
                    src={getCanvasUrl(publication) || ""}
                    className={iframeStyle}
                    ref={imageRef as React.RefObject<HTMLIFrameElement>}
                    onLoad={(e: React.SyntheticEvent<HTMLIFrameElement>) => handleImageLoad()}
                  />
                ) : null}
              </div>
            ) : (
              <>
                {publication.metadata?.__typename === 'ImageMetadata' && (
                  <div className={imageContainerStyle}>
                    <img
                      ref={imageRef as React.RefObject<HTMLImageElement>}
                      onLoad={handleImageLoad}
                      className={mediaImageStyle}
                      src={assetUrl}
                      onClick={onPublicationPress}
                      alt="Publication Image"
                    />
                  </div>
                )}
                {(publication.metadata?.__typename === 'VideoMetadata' ||
                  publication.metadata?.__typename === 'LiveStreamMetadata') && (
                    <div className={videoContainerStyle}>
                      <ReactPlayer
                        className={videoStyle}
                        url={assetUrl}
                        controls={!withPlaybackError}
                        onError={() => {
                          if (!withPlaybackError) setWithPlaybackError(true)
                        }}
                        muted
                        playing={true}
                        onReady={() => {
                          measureImageHeight()
                        }}
                      />
                      {publication.metadata?.__typename === 'LiveStreamMetadataV3' &&
                        !withPlaybackError && (
                          <div className={liveContainerStyle}>
                            <div className={liveDotStyle} />
                            LIVE
                          </div>
                        )}
                      {publication.metadata?.__typename === 'LiveStreamMetadataV3' &&
                        withPlaybackError && (
                          <div className={endedContainerStyle}>
                            <VideoCameraSlashIcon color={reactionTextColor} />
                            <p>Stream Ended</p>
                          </div>
                        )}
                    </div>
                  )}
                {publication.metadata?.__typename === 'AudioMetadata' && (
                  <div className={audioContainerStyle}>
                    <AudioPlayer
                      url={assetUrl}
                      theme={theme}
                      cover={cover}
                      profile={publication.by}
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}
        <div className={reactionsContainerStyle} onClick={onPublicationPress}>
          {!isEmpty(publication.stats) && (
            <>
              <div
                className={reactionContainerStyle(
                  reactionTextColor,
                  reactionBgColor,
                  isAuthenticated && onLikeButtonClick,
                  operations?.hasUpvoted
                )}
                onClick={(e) => {
                  onLikeButtonClick?.(e, publication)
                }}
              >
                <NewHeartIcon
                  fillColor={
                    !operations?.hasUpvoted
                      ? ThemeColor.transparent
                      : ThemeColor.red
                  }
                  outlineColor={
                    !operations?.hasUpvoted
                      ? reactionTextColor
                      : ThemeColor.red
                  }
                />
                {publication.stats.upvotes > 0 && (
                  <p>{publication.stats.upvotes}</p>
                )}
              </div>
              {!hideCommentButton && (
                <div
                  className={reactionContainerStyle(
                    reactionTextColor,
                    reactionBgColor,
                    isAuthenticated && onCommentButtonClick,
                    operations?.canComment
                  )}
                  onClick={onCommentPress}
                >
                  <NewMessageIcon color={reactionTextColor} />
                  {publication.stats.comments > 0 && (
                    <p>{publication.stats.comments}</p>
                  )}
                </div>
              )}
              {!hideQuoteButton && (
                <div
                  className={reactionContainerStyle(
                    reactionTextColor,
                    reactionBgColor,
                    isAuthenticated && onMirrorButtonClick,
                    operations?.hasMirrored
                  )}
                  onClick={onMirrorPress}
                >
                  <MirrorIcon color={!operations?.hasMirrored ? reactionTextColor : ThemeColor.lightGreen} />
                  {(publication.stats.mirrors + publication.stats.quotes > 0) ? <p>{publication.stats.mirrors + publication.stats.quotes}</p> : null}
                </div>
              )}
              {!hideCollectButton && (
                <div
                  className={reactionContainerStyle(reactionTextColor, reactionBgColor, isAuthenticated && onCollectButtonClick, operations?.hasCollected)}
                  onClick={onCollectButtonClick}
                >
                  <NewColllectIcon fillColor={operations?.hasCollected ? reactionTextColor : ThemeColor.transparent} outlineColor={reactionTextColor} />
                  {(publication.stats.collects > 0) ? <p>{publication.stats.collects}</p> : null}
                </div>
              )}
              {renderActButton && (
                <div
                  className={actButtonContainerStyle(
                    reactionTextColor,
                    actButttonBgColor,
                    actionModuleHandler?.disabled
                  )}
                  onClick={_onActButtonClick}
                >
                  <p>
                    {actHandledExternally
                      ? renderActButtonWithCTA
                      : actionModuleHandler?.getActButtonLabel()}
                  </p>
                </div>
              )}
              {renderActLoading && (
                <div className={shareContainerStyle(reactionTextColor, reactionBgColor)}>
                  <Spinner customClasses="h-6 w-6" color={color} />
                </div>
              )}
              {!hideShareButton && (
                <div
                  className={shareContainerStyle(reactionTextColor, reactionBgColor)}
                  onClick={onShareButtonClick}
                >
                  <NewShareIcon color={reactionTextColor} />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className={rightColumnStyle}>
        <PostProfileAndTextContent />
      </div>
    </div>
  )
}

/** STYLES **/

const showMoreStyle = css`
  color: ${ThemeColor.lightGreen};
  font-size: 14px;
  padding-top: 4px;
  padding-bottom: 4px;
  transition: opacity 0.2s ease;
  &:hover {
    opacity: 0.6;
  }
  margin-left: auto;
  display: block;
`

const textContainerStyle = css`
  padding-top: 16px;
  margin-bottom: 16px;
  font-size: 16px;
  line-height: 20px;
  font-family: var(--font-inter), sans-serif;
`

const topLevelContentStyle = css`
  padding: 12px;
  /* The right column's content can be tall. It will scroll if it overflows. */
`

const publicationContainerStyle = (backgroundColor: string) => css`
  width: 100%;
  background-color: ${backgroundColor};
  display: flex;
  flex-direction: row;
  overflow: hidden;
  margin-bottom: 4px;
  border-radius: 24px;
  font-family: ${systemFonts} !important;
`

const leftColumnStyle = css`
  flex: 0 0 50%;
  max-width: 75%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`

const rightColumnStyle = css`
  flex: 1;
  overflow-y: auto;
  margin-left: 6px;
`

const imageContainerStyle = css`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  width: 100%;
  overflow: hidden;
  border-radius: 16px;
`

const mediaImageStyle = css`
  width: 100%;
  height: auto;
  display: block;
  border-radius: 16px;
  object-fit: cover;
`

const videoContainerStyle = css`
  position: relative !important;
  margin-top: 14px;
`

const audioContainerStyle = css`
  margin-top: 14px;
`

const videoStyle = css`
  width: 100% !important;
  height: 100% !important;
  position: relative !important;
`

const markdownStyle = (color, fontSize) => css`
  color: ${color};
  overflow: hidden;
  li {
    font-size: ${fontSize || '16px'};
  }
  p {
    font-size: ${fontSize || '16px'};
    margin-bottom: 0px;
  }
`

const profileContainerStyle = (isMirror) => css`
  display: flex;
  align-items: center;
  padding: 0;
`

const profileNameStyle = css`
  font-weight: 600;
  font-size: 16px;
`

const profilePictureStyle = css`
  width: 36px;
  height: 36px;
  border-radius: 12px;
  object-fit: cover;
  background-color: #dddddd;
`

const profileDetailsContainerStyle = (color) => css`
  display: flex;
  flex-direction: column;
  margin-left: 10px;
  width: 100%;
  p {
    margin: 0;
    color: ${color};
  }
`

const reactionsContainerStyle = css`
  position: relative;
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  margin-top: 12px;
  padding-bottom: 12px;
  margin-left: 12px;
  gap: 8px;
  cursor: default;
`

const reactionContainerStyle =
  (color, backgroundColor, isAuthenticatedAndWithHandler, hasReacted) => css`
    background-color: rgba(255, 255, 255, 0.04);
    &:hover {
      background-color: ${isAuthenticatedAndWithHandler && !hasReacted
      ? backgroundColor
      : 'transparent'
    };
    }
    display: flex;
    border-radius: 10px;
    padding: 6px;
    p {
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${color};
      background-color: rgba(255, 255, 255, 0.04);
      font-size: 10px;
      margin: 0;
      margin-left: 4px;
      height: 14px;
      width: 14px;
      border-radius: 50%;
      font-weight: 500;
    }
    cursor: ${isAuthenticatedAndWithHandler && !hasReacted
      ? 'pointer'
      : 'default'
    };
  `

const shareContainerStyle = (color, backgroundColor) => css`
  background-color: rgba(255, 255, 255, 0.08);
  &:hover {
    background-color: ${backgroundColor};
  }
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 10px;
  padding: 6px;
  margin-right: 4px;
  position: absolute;
  right: 5px;
  top: 0px;
  height: 24px;
  width: 24px;
  p {
    color: ${color};
    font-size: 12px;
    opacity: 0.75;
    margin: 0;
    margin-left: 4px;
  }
  cursor: pointer;
`

const actButtonContainerStyle = (color, backgroundColor, disabled?: boolean) => css`
  background-color: rgba(255,255,255,0.08);
  &:hover {
    background-color: ${backgroundColor};
  }
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 10px;
  padding: 6px;
  right: 45px;
  top: 0px;
  height: 28px;
  width: 68px;
  p {
    color: ${color};
    font-size: 14px;
    opacity: 0.75;
    margin: 0;
  }
  cursor: ${!disabled ? 'pointer' : 'default'};
`

const dateStyle = css`
  font-size: 12px;
  color: ${ThemeColor.darkGray};
  opacity: 0.75;
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
  gap: 5px;
`

const iframeContainerStyle = css`
  position: relative;
  width: 100%;
  height: 100%;
  margin-top: 12px;
  border-radius: 16px;
  overflow: hidden;
  min-height: 600px;
  min-width: 600px;
`

const iframeStyle = css`
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 16px;
`