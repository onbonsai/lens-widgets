import { useQuery } from "@tanstack/react-query";
import { LensClient } from "@lens-protocol/client";
import { getProfileManagers } from "../services/profileManager";

export default (client: LensClient, profileId?: string | null, contractAddress?: string) => {
  const result = useQuery<boolean>({
    queryKey: ['is-profile-manager', `${profileId}/${contractAddress}`],
    queryFn: async () => {
      if (!profileId) return false;

      const profileManagers = await getProfileManagers(client, profileId);

      for (const manager of profileManagers) {
        if (manager.toLowerCase() === contractAddress?.toLowerCase()) return true;
      }

      return false;
    },
    enabled: !!profileId && !!contractAddress,
  });

  return result;
};