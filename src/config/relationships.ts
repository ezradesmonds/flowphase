import type {
  Affiliation,
  Entity,
  Relation,
} from "@/lib/intelligence/extended/model";
// Add only officially sourced identities with effective dates. User behavior hypotheses live separately in brokers.ts.
export const BROKER_AFFILIATIONS: Affiliation[] = [];
export const VERIFIED_ENTITIES: Entity[] = [];
export const VERIFIED_RELATIONS: Relation[] = [];
