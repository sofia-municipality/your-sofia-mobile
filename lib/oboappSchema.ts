import {z} from 'zod'

const CoordinatesSchema = z.object({
  lat: z.number(),
  lng: z.number(),
})

const GeoJsonPointSchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([z.number(), z.number()]),
})

const AddressSchema = z.object({
  originalText: z.string(),
  formattedAddress: z.string(),
  coordinates: CoordinatesSchema,
  geoJson: GeoJsonPointSchema.optional(),
})

const FeatureGeometrySchema = z.object({
  type: z.enum(['Point', 'LineString', 'Polygon']),
  coordinates: z.unknown(),
})

const GeoJsonFeatureCollectionSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(
    z.object({
      type: z.literal('Feature'),
      geometry: FeatureGeometrySchema,
      properties: z.record(z.string(), z.unknown()).optional(),
    })
  ),
})

const TimespanSchema = z.object({
  start: z.string(),
  end: z.string(),
})

const PinSchema = z.object({
  address: z.string(),
  coordinates: CoordinatesSchema.optional(),
  timespans: z.array(TimespanSchema),
})

const StreetSchema = z.object({
  street: z.string(),
  from: z.string(),
  fromCoordinates: CoordinatesSchema.optional(),
  to: z.string(),
  toCoordinates: CoordinatesSchema.optional(),
  timespans: z.array(TimespanSchema),
})

const CadastralPropertySchema = z.object({
  identifier: z.string(),
  timespans: z.array(TimespanSchema),
})

export const OboMessageSchema = z.object({
  id: z.string().optional(),
  text: z.string(),
  plainText: z.string().optional(),
  markdownText: z.string().optional(),
  addresses: z.array(AddressSchema).optional(),
  geoJson: GeoJsonFeatureCollectionSchema.optional(),
  createdAt: z.string(),
  crawledAt: z.string().optional(),
  finalizedAt: z.string().optional(),
  source: z.string().optional(),
  sourceUrl: z.string().optional(),
  categories: z.array(z.string()).optional(),
  timespanStart: z.string().optional(),
  timespanEnd: z.string().optional(),
  cityWide: z.boolean().optional(),
  responsibleEntity: z.string().optional(),
  pins: z.array(PinSchema).optional(),
  streets: z.array(StreetSchema).optional(),
  cadastralProperties: z.array(CadastralPropertySchema).optional(),
  busStops: z.array(z.string()).optional(),
  locality: z.string(),
})

export const OboMessagesResponseSchema = z.object({
  messages: z.array(OboMessageSchema),
})

export const OboSourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  logoUrl: z.string(),
  locality: z.string(),
})

export const OboSourcesResponseSchema = z.object({
  sources: z.array(OboSourceSchema),
})

export type OboMessage = z.infer<typeof OboMessageSchema>
export type OboSource = z.infer<typeof OboSourceSchema>
