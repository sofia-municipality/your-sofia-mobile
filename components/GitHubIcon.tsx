import React from 'react'
import Svg, {Path} from 'react-native-svg'
import {siGithub} from 'simple-icons'

interface GitHubIconProps {
  size?: number
  color?: string
}

export function GitHubIcon({size = 24, color = '#000000'}: GitHubIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d={siGithub.path} />
    </Svg>
  )
}
