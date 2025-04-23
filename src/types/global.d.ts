declare namespace NodeJS {
    interface ProcessEnv {
      PORT?: string;
      NODE_ENV?: 'development' | 'production';
      MONGODB_URI?: string;
    }
  }