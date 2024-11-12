import { useEffect, useState } from 'react'
import { css } from '@emotion/css'
import { client, profileByHandle, getPublications } from './graphql'
import { Publication as PublicationComponent } from './Publication'
import { ProfileFragment, PublicationOperationsFragment, Environment, production } from '@lens-protocol/client'
import { Theme } from './types'

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
  environment = production,
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
} : {
  profileId?: string,
  handle?: string,
  theme?: Theme,
  numberOfPublications?: number,
  publications?: any[],
  environment?: Environment,
  authenticatedProfile?: ProfileFragment | null,
  hideCommentButton?: boolean,
  hideQuoteButton?: boolean,
  hideShareButton?: boolean,
  onLikeButtonClick?: (e, publicationId: string) => void,
  hasUpvotedComment: (publicationId: string) => boolean,
  getOperationsFor: (publicationId: string) => PublicationOperationsFragment | undefined,
  renderMadFiBadge?: boolean,
  hideFollowButton?: boolean,
  followButtonDisabled: boolean,
  onFollowPress?: (event, profileId) => void,
  onProfileClick?: (e, handleLocalName) => void,
}) {
  const [_publications, setPublications] = useState<any[] | undefined>([])
  const [followed, setFollowed] = useState({});

  useEffect(() => {
    if (!publications?.length) {
      fetchPublications()
    } else {
      setPublications(publications)
    }
  }, [profileId, handle, publications])

  async function fetchPublications() {
    let id = profileId
    let limit:LimitType = LimitType.TEN
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

  return (
    <div className={publicationsContainerStyle}>
      {
        publications?.map(publication => {
          return (
            <div key={`${publication.id}`} className={publicationContainerStyle}>
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
                hideFollowButton={hideFollowButton || (publication.by.operations?.canFollow === "NO" && !publication.by.operations?.isFollowedByMe?.value)}
                followButtonDisabled={followButtonDisabled}
                followButtonBackgroundColor={(publication.by.operations?.isFollowedByMe?.value || followed[publication.id]) ? "transparent" : "#EEEDED"}
                isFollowed={publication.by.operations?.isFollowedByMe?.value || followed[publication.id]}
                onFollowPress={(e) => {
                  if (onFollowPress) {
                    onFollowPress(e, publication.by.id);
                    const res = {};
                    res[publication.id] = true;
                    setFollowed({...followed, ...res }); // optimistic, better than leaving no state changed
                  }
                }}
                onProfileClick={onProfileClick}
              />
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