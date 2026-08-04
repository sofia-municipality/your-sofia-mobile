import React from 'react'
import {View, StyleSheet} from 'react-native'
import Svg, {G, Path} from 'react-native-svg'
import {colors} from '@/styles/tokens'

interface DrinkingFountainMarkerProps {
  /** Background colour of the marker (blue when the fountain is working). */
  color: string
  size?: number
}
export function DrinkingFountainMarker({color, size = 32}: DrinkingFountainMarkerProps) {
  const glyphSize = size * 0.64

  return (
    <View style={[styles.container, {width: size, height: size}]}>
      <View style={[styles.iconContainer, {backgroundColor: color}]}>
        <Svg
          width={glyphSize}
          height={glyphSize}
          viewBox="0 0 532 554"
          preserveAspectRatio="xMidYMid meet"
        >
          <G
            transform="translate(0.000000,512.000000) scale(0.100000,-0.100000)"
            fill="#FFF"
            stroke="none"
          >
            <Path
              d="M3055 5106 c-206 -41 -397 -168 -502 -334 -20 -31 -37 -58 -38 -60
-1 -1 -37 15 -80 37 -245 126 -522 83 -716 -109 -59 -58 -85 -94 -118 -160
-67 -137 -87 -269 -52 -345 47 -104 169 -137 257 -70 45 35 62 69 74 155 17
117 67 188 164 231 135 59 289 0 352 -136 l24 -50 0 -473 0 -474 -32 8 c-55
12 -176 6 -231 -12 -199 -64 -337 -246 -337 -443 0 -68 20 -112 66 -147 32
-25 46 -29 103 -29 53 0 72 5 99 23 37 27 72 89 72 128 0 15 9 47 20 70 42 86
148 98 215 24 19 -21 20 -40 25 -289 l5 -266 173 -3 172 -2 0 532 c0 488 2
536 18 567 26 52 65 76 120 75 84 -1 121 -41 141 -148 18 -100 81 -156 173
-156 96 1 168 77 168 181 0 199 -151 395 -352 453 -62 18 -185 21 -236 7 l-32
-10 0 247 c0 342 17 410 132 525 130 131 355 156 511 57 117 -74 180 -178 202
-334 15 -108 35 -145 95 -176 50 -26 103 -25 157 1 88 43 113 139 78 304 -58
280 -270 506 -547 585 -94 27 -249 34 -343 16z"
            />
            <Path
              d="M1593 3834 c-45 -22 -75 -74 -75 -129 0 -159 218 -200 277 -53 50
125 -80 242 -202 182z"
            />
            <Path
              d="M3844 3836 c-76 -34 -105 -145 -55 -215 43 -61 124 -78 191 -40 48
27 70 66 70 124 0 58 -22 97 -70 124 -43 24 -91 26 -136 7z"
            />
            <Path
              d="M3187 2986 c-48 -18 -62 -29 -81 -70 -38 -80 -8 -163 70 -198 129
-57 252 79 183 202 -35 63 -105 90 -172 66z"
            />
            <Path
              d="M492 2120 c-44 -27 -72 -76 -72 -127 0 -33 15 -73 65 -170 36 -71 87
-159 113 -198 l48 -70 1914 0 1914 0 48 70 c26 39 77 127 113 198 50 97 65
137 65 170 0 51 -28 100 -72 127 -33 20 -55 20 -2068 20 -2013 0 -2035 0
-2068 -20z"
            />
            <Path
              d="M901 1274 c7 -9 50 -44 94 -79 313 -244 684 -394 1140 -462 172 -25
678 -25 850 0 456 68 827 218 1140 462 44 35 87 70 94 79 12 15 -120 16 -1659
16 -1539 0 -1671 -1 -1659 -16z"
            />
            <Path
              d="M1794 511 c-32 -73 -54 -159 -65 -256 -11 -93 -11 -103 8 -146 12
-26 37 -59 59 -75 l37 -29 727 0 727 0 37 29 c22 16 47 49 59 75 19 43 19 53
8 146 -11 97 -33 183 -65 256 l-15 37 -88 -18 c-408 -83 -918 -83 -1326 0
l-88 18 -15 -37z"
            />
          </G>
        </Svg>
      </View>
    </View>
  )
}
const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
})
