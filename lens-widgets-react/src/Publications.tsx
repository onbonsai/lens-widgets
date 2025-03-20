import { useEffect, useState } from 'react'
import { css } from '@emotion/css'
import { client, profileByHandle, getPublications } from './graphql'
import { Publication as PublicationComponent } from './Publication/Publication'
import { Theme } from './types'
import { PublicClient } from '@lens-protocol/client'
import { getComments } from './utils'

enum LimitType {
  TEN = 'Ten',
  TWENTYFIVE = 'TwentyFive',
  FIFTY = 'Fifty'
}

export function Publications({
  profileId,
  handle,
  theme,
  numberOfPublications,
  publications,
  environment,
  authenticatedProfile,
  hideFollowButton = true,
  hideCommentButton = false,
  hideQuoteButton = false,
  hideShareButton = false,
  onLikeButtonClick,
  hasUpvotedComment,
  getOperationsFor,
  renderMadFiBadge = false,
  followButtonDisabled = false,
  onFollowPress,
  onProfileClick,
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
  publicationContainerStyleOverride,
  profileNameStyleOverride,
  dateNameStyleOverride,
  markdownStyleBottomMargin,
  shareContainerStyleOverride,
  heartIconOverride,
  messageIconOverride,
  shareIconOverride,
}: {
  profileId?: string,
  handle?: string,
  theme?: Theme,
  numberOfPublications?: number,
  publications?: any[],
  environment?: any,
  authenticatedProfile?: any,
  hideCommentButton?: boolean,
  hideQuoteButton?: boolean,
  hideShareButton?: boolean,
  onLikeButtonClick?: (e, publicationId: string) => void,
  hasUpvotedComment: (publicationId: string) => boolean,
  getOperationsFor: (publicationId: string) => any,
  renderMadFiBadge?: boolean,
  hideFollowButton?: boolean,
  followButtonDisabled: boolean,
  onFollowPress?: (event, profileId) => void,
  onProfileClick?: (e, handleLocalName) => void,
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
  publicationContainerStyleOverride?: string,
  markdownStyleBottomMargin?: string,
  profileNameStyleOverride?: string,
  dateNameStyleOverride?: string,
  shareContainerStyleOverride?: (color, backgroundColor) => string,
  heartIconOverride?: boolean,
  messageIconOverride?: boolean,
  shareIconOverride?: boolean,
}) {
  const [_publications, setPublications] = useState<any[] | undefined>([])
  const [followed, setFollowed] = useState({});
  const [expandedComments, setExpandedComments] = useState<{[key: string]: any[]}>({});
  const [loadingComments, setLoadingComments] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    if (!publications?.length) {
      fetchPublications()
    } else {
      setPublications(publications)
    }
  }, [profileId, handle, publications])

  async function fetchPublications() {
    let id = profileId
    let limit: LimitType = LimitType.TEN
    if (numberOfPublications) {
      if (numberOfPublications === 25) {
        limit = LimitType.TWENTYFIVE
      }
      if (numberOfPublications === 50) {
        limit = LimitType.FIFTY
      }
    }
    if (!id && handle) {
      try {
        const response = await client.query(profileByHandle, {
          handle
        }).toPromise()
        id = response.data.profile.id
      } catch (err) {
        console.log('error fetching profile: ', err)
      }
    }
    try {
      const response = await client.query(getPublications, {
        profileId: id,
        limit
      }).toPromise()
      if (response?.data?.publications?.items) {
        setPublications(response?.data?.publications?.items)
      }
    } catch (err) {
      console.log('error fetching publications: ', err)
    }
  }

  async function fetchComments(publicationId: string) {
    setLoadingComments(prev => ({ ...prev, [publicationId]: true }));
    try {
      const lensClient = PublicClient.create({ environment });
      const comments = await getComments(publicationId, lensClient);

      if (comments) {
        setExpandedComments(prev => ({
          ...prev,
          [publicationId]: comments
        }));
      }
    } catch (err) {
      console.log('error fetching comments: ', err);
    } finally {
      setLoadingComments(prev => ({ ...prev, [publicationId]: false }));
    }
  }

  // style overrides
  const activePublicationContainerStyle = publicationContainerStyleOverride || publicationContainerStyle

  return (
    <div className={publicationsContainerStyle}>
      {
        publications?.map(publication => {
          const hasExpandedComments = !!expandedComments[publication.id]?.length;
          const isLoadingComments = loadingComments[publication.id];

          return (
            <div key={`${publication.id}`} style={{ marginBottom: '12px' }}>
              <div className={activePublicationContainerStyle}>
                <PublicationComponent
                  publicationData={publication}
                  publicationId={publication.id}
                  environment={environment}
                  theme={theme}
                  authenticatedProfile={authenticatedProfile}
                  hideCommentButton={hideCommentButton}
                  hideQuoteButton={hideQuoteButton}
                  hideShareButton={hideShareButton}
                  onLikeButtonClick={onLikeButtonClick && !hasUpvotedComment(publication.id)
                    ? (e) => onLikeButtonClick(e, publication.id)
                    : undefined
                  }
                  operations={getOperationsFor(publication.id)}
                  renderMadFiBadge={renderMadFiBadge}
                  hideFollowButton={false} // TODO: fix this
                  followButtonDisabled={followButtonDisabled}
                  followButtonBackgroundColor={"#EEEDED"} // TODO: fix this
                  isFollowed={false} // TODO: fix this
                  onFollowPress={(e) => {
                    if (onFollowPress) {
                      onFollowPress(e, publication.by.id);
                      const res = {};
                      res[publication.id] = true;
                      setFollowed({ ...followed, ...res }); // optimistic, better than leaving no state changed
                    }
                  }}
                  onProfileClick={onProfileClick}
                  profilePictureStyleOverride={profilePictureStyleOverride}
                  profileContainerStyleOverride={profileContainerStyleOverride}
                  textContainerStyleOverride={textContainerStyleOverride}
                  containerBorderRadius={containerBorderRadius}
                  containerPadding={containerPadding}
                  profilePadding={profilePadding}
                  backgroundColorOverride={backgroundColorOverride}
                  mediaImageStyleOverride={mediaImageStyleOverride}
                  imageContainerStyleOverride={imageContainerStyleOverride}
                  reactionsContainerStyleOverride={reactionsContainerStyleOverride}
                  reactionContainerStyleOverride={reactionContainerStyleOverride}
                  markdownStyleBottomMargin={markdownStyleBottomMargin}
                  shareContainerStyleOverride={shareContainerStyleOverride}
                  heartIconOverride={heartIconOverride}
                  messageIconOverride={messageIconOverride}
                  shareIconOverride={shareIconOverride}
                  profileNameStyleOverride={profileNameStyleOverride}
                  dateNameStyleOverride={dateNameStyleOverride}
                  onCommentButtonClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!hasExpandedComments) {
                      fetchComments(publication.id);
                    } else {
                      // Toggle comments off if they're already shown
                      setExpandedComments(prev => {
                        const newState = { ...prev };
                        delete newState[publication.id];
                        return newState;
                      });
                    }
                  }}
                />
              </div>
              
              {/* Comments section */}
              {isLoadingComments && (
                <div className={css`
                  display: flex;
                  justify-content: center;
                  padding-top: 1rem;
                  padding-bottom: 1rem;
                `}>
                  <div className={css`
                    animation: spin 1s linear infinite;
                    border-radius: 9999px;
                    height: 1.5rem;
                    width: 1.5rem;
                    border-bottom: 2px solid #4b5563;
                    @keyframes spin {
                      from {
                        transform: rotate(0deg);
                      }
                      to {
                        transform: rotate(360deg);
                      }
                    }
                  `} />
                </div>
              )}
              
              {hasExpandedComments && (
                <div className={css`
                  padding-left: 3rem;
                  margin-top: 0.5rem;
                  & > * + * {
                    margin-top: 1rem;
                  }
                `}>
                  {expandedComments[publication.id].map((comment: any) => (
                    <PublicationComponent
                      key={comment.id}
                      publicationData={comment}
                      environment={environment}
                      theme={theme}
                      authenticatedProfile={authenticatedProfile}
                      hideCommentButton={true}
                      hideQuoteButton={true}
                      hideShareButton={true}
                      containerBorderRadius={containerBorderRadius}
                      containerPadding={containerPadding}
                      profilePadding={profilePadding}
                      onLikeButtonClick={onLikeButtonClick && !hasUpvotedComment(comment.id)
                        ? (e) => onLikeButtonClick(e, comment.id)
                        : undefined
                      }
                      operations={getOperationsFor(comment.id)}
                      renderMadFiBadge={renderMadFiBadge}
                      hideFollowButton={hideFollowButton}
                      followButtonDisabled={followButtonDisabled}
                      followButtonBackgroundColor={"#EEEDED"}
                      isFollowed={false}
                      onFollowPress={(e) => {
                        if (onFollowPress) {
                          onFollowPress(e, comment.by.id);
                          const res = {};
                          res[comment.id] = true;
                          setFollowed({ ...followed, ...res });
                        }
                      }}
                      onProfileClick={onProfileClick}
                      profilePictureStyleOverride={profilePictureStyleOverride}
                      profileContainerStyleOverride={profileContainerStyleOverride}
                      textContainerStyleOverride={textContainerStyleOverride}
                      backgroundColorOverride={backgroundColorOverride}
                      mediaImageStyleOverride={mediaImageStyleOverride}
                      imageContainerStyleOverride={imageContainerStyleOverride}
                      reactionsContainerStyleOverride={reactionsContainerStyleOverride}
                      reactionContainerStyleOverride={reactionContainerStyleOverride}
                      markdownStyleBottomMargin={markdownStyleBottomMargin}
                      shareContainerStyleOverride={shareContainerStyleOverride}
                      heartIconOverride={heartIconOverride}
                      messageIconOverride={messageIconOverride}
                      shareIconOverride={shareIconOverride}
                      profileNameStyleOverride={profileNameStyleOverride}
                      dateNameStyleOverride={dateNameStyleOverride}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })
      }
    </div>
  )
}

const publicationsContainerStyle = css`
  @media (max-width: 510px) {
    width: 100%
  }
`

const publicationContainerStyle = css`
  margin-bottom: 12px;
`