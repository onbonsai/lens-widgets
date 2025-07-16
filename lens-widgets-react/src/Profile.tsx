import { useEffect, useState } from 'react'
import { css } from '@emotion/css'
import { ThemeColor, ProfileHandle, Theme, AirstackProfile, ENSProfile } from './types'
import {
  formatProfilePicture,
  systemFonts,
  formatHandleColors,
  formatHandleList,
  getSubstring,
  getDisplayName,
  ipfsOrNotWithDefaultGateway,
  FARCASTER_BANNER_URL,
} from './utils'
import { VerifiedBadgeIcon } from "./icons";
import { LensLogo } from './icons/logos/Lens';
import { FarcasterLogo } from './icons/logos/Farcaster';

export function Profile({
  profileId,
  profileData,
  profileType = "lens",
  ethereumAddress,
  handle, // ex: lens/madfinance
  onClick,
  theme = Theme.default,
  containerStyle = profileContainerStyle,
  followButtonStyle,
  followButtonContainerStyle,
  followButtonBackgroundColor,
  followButtonTextColor,
  hideFollowButton = true,
  hideFollowerCount = false,
  ipfsGateway,
  onFollowPress,
  skipFetchFollowers,
  environment,
  followButtonDisabled = false,
  isFollowed = false,
  renderMadFiBadge = false,
  allSocials = [],
} : {
  profileId?: string,
  profileData?: any,
  profileType?: "lens" | "farcaster" | "ens",
  handle?: string,
  ethereumAddress?: string,
  onClick?: () => void,
  theme?: Theme,
  containerStyle?: {},
  followButtonStyle?: {},
  followButtonContainerStyle?: {},
  followButtonBackgroundColor?: string,
  followButtonTextColor?: string,
  hideFollowButton?: boolean,
  hideFollowerCount?: boolean,
  ipfsGateway?: string,
  onFollowPress?: (event) => void,
  skipFetchFollowers?: boolean,
  environment?: any,
  followButtonDisabled: boolean,
  isFollowed?: boolean,
  renderMadFiBadge?: boolean,
  allSocials?: any[],
}) {
  const [profile, setProfile] = useState<any | undefined>()
  const [followers, setFollowers] = useState<ProfileHandle[]>([])
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    fetchProfile()
  }, [profileId, handle, ethereumAddress])

  // TO GET VALID URL ON BAD IMG.SRC
  const checkURL = async (url: string) => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok ? url : "";
    } catch (error) {
      return "";
    }
  };

  const getLensURL = (profile) => (
    profile?.metadata?.picture?.optimized?.uri || profile?.metadata?.picture?.raw?.uri || profile?.metadata?.picture?.url
  )

  const getValidURL = async () => {
    let validURL = "";

    if (profileType === "lens" && (profile?.metadata?.picture?.optimized?.uri || profile?.metadata?.picture?.raw?.uri || profile?.metadata?.picture?.url)) {
      validURL = await checkURL(getLensURL(profile));
    }

    if (!validURL && profileType === "farcaster" && profile?.profileImage) {
      validURL = await checkURL(profile.profileImage);
    }

    if (!validURL) {
      const checkURLPromises = allSocials?.map((d) => checkURL(getLensURL(d) || d.profileImage || ""));
      const urlResults = await Promise.all(checkURLPromises || []);
      validURL = urlResults.find((url) => url !== "") || "";
    }

    return validURL;
  };

  function onProfilePress() {
    if (onClick) {
      onClick()
    } else {
       if (profile) {
        const { localName, namespace } = profile.handle
        const URI = `https://share.lens.xyz/u/${localName}.${namespace}`
        window.open(URI, '_blank')
       }
    }
  }

  async function fetchProfile() {
    throw new Error('not supporting fetch profile yet');
  }

  function formatProfile(profile: any) {
    let copy = formatProfilePicture(profile)
    setProfile(copy)
    setHasError(false);
  }

  function formatProfileAirstack(profile: AirstackProfile) {
    setProfile({
      dappName: profile.dappName,
      metadata: {
        coverPicture: !!profile.coverImageURI ? ipfsOrNotWithDefaultGateway(profile.coverImageURI) : null,
        picture: {
          uri: profile.profileImage
        },
        bio: profile.profileBio,
        displayName: profile.profileDisplayName,
      },
      stats: {
        following: profile.followingCount,
        followers: profile.followerCount,
      },
      handle: {
        localName: profile.profileHandle,
        suggestedFormatted: {
          localName: profile.profileHandle
        }
      }
    })
    setHasError(false);
  }

  if (!profile) return null

  return (
    <div style={containerStyle} className={profileContainerClass}>
      <div className={headerImageContainerStyle}>
        <div onClick={onProfilePress}>
          {
            profile.metadata.coverPicture?.optimized?.uri ? (
              <div
                style={getHeaderImageStyle(profile?.metadata.coverPicture?.optimized?.uri)}
              />
            ) : <div style={getHeaderImageStyle(profile.dappName === "farcaster" ? FARCASTER_BANNER_URL : undefined)} />
          }
          <div>
            {
              profile.metadata.picture ? (
                <div
                  className={getProfilePictureContainerStyle(theme)}
                >
                  <img
                    src={profile.metadata.picture.uri || profile.metadata.picture.url}
                    className={profilePictureStyle}
                    loading="eager"
                    decoding="async"
                    alt="Profile picture"
                    onError={async (e) => {
                      if (!hasError) {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        const validURL = await getValidURL();
                        if (validURL) {
                          target.src = validURL;
                        }
                        setHasError(true);
                      }
                    }}
                  />
                </div>
              ) : null
            }
            {
              profile.picture === null && (
                <div className={emptyProfilePictureStyle} />
              )
            }
          </div>
        </div>
      </div>
      <div className={getProfileInfoContainerStyle(theme)}>
        <div className={profileNameAndBioContainerStyle} onClick={onProfilePress}>
          <div className="flex gap-x-2">
            <p className={profileNameStyle}>{getDisplayName(profile)}</p>
            {renderMadFiBadge && <span className="mt-2"><VerifiedBadgeIcon /></span>}
          </div>
          <p className={getProfileHandleStyle(theme)}>@{profile.handle?.suggestedFormatted?.localName.replace('@', '')}</p>
          {
            profile.metadata?.bio && (
              <p className={bioStyle} dangerouslySetInnerHTML={{
                __html: formatHandleColors(getSubstring(profile.metadata.bio))
              }} />
            )
          }
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px' }}>
          <div onClick={onProfilePress} className={getStatsContainerStyle(theme)}>
            <p>
              {profile.stats.following.toLocaleString('en-US')} <span>Following</span>
            </p>
            <p>
              {profile.stats.followers.toLocaleString('en-US')} <span>Followers</span>
            </p>
          </div>
          <div
            style={followButtonContainerStyle || getButtonContainerStyle(hideFollowButton)}
          >
            <button
              disabled={followButtonDisabled || isFollowed}
              onClick={onFollowPress}
              style={
                followButtonStyle ||
                getButtonStyle(
                  theme,
                  !followButtonDisabled ? followButtonBackgroundColor : ThemeColor.darkGray,
                  followButtonTextColor,
                  followButtonDisabled || isFollowed
                )
              }
            >{!isFollowed ? "Follow" : "Following"}</button>
          </div>
        </div>
        {!skipFetchFollowers && (
          <div onClick={onProfilePress} className={getFollowedByContainerStyle(theme)}>
            <div className={miniAvatarContainerStyle}>
              {
                followers.map(follower => (
                  <div key={follower.handle?.localName} className={getMiniAvatarWrapper()}>
                    <img src={follower.picture} className={getMiniAvatarStyle(theme)} />
                  </div>
                ))
              }
            </div>
            <p>
              {
                Boolean(followers.length) && <span>Followed by</span>
              }
              {
                formatHandleList(followers.map(follower => follower.handle?.suggestedFormatted?.localName))
              }</p>
          </div>
        )}
        <div className={css`
          display: flex;
          align-items: flex-start;
          margin-top: 20px;
          margin-left: auto;
          gap: 8px;
        `}>
          {
            allSocials.map((social, idx) => {
              if (social.id) return <button key={`s-${idx}`} className={hover()} onClick={() => formatProfile(profileData)}><LensLogo isDarkTheme={false} /></button>
              if (social.dappName === "lens") return <button key={`s-${idx}`} className={hover()} onClick={() => formatProfileAirstack(social)}><LensLogo isDarkTheme={false} /></button>
              if (social.dappName === "farcaster") return <button key={`s-${idx}`} className={hover()} onClick={() => formatProfileAirstack(social)}><FarcasterLogo isDarkTheme={false} /></button>
            })
          }
        </div>
      </div>
    </div>
  )
}

