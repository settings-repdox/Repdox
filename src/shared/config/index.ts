// Shared configuration helpers and feature flag scaffolding.

export interface AppConfig {
  appName: string;
  environment: "development" | "staging" | "production";
}

export const defaultConfig: AppConfig = {
  appName: "Repdox",
  environment: "development",
};
