
export type FeatureFlagMap<Keys extends string> = Record<Keys, boolean>;

export interface FeatureFlagStore<Keys extends string> {
    initialize(): Promise<void>;
    isEnabled(key: Keys): boolean;
}

export function createFeatureFlagStore<Keys extends string>({ flagsOrLoader }: { flagsOrLoader: FeatureFlagMap<Keys> | (() => Promise<FeatureFlagMap<Keys>>) }): FeatureFlagStore<Keys> {
    let flagMap: FeatureFlagMap<Keys>;
    const store: FeatureFlagStore<Keys> = {
        initialize: async () => {
            if (typeof flagsOrLoader === 'function') {
                flagMap = await flagsOrLoader();
            } else {
                flagMap = flagsOrLoader;
            }
        },
        isEnabled: (key) => {
            return flagMap[key] ?? false;
        }
    };

    return store;
}
export type AppFeatureFlags = 'userSignup' | 'usersCanPost';

export type AppFeatureFlagStore = FeatureFlagStore<AppFeatureFlags>;

export function createAppFeatureFlagStore({ flagsOrLoader }: { flagsOrLoader: FeatureFlagMap<AppFeatureFlags> | (() => Promise<FeatureFlagMap<AppFeatureFlags>>) }): AppFeatureFlagStore {
    return createFeatureFlagStore<AppFeatureFlags>({ flagsOrLoader })
}