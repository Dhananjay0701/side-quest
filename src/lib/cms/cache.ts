import { revalidateTag } from "next/cache";
import { EXPLORE_PAGE_CACHE_TAG } from "@/lib/cms/types";

export async function revalidateExplorePage(): Promise<void> {
  revalidateTag(EXPLORE_PAGE_CACHE_TAG);
}