export function ActionButton({
  label,
  disabled,
  onClick,
  theme,
  textColor,
  backgroundColor,
}: {
    label: string,
    disabled: boolean,
    onClick: (e) => void,
    theme: Theme,
    textColor?: string,
    backgroundColor?: string,
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={
        getButtonStyle(
          theme,
          backgroundColor,
          textColor,
          disabled
        )
      }
    >{label}</button>
  );
}

const profileContainerStyle = {
  overflow: 'hidden',
  cursor: 'pointer'
}

const emptyProfilePictureStyle = css`
  background-color: green;
  width: 60px;
  height: 60px;
  display: flex;
  left: 0;
  bottom: -50px;
  width: 66px;
  height: 66px;
  border-radius: 70px;
  position: absolute;
  margin-left: 20px;
  border: 4px solid white;
`

const system = css`
  font-family: ${systemFonts} !important
`

const headerImageContainerStyle = css`
  position: relative;
`

const profileNameAndBioContainerStyle = css`
  margin-top: 15px;
`

const profileNameStyle = css`
  font-size: 26px;
  font-weight: 700;
  margin: 0;
`

function getProfileHandleStyle(theme: Theme) {
  let color = ThemeColor.darkGray
  if (theme === Theme.dark) {
    color = ThemeColor.white
  }

  return css`
  font-size: 16px;
  font-weight: 400;
  margin: 0;
  opacity: 0.8;
  color: ${color}
`
}

