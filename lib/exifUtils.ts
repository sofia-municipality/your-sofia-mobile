/**
 * Utility functions for extracting and parsing EXIF metadata from images
 */

/**
 * Converts GPS coordinates from EXIF format to decimal degrees
 * @param gpsArray - GPS coordinate array [degrees, minutes, seconds] or decimal number
 * @param ref - GPS reference direction ('N', 'S', 'E', 'W')
 * @returns Decimal degree coordinate or null if conversion fails
 */
export const convertGPSToDecimal = (gpsArray: number[] | number, ref: string): number | null => {
  try {
    // Handle if gpsArray is already a decimal number
    if (typeof gpsArray === 'number') {
      return ref === 'S' || ref === 'W' ? -gpsArray : gpsArray
    }

    // Convert DMS (Degrees, Minutes, Seconds) to decimal
    if (Array.isArray(gpsArray) && gpsArray.length === 3) {
      const degrees = gpsArray[0]
      const minutes = gpsArray[1]
      const seconds = gpsArray[2]

      let decimal = degrees + minutes / 60 + seconds / 3600

      // Apply direction (S and W are negative)
      if (ref === 'S' || ref === 'W') {
        decimal = -decimal
      }

      return decimal
    }

    return null
  } catch (error) {
    console.error('Error converting GPS coordinates:', error)
    return null
  }
}

/**
 * Parses EXIF datetime string to JavaScript Date object
 * @param dateTimeStr - EXIF datetime string in format "YYYY:MM:DD HH:MM:SS"
 * @returns Date object or null if parsing fails
 */
export const parseExifDateTime = (dateTimeStr: string): Date | null => {
  try {
    // EXIF format: "YYYY:MM:DD HH:MM:SS"
    const parts = dateTimeStr.split(' ')
    if (parts.length !== 2) return null

    const dateParts = parts[0].split(':')
    const timeParts = parts[1].split(':')

    if (dateParts.length !== 3 || timeParts.length !== 3) return null

    const year = parseInt(dateParts[0])
    const month = parseInt(dateParts[1]) - 1 // JavaScript months are 0-indexed
    const day = parseInt(dateParts[2])
    const hour = parseInt(timeParts[0])
    const minute = parseInt(timeParts[1])
    const second = parseInt(timeParts[2])

    const date = new Date(year, month, day, hour, minute, second)

    return isNaN(date.getTime()) ? null : date
  } catch (error) {
    console.error('Error parsing EXIF datetime:', error)
    return null
  }
}
