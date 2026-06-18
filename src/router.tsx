import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import localforage from "localforage";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 1000 * 60 * 60 * 24 * 7, // 1 week cache
        staleTime: 1000 * 60 * 5,
      },
    },
  });

  if (typeof window !== "undefined") {
    const persister = createAsyncStoragePersister({
      storage: localforage,
    });
    persistQueryClient({
      queryClient,
      persister,
    });
  }

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
