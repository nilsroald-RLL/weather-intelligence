import { z } from "zod";

// Matches the real MET Norway Locationforecast 2.0 "complete" response,
// verified live against api.met.no. Detail fields are all optional because
// their presence varies by how far out the target time is - MET drops
// fields rather than sending zeros, and so do we (never treat missing as
// zero). Unknown extra fields are silently dropped by Zod's default
// behaviour rather than failing validation, so an additive MET API change
// doesn't break ingestion.
const detailsSchema = z.object({
  air_temperature: z.number().optional(),
  air_temperature_max: z.number().optional(),
  air_temperature_min: z.number().optional(),
  air_pressure_at_sea_level: z.number().optional(),
  cloud_area_fraction: z.number().optional(),
  relative_humidity: z.number().optional(),
  wind_speed: z.number().optional(),
  wind_speed_of_gust: z.number().optional(),
  wind_from_direction: z.number().optional(),
  precipitation_amount: z.number().optional(),
  precipitation_amount_min: z.number().optional(),
  precipitation_amount_max: z.number().optional(),
  probability_of_precipitation: z.number().optional(),
  probability_of_thunder: z.number().optional(),
});

const summarySchema = z.object({
  symbol_code: z.string(),
  symbol_confidence: z.string().optional(),
});

const periodSchema = z.object({
  summary: summarySchema.optional(),
  details: detailsSchema.optional(),
});

const timeseriesEntrySchema = z.object({
  time: z.string(),
  data: z.object({
    instant: z.object({
      details: detailsSchema,
    }),
    next_1_hours: periodSchema.optional(),
    next_6_hours: periodSchema.optional(),
    next_12_hours: periodSchema.optional(),
  }),
});

export const metNorwayResponseSchema = z.object({
  type: z.literal("Feature"),
  geometry: z.object({
    type: z.literal("Point"),
    coordinates: z.tuple([z.number(), z.number(), z.number()]),
  }),
  properties: z.object({
    meta: z.object({
      updated_at: z.string(),
    }),
    timeseries: z.array(timeseriesEntrySchema).min(1),
  }),
});

export type MetNorwayResponse = z.infer<typeof metNorwayResponseSchema>;
export type MetNorwayTimeseriesEntry = MetNorwayResponse["properties"]["timeseries"][number];
export type MetNorwayPeriod = NonNullable<MetNorwayTimeseriesEntry["data"]["next_1_hours"]>;
