import "server-only";
import { createSectorsClient } from "./transport";
export { SectorsError } from "./transport";

/** Read credentials only on the server, at request time. */
export async function sectorsFetch(path: string): Promise<unknown> {
  return (await createSectorsClient().request(path)).data;
}