const bioStyle = css`
  font-weight: 500;
  margin-top: 20px;
  margin-bottom: 0;
  line-height: 24px;
`

const profileContainerClass = css`
  width: 510px;
  @media (max-width: 510px) {
    width: 100%
  }
  * {
    ${system};
  }
`

const miniAvatarContainerStyle = css`
  display: flex;
  margin-left: 10px;
  margin-right: 14px;
`

const profilePictureStyle = css`
  width: 62px;
  height: 62px;
  border-radius: 70px;
  object-fit: cover;
  transform: translateZ(0);
  will-change: auto;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  -webkit-transform: translateZ(0);
`

function getFollowedByContainerStyle(theme:Theme) {
  let color = ThemeColor.darkGray
  if (theme === Theme.dark) {
    color = ThemeColor.white
  }
  return css`
  display: flex;
  color: ${color};
  align-items: center;
  span {
    opacity: .5;
    margin-right: 4px;
  }
  p {
    margin-right: 5px;
    margin-bottom: 0;
    margin-top: 0;
    font-weight: 600;
    font-size: 14px;
  }
`
}

function getStatsContainerStyle(theme: Theme) {
  let color = ThemeColor.darkGray
  if (theme === Theme.dark) {
    color = ThemeColor.white
  }
  return css`
    display: flex;
    margin-top: 25px;
    * {
      font-weight: 600;
    }
    p {
      margin-right: 10px;
      margin-top: 0;
      margin-bottom: 0;
    }
    span {
      color: ${color};
      opacity: 50%;
    }
    @media (max-width: 510px) {
      p {
        margin: 8px 10px 8px 0px;
      }
    }
  `
}

function getProfileInfoContainerStyle(theme: Theme) {
  let backgroundColor = ThemeColor.white
  let color = ThemeColor.black
  if (theme === Theme.dark) {
    backgroundColor = ThemeColor.lightBlack
    color = ThemeColor.white
  }
  return css`
    background-color: ${backgroundColor};
    padding: 20px 20px 10px;
    p {
      color: ${color};
    }
    border-bottom-left-radius: 18px;
    border-bottom-right-radius: 18px;
    display: flex;
    flex-direction: column;
  `
}

function getButtonContainerStyle(hidden) {
  return {
    display: 'flex',
    flex: 1,
    justifyContent: 'flex-end',
    visibility: hidden ? 'hidden' : 'visible' as any
  }
}

function getMiniAvatarWrapper() {
  return css`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    margin-left: -10px;
    borderRadius: 20px;
  `
}

function getMiniAvatarStyle(theme: Theme) {
  let color = ThemeColor.white
  if (theme === Theme.dark) {
    color = ThemeColor.lightBlack
  }
  return css`
    width: 34px;
    height: 34px;
    border-radius: 20px;
    outline: 2px solid ${color};
    background-color: ${color};
  `
}

function hover() {
  return css`
    &:hover {
      opacity: 70%;
      transition: opacity .2s;
    }
  `
}

function getProfilePictureContainerStyle(theme: Theme) {
  let backgroundColor = ThemeColor.white
  if (theme === Theme.dark) {
    backgroundColor = ThemeColor.lightBlack
  }
  return css`
    position: absolute;
    display: flex;
    justify-content: center;
    align-items: center;
    left: 0;
    bottom: -30px;
    background-color: ${backgroundColor};
    width: 66px;
    height: 66px;
    border-radius: 70px;
    margin-left: 20px;
  `
}

function getHeaderImageStyle(url?:string) {
  const backgroundImage = url ? `url(${url})` : 'none'
  return {
    height: '120px',
    backgroundColor: ThemeColor.lightGreen,
    backgroundSize: 'cover',
    backgroundPosition: 'center center',
    backgroundRepeat: 'no-repeat',
    backgroundImage: backgroundImage,
    borderTopLeftRadius: '18px',
    borderTopRightRadius: '18px',
  }
}

export function getButtonStyle(theme: Theme, bgColor?: string, textColor?: string, disabled?: boolean) {
  let backgroundColor = bgColor || '#3d4b41'
  let color = textColor || 'white'
  if (theme === Theme.dark) {
    color = textColor || '#191919'
    backgroundColor = bgColor || '#C3E4CD'
  }
  let borderColor = bgColor == 'transparent'
    ? ThemeColor.lightGray
    : undefined
  color = bgColor == 'transparent' ? ThemeColor.lightGray : color
  return {
    marginTop: '10px',
    outline: 'none',
    border: 'none',
    padding: '2px 10px',
    backgroundColor,
    borderRadius: '50px',
    borderColor,
    borderWidth: borderColor ? "1px" : undefined,
    borderStyle: borderColor ? "solid" : undefined,
    color,
    fontSize: '16px',
    fontWeight: '500',
    cursor: disabled ? 'default' : 'pointer',
  }
}