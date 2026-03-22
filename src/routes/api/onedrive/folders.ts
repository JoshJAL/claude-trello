import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";
import { getValidOneDriveToken } from "#/lib/onedrive/token";
import { getFolders } from "#/lib/onedrive/client";

export const Route = createFileRoute("/api/onedrive/folders")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({
          headers: request.headers,
        });
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const url = new URL(request.url);
        const parentId = url.searchParams.get("parentId") || "root";

        let token: string;
        try {
          const t = await getValidOneDriveToken(session.user.id);
          if (!t) {
            return Response.json({ error: "OneDrive not connected" }, { status: 400 });
          }
          token = t;
        } catch (err) {
          return Response.json(
            { error: err instanceof Error ? err.message : "OneDrive token error" },
            { status: 401 },
          );
        }

        try {
          const folders = await getFolders(token, parentId);
          return Response.json(folders);
        } catch (err) {
          return Response.json(
            { error: err instanceof Error ? err.message : "Unknown error" },
            { status: 502 },
          );
        }
      },
    },
  },
});
