interface AdobeIMS {
  signIn: (params?: object, options?: object) => void;
  authorizeToken: (token: string) => void;
  getAccessToken: () => string | undefined;
  refreshToken: () => void;
  reAuthenticate: (params?: object, mode?: string) => void;
  getReauthAccessToken: () => string | undefined;
  signOut: (params?: object) => void;
  getProfile: () => Promise<any>;
  signUp: () => void;
  validateToken: () => Promise<any>;
  signInWithSocialProvider: (provider: string) => void;
  jumpToken: (params: {
    bearer_token: string;
    target_client_id: string;
  }) => Promise<{ jump: string }>;
}

export interface AdobeIdConfig {
  client_id: string;
  scope: string;
  locale: string;
  environment: string;
  useLocalStorage: boolean;
  autoValidateToken: boolean;
  redirect_uri?: string;
  onAccessToken: (tokenInformation: any) => void;
  onReauthAccessToken: (reauthTokenInformation: any) => void;
  onError: (error: any) => void;
  onAccessTokenHasExpired: () => void;
  onReady: (appState: any) => void;
}

declare global {
  interface Window {
    adobeIMS?: AdobeIMS;
    adobeid?: AdobeIdConfig;
  }
}

export {};
