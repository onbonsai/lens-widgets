import {
  useEffect, useState
} from 'react'
import { css } from '@emotion/css'
import { Environment, LensClient, production, PublicationOperationsFragment } from "@lens-protocol/client";
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import { ThemeColor, Theme } from './types'
import { formatDistance } from 'date-fns'
import {
  MessageIcon, MirrorIcon, HeartIcon, ShareIcon
} from './icons'
import {
  formatProfilePicture,
  systemFonts,
  getSubstring,
  formatHandleColors,
  getDisplayName,
} from './utils'
import ReactPlayer from 'react-player'
import { AudioPlayer } from './AudioPlayer'

export function Publication({
  publicationId,
  onClick,
  publicationData,
  theme = Theme.default,
  ipfsGateway,
  fontSize,
  environment = production,
  isAuthenticated = false,
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
}: {
  publicationId?: string,
  publicationData?: any,
  onClick?: (e) => void,
  theme?: Theme,
  ipfsGateway?: string,
  fontSize?: string,
  environment?: Environment,
  isAuthenticated?: boolean,
  renderActButtonWithCTA?: string,
  onActButtonClick?: (e) => void,
  onCommentButtonClick?: (e) => void,
  onMirrorButtonClick?: (e) => void,
  onLikeButtonClick?: (e) => void,
  onShareButtonClick?: (e) => void,
  hideCommentButton?: boolean,
  hideQuoteButton?: boolean,
  hideShareButton?: boolean,
  operations?: PublicationOperationsFragment
}) {
  let [publication, setPublication] = useState<any>()
  let [showFullText, setShowFullText] = useState(false)

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

  const isDarkTheme = theme === Theme.dark
  const color = isDarkTheme ? ThemeColor.white : ThemeColor.darkGray
  const backgroundColor = isDarkTheme ? ThemeColor.lightBlack : ThemeColor.white
  const reactionBgColor = isDarkTheme ? ThemeColor.darkGray : ThemeColor.lightGray;
  const actButttonBgColor = isDarkTheme ? ThemeColor.darkGray : ThemeColor.lightGray;
  const reactionTextColor = isDarkTheme ? ThemeColor.lightGray : ThemeColor.darkGray

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
        <div className={profileContainerStyle(isMirror)}>
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
            <p className={profileNameStyle}>{getDisplayName(profile)}</p>
            <p className={dateStyle}> {formatDistance(new Date(publication.createdAt), new Date())} ago</p>
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
      {
        publication.metadata?.__typename === "ImageMetadataV3"  && (
          <div className={imageContainerStyle}>
            <img
              className={mediaImageStyle}
              src={publication.metadata.asset.image.optimized.uri}
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
              url={publication.metadata.asset.video.optimized?.uri}
              controls
            />
          </div>
        )
      }
      {
        publication.metadata?.__typename === "AudioMetadataV3" && (
          <div className={audioContainerStyle}>
            <AudioPlayer
              url={publication.metadata.asset.audio.optimized?.uri}
              theme={theme}
              cover={publication.metadata.asset.cover?.optimized?.uri}
              profile={publication.by}
            />
          </div>
        )
      }
      <div
        className={reactionsContainerStyle}
        onClick={onPublicationPress}
      >
        <div
          className={reactionContainerStyle(reactionTextColor, reactionBgColor, isAuthenticated, operations?.hasUpvoted)}
          onClick={onLikeButtonClick}
        >
          <HeartIcon color={!operations?.hasUpvoted ? reactionTextColor : ThemeColor.red} />
          <p>{publication.stats.upvoteReactions > 0 ? publication.stats.upvoteReactions : null}</p>
        </div>
        {!hideCommentButton && (
          <div
            className={reactionContainerStyle(reactionTextColor, reactionBgColor, isAuthenticated, false)}
            onClick={onCommentButtonClick}
          >
            <MessageIcon color={reactionTextColor} />
            <p>{publication.stats.comments > 0 ? publication.stats.comments : null}</p>
          </div>
        )}
        {!hideQuoteButton && (
          <div
            className={reactionContainerStyle(reactionTextColor, reactionBgColor, isAuthenticated, operations?.hasMirrored)}
            onClick={onMirrorButtonClick}
          >
            <MirrorIcon color={!operations?.hasMirrored ? reactionTextColor : ThemeColor.lightGreen} />
            <p>{publication.stats.mirrors + publication.stats.quotes > 0 ? publication.stats.mirrors + publication.stats.quotes : null}</p>
          </div>
        )}
        {
          publication.stats.bookmarks > Number(0) && (
            <div className={reactionContainerStyle(reactionTextColor, reactionBgColor, isAuthenticated, false)}>
              <CollectIcon color={reactionTextColor} />
              <p>{publication.stats.bookmarks}</p>
            </div>
          )
        }
        {
          renderActButtonWithCTA && (
            <div
              className={actButtonContainerStyle(reactionTextColor, actButttonBgColor)}
              onClick={onActButtonClick}
            >
              <p>{renderActButtonWithCTA}</p>
            </div>
          )
        }
        {
          !renderActButtonWithCTA && !hideShareButton && (
            <div
              className={shareContainerStyle(reactionTextColor, reactionBgColor)}
              onClick={onShareButtonClick}
            >
              <ShareIcon color={reactionTextColor} />
            </div>
          )
        } */}
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

const profileContainerStyle = isMirror => css`
  display: flex;
  align-items: center;
  padding-top: ${isMirror ? '2px' : '6px'};
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

const reactionContainerStyle = (color, backgroundColor, isAuthenticated, hasReacted) => css`
  background-color: transparent;
  &:hover {
    background-color: ${isAuthenticated && !hasReacted ? backgroundColor : 'transparent'};
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
  cursor: ${isAuthenticated && !hasReacted ? 'pointer' : 'default'};
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

const actButtonContainerStyle = (color, backgroundColor) => css`
  background-color: ${backgroundColor};
  display: flex;
  border-radius: 16px;
  padding: 10px;
  margin-right: 14px;
  position: absolute;
  right: 5px;
  p {
    color: ${color};
    font-size: 14px;
    opacity: 1;
    margin: 0;
  }
  cursor: pointer;
`

const publicationContainerStyle = (color, onClick: boolean) => css`
  width: 510px;
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