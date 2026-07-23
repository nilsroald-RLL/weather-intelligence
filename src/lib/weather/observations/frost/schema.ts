import { z } from "zod";

// Matches the real Frost /observations/v0.jsonld response, verified live
// against frost.met.no. Frost can report the same elementId more than once
// within one referenceTime bundle (different sensor heights, or an
// overlapping supplementary series) - normalize.ts is what picks one clean
// value per element, rather than this schema trying to rule it out.
const levelSchema = z.object({
  levelType: z.string().optional(),
  unit: z.string().optional(),
  value: z.number().optional(),
});

const observationSchema = z.object({
  elementId: z.string(),
  value: z.number(),
  unit: z.string().optional(),
  level: levelSchema.optional(),
  timeOffset: z.string().optional(),
  timeResolution: z.string().optional(),
  qualityCode: z.number().optional(),
});

const dataEntrySchema = z.object({
  sourceId: z.string(),
  referenceTime: z.string(),
  observations: z.array(observationSchema),
});

export const frostObservationsResponseSchema = z.object({
  data: z.array(dataEntrySchema),
});

export type FrostObservationsResponse = z.infer<typeof frostObservationsResponseSchema>;
export type FrostObservationEntry = FrostObservationsResponse["data"][number];
export type FrostObservation = FrostObservationEntry["observations"][number];
