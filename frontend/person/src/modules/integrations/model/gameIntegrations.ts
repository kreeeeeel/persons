import type { GameIntegrationRegistration } from '@/modules/integrations/model/GameIntegrationRegistration';
import { OpenDotaIntegration } from '@/modules/integrations/model/OpenDotaIntegration';
import { LeetifyIntegration } from '@/modules/integrations/model/LeetifyIntegration';

export const gameIntegrations: readonly GameIntegrationRegistration[] = [
    new OpenDotaIntegration(),
    new LeetifyIntegration(),
];
