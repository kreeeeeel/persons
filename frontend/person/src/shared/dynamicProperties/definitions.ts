import { DynPropertyFactory } from '@persons/dynamic-properties/DynPropertyFactory';
import { siteProperties } from '@persons/person-domain/settings/siteProperties';

export const gamesEnabled = DynPropertyFactory.createBoolean('frontend.person.games.enabled', true)
    .description('Показывать раздел «Игры» на публичном сайте')
    .build();
export const dynamicProperties = [...Object.values(siteProperties), gamesEnabled];
