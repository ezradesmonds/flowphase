import { z } from "zod";
export const sectorSymbol = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{4}(\.JK)?$/)
  .transform((s) => s.replace(/\.JK$/, ""));
export const companiesPageSchema = z.object({
  results: z.array(
    z.object({
      symbol: sectorSymbol,
      company_name: z.string().trim().min(1),
      query_values: z
        .object({
          sector: z.string().nullish(),
          sub_sector: z.string().nullish(),
        })
        .nullish(),
    }),
  ),
  pagination: z.object({
    total_count: z.number().int().nonnegative(),
    offset: z.number().int().nonnegative(),
    has_next: z.boolean(),
    next_offset: z.number().int().nonnegative().nullable(),
  }),
});
export const freeFloatSchema = z.array(
  z.object({
    symbol: sectorSymbol,
    free_float: z.number().finite().min(0).max(1).nullable(),
  }),
);
const amount = z.number().finite().nonnegative();
export const brokerSchema = z.object({
  symbol: sectorSymbol,
  start: z.iso.date(),
  end: z.iso.date(),
  data: z.array(
    z.object({
      date: z.iso.date(),
      summary: z.array(
        z.object({
          broker_code: z.string().min(1),
          blot: amount,
          slot: amount,
          bval: amount.nullish(),
          sval: amount.nullish(),
          bavg_per_share: amount.nullish(),
          savg_per_share: amount.nullish(),
        }),
      ),
    }),
  ),
});
